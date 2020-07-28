import { Edm as Metadata, ServiceDocument, ServiceMetadata } from '@odata/metadata';
import * as ODataParser from '@odata/parser';
import { Token } from '@odata/parser/lib/lexer';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as express from 'express';
import * as http from 'http';
import { Readable, Transform, TransformOptions, Writable } from 'stream';
import { ODataController } from './controller';
import { ContainerBase } from './edm';
import { HttpRequestError } from './error';
import { createMetadataJSON } from './metadata';
import { ensureODataContentType, ensureODataHeaders, withODataHeader, withODataVersionVerify, withRequestId } from './middlewares';
import * as odata from './odata';
// eslint-disable-next-line no-duplicate-imports
import { IODataConnector, ODataBase } from './odata';
import { ODataMetadataType, ODataProcessor, ODataProcessorOptions } from './processor';
import { ODataResult } from './result';

/** HTTP context interface when using the server HTTP request handler */
export interface ODataHttpContext {
  url: string
  method: string
  protocol: 'http' | 'https'
  host: string
  base: string
  request: express.Request & Readable
  response: express.Response & Writable
}


/** ODataServer base class to be extended by concrete OData Server data sources */
export class ODataServerBase extends Transform {
  private static _metadataCache: any
  static namespace: string
  static container = new ContainerBase();
  static parser = ODataParser;
  static connector: IODataConnector
  static validator: (odataQuery: string | Token) => null;
  static errorHandler: express.ErrorRequestHandler = ODataErrorHandler;

  private serverType: typeof ODataServer

  static requestHandler() {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {

        ensureODataHeaders(req, res);
        const processor = this.createProcessor({
          url: req.url,
          method: req.method,
          protocol: req.secure ? 'https' : 'http',
          host: req.headers.host,
          base: req.baseUrl,
          request: req,
          response: res
        }, <ODataProcessorOptions>{
          metadata: res['metadata']
        });

        processor.on('header', (headers) => {
          for (const prop in headers) {
            if (prop.toLowerCase() == 'content-type') {
              ensureODataContentType(req, res, headers[prop]);
            } else {
              res.setHeader(prop, headers[prop]);
            }
          }
        });
        let hasError = false;

        processor.on('data', (chunk, encoding, done) => {
          if (!hasError) {
            res.write(chunk, encoding, done);
          }
        });

        let body = req.body;

        // if chunked upload, will use request stream as body
        if (req.headers['transfer-encoding'] == 'chunked') {
          body = req;
        }

        const origStatus = res.statusCode;

        processor.execute(body).then((result: ODataResult) => {
          try {
            if (result) {
              res.status((origStatus != res.statusCode && res.statusCode) || result.statusCode || 200);
              if (!res.headersSent) {
                ensureODataContentType(req, res, result.contentType || 'text/plain');
              }
              if (typeof result.body != 'undefined') {
                if (typeof result.body != 'object') {
                  res.send(`${result.body}`);
                } else if (!res.headersSent) {
                  res.send(result.body);
                }
              }
            }
            res.end();
          } catch (err) {
            hasError = true;
            next(err);
          }
        }, (err) => {
          hasError = true;
          next(err);
        });
      } catch (err) {
        next(err);
      }
    };
  }

  static execute<T>(url: string, body?: object): Promise<ODataResult<T>>;
  static execute<T>(url: string, method?: string, body?: object): Promise<ODataResult<T>>;
  static execute<T>(context: object, body?: object): Promise<ODataResult<T>>;
  static execute<T>(url: string | object, method?: string | object, body?: object): Promise<ODataResult<T>> {
    let context: any = {};
    if (typeof url == 'object') {
      context = Object.assign(context, url);
      if (typeof method == 'object') {
        body = method;
      }
      url = undefined;
      method = undefined;
    } else if (typeof url == 'string') {
      context.url = url;
      if (typeof method == 'object') {
        body = method;
        method = 'POST';
      }
      context.method = method || 'GET';
    }
    context.method = context.method || 'GET';
    context.request = context.request || body;
    const processor = this.createProcessor(context, <ODataProcessorOptions>{
      objectMode: true,
      metadata: context.metadata || ODataMetadataType.minimal
    });
    const values = [];
    let flushObject;
    let response = '';
    if (context.response instanceof Writable) {
      processor.pipe(context.response);
    }
    processor.on('data', (chunk: any) => {
      if (!(typeof chunk == 'string' || chunk instanceof Buffer)) {
        if (chunk['@odata.context'] && chunk.value && Array.isArray(chunk.value) && chunk.value.length == 0) {
          flushObject = chunk;
          flushObject.value = values;
        } else {
          values.push(chunk);
        }
      } else {
        response += chunk.toString();
      }
    });
    return processor.execute(context.body || body).then((result: ODataResult<T>) => {
      if (flushObject) {
        result.body = flushObject;
        if (!result.elementType || typeof result.elementType == 'object') {
          result.elementType = flushObject.elementType;
        }
        delete flushObject.elementType;
        result.contentType = result.contentType || 'application/json';
      } else if (result && response) {
        result.body = <any>response;
      }
      return result;
    });
  }

  constructor(opts?: TransformOptions) {
    super(Object.assign(<TransformOptions>{
      objectMode: true
    }, opts));
    this.serverType = Object.getPrototypeOf(this).constructor;
  }

  _transform(chunk: any, _?: string, done?: Function) {
    if ((chunk instanceof Buffer) || typeof chunk == 'string') {
      try {
        chunk = JSON.parse(chunk.toString());
      } catch (err) {
        return done(err);
      }
    }
    this.serverType.execute(chunk).then((result) => {
      this.push(result);
      if (typeof done == 'function') {
        done();
      }
    }, <any>done);
  }

  _flush(done?: Function) {
    if (typeof done == 'function') {
      done();
    }
  }

  static createProcessor(context: any, options?: ODataProcessorOptions) {
    return new ODataProcessor(context, this, options);
  }

  static $metadata(): ServiceMetadata;
  static $metadata(metadata: Metadata.Edmx | any);
  static $metadata(metadata?): ServiceMetadata {
    if (metadata) {
      if (!(metadata instanceof Metadata.Edmx)) {
        if (metadata.version && metadata.dataServices && Array.isArray(metadata.dataServices.schema)) {
          this._metadataCache = ServiceMetadata.processMetadataJson(metadata);
        } else {
          this._metadataCache = ServiceMetadata.defineEntities(metadata);
        }
      }
    }
    return this._metadataCache || (this._metadataCache = ServiceMetadata.processMetadataJson(createMetadataJSON(this)));
  }

  static document(): ServiceDocument {
    return ServiceDocument.processEdmx(this.$metadata().edmx);
  }

  static addController(controller: typeof ODataController, isPublic?: boolean);
  static addController(controller: typeof ODataController, isPublic?: boolean, elementType?: Function);
  static addController(controller: typeof ODataController, entitySetName?: string, elementType?: Function);
  static addController(controller: typeof ODataController, entitySetName?: string | boolean, elementType?: Function) {
    odata.controller(controller, <string>entitySetName, elementType)(this);
  }
  static getController(elementType: Function) {
    for (const i in this.prototype) {
      if (this.prototype[i] &&
        this.prototype[i].prototype &&
        this.prototype[i].prototype instanceof ODataController &&
        this.prototype[i].prototype.elementType == elementType) {
        return this.prototype[i];
      }
    }
    return null;
  }

  static create(): express.Router;
  static create(port: number): http.Server;
  static create(path: string, port: number): http.Server;
  static create(port: number, hostname: string): http.Server;
  static create(path?: string | RegExp | number, port?: number | string, hostname?: string): http.Server;
  static create(path?: string | RegExp | number, port?: number | string, hostname?: string): http.Server | express.Router {
    const server = this;
    const router = express.Router();

    router.use(withODataVersionVerify);

    router.use(bodyParser.json());

    if ((<any>server).cors) {
      router.use(cors());
    }

    router.use(withRequestId);

    router.use(withODataHeader);

    router.get('/', ensureODataHeaders, (req, _, next) => {
      if (typeof req.query == 'object' && Object.keys(req.query).length > 0) {
        return next(new HttpRequestError(500, 'Unsupported query'));
      }
      next();
    }, server.document().requestHandler());

    router.get('/\\$metadata', server.$metadata().requestHandler());

    router.use(server.requestHandler());
    router.use(server.errorHandler);

    if (typeof path == 'number') {
      if (typeof port == 'string') {
        hostname = `${port}`;
      }
      port = parseInt(<any>path, 10);
      path = undefined;
    }
    if (typeof port == 'number') {
      const app = express();
      app.use((<any>path) || '/', router);
      return app.listen(port, <any>hostname);
    }
    return router;
  }
}

export class ODataServer extends ODataBase<ODataServerBase, typeof ODataServerBase>(ODataServerBase) { }

/** ?????????? */
/** Create Express middleware for OData error handling */
export function ODataErrorHandler(err, _, res, next) {
  if (err) {
    if (res.headersSent) {
      return next(err);
    }
    const statusCode = err.statusCode || err.status || (res.statusCode < 400 ? 500 : res.statusCode);
    if (!res.statusCode || res.statusCode < 400) {
      res.status(statusCode);
    }
    res.send({
      error: {
        code: statusCode,
        message: err.message
        // logger
        // stack: process.env.ODATA_V4_DISABLE_STACKTRACE ? undefined : err.stack
      }
    });
  } else {
    next();
  }
}

/** Create Express server for OData Server
 * @param server OData Server instance
 * @return       Express Router object
 */
export function createODataServer(server: typeof ODataServer): express.Router;

/** Create Express server for OData Server
 * @param server OData Server instance
 * @param port   port number for Express to listen to
 */
export function createODataServer(server: typeof ODataServer, port: number): http.Server;

/** Create Express server for OData Server
 * @param server OData Server instance
 * @param path   routing path for Express
 * @param port   port number for Express to listen to
 */
export function createODataServer(server: typeof ODataServer, path: string, port: number): http.Server;

/** Create Express server for OData Server
 * @param server   OData Server instance
 * @param port     port number for Express to listen to
 * @param hostname hostname for Express
 */
export function createODataServer(server: typeof ODataServer, port: number, hostname: string): http.Server;

/** Create Express server for OData Server
 * @param server   OData Server instance
 * @param path     routing path for Express
 * @param port     port number for Express to listen to
 * @param hostname hostname for Express
 * @return         Express Router object
 */
export function createODataServer(server: typeof ODataServer, path?: string | RegExp | number, port?: number | string, hostname?: string): http.Server | express.Router {
  return server.create(path, port, hostname);
}
