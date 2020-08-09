import { flatten } from '@newdash/newdash/flatten';
import { groupBy } from '@newdash/newdash/groupBy';
import { map } from '@newdash/newdash/map';
import { ServiceMetadata } from '@odata/metadata';
import { JsonBatchBundle, JsonBatchRequest } from '@odata/parser';
import { NextFunction, Request, Response } from 'express';
import { convert, parse } from 'odata2openapi';
import { dirname } from 'path';
import { isArray } from 'util';
import { ODataHttpContext, ODataServer } from '.';
import { HttpRequestError, UnsupportedMediaTypeError } from './error';
import { createLogger } from './logger';
import { ODataMetadataType, ODataProcessorOptions } from './processor';
import { commitTransaction, createTransactionContext, rollbackTransaction } from './typeorm/transaction';

const logger = createLogger('middlewares');

/**
 * with request id in `res.locals[tx_ctx]`
 *
 * @param req request object
 */
export function withTransactionContext(req: Request) {
  req.res.locals['tx_ctx'] = createTransactionContext();
  req.next();
}

/**
 *
 * with (and verify 'Accept') odata header
 *
 * @param req
 * @param res
 * @param next
 */
export function withODataHeader(req: Request, res: Response, next: NextFunction) {
  res.setHeader('OData-Version', '4.0');
  if (req.headers.accept &&
    req.headers.accept.indexOf('application/json') < 0 &&
    req.headers.accept.indexOf('text/html') < 0 &&
    req.headers.accept.indexOf('*/*') < 0 &&
    req.headers.accept.indexOf('xml') < 0) {
    next(new UnsupportedMediaTypeError());
  } else {
    next();
  }
}

/**
 * validation odata version
 *
 * @param req
 */
export function withODataVersionVerify(req: Request) {
  req.url = req.url.replace(/[\/]+/g, '/').replace(':/', '://');
  if (req.headers['odata-maxversion'] && req.headers['odata-maxversion'] < '4.0') {
    return req.next(new HttpRequestError(500, 'Only OData version 4.0 supported'));
  }
  req.next();
}


export function ensureODataMetadataType(req: Request, res: Response) {
  let metadata: ODataMetadataType = ODataMetadataType.minimal;
  if (req.headers && req.headers.accept && req.headers.accept.indexOf('odata.metadata=') >= 0) {
    if (req.headers.accept.indexOf('odata.metadata=full') >= 0) {
      metadata = ODataMetadataType.full;
    } else if (req.headers.accept.indexOf('odata.metadata=none') >= 0) {
      metadata = ODataMetadataType.none;
    }
  }

  res['metadata'] = metadata;
}

export function ensureODataContentType(req: Request, res: Response, contentType?: string) {
  contentType = contentType || 'application/json';
  if (contentType.indexOf('odata.metadata=') < 0) {
    contentType += `;odata.metadata=${ODataMetadataType[res['metadata']]}`;
  }
  if (contentType.indexOf('odata.streaming=') < 0) {
    contentType += ';odata.streaming=true';
  }
  if (contentType.indexOf('IEEE754Compatible=') < 0) {
    contentType += ';IEEE754Compatible=false';
  }
  if (req.headers.accept && req.headers.accept.indexOf('charset') > 0) {
    contentType += `;charset=${res.locals['charset']}`;
  }
  res.contentType(contentType);
}

export function ensureODataHeaders(req: Request, res: Response, next?: NextFunction) {
  res.setHeader('OData-Version', '4.0');

  ensureODataMetadataType(req, res);

  let charset = req.headers['accept-charset'] || 'utf-8';
  if (isArray(charset)) {
    charset = charset[0];
  }
  res.locals['charset'] = charset;

  ensureODataContentType(req, res);

  if ((req.headers.accept && req.headers.accept.indexOf('charset') < 0) || req.headers['accept-charset']) {
    const bufferEncoding = {
      'utf-8': 'utf8',
      'utf-16': 'utf16le'
    };
    const origsend = res.send;
    res.send = <any>((data) => {
      if (typeof data == 'object') {
        data = JSON.stringify(data);
      }
      origsend.call(res, Buffer.from(data, bufferEncoding[charset as string]));
    });
  }

  if (typeof next == 'function') {
    next();
  }
}

export function withSwaggerDocument(sm: ServiceMetadata) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {

      const metadata = sm.document('xml');
      const service = await parse(metadata);

      const swaggerDoc = convert(service.entitySets, {
        host: `${req.get('host')}`,
        basePath: `${dirname(req.baseUrl)}`
      }, service.version);

      req['swaggerDoc'] = swaggerDoc;
      // res.json(swaggerDoc);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * create $batch requests handler
 *
 * @param server
 */
export function withODataBatchRequestHandler(server: typeof ODataServer) {
  const logger = createLogger('request:batch');
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body: JsonBatchBundle = req.body;
      // TO DO validation here
      const groups: Record<string, JsonBatchRequest[]> = groupBy(body.requests, (bRequest) => bRequest.atomicityGroup || 'default');

      const collectedResults = await Promise.all(map(groups, async (groupRequests, groupName) => {
        // each atom group will run in SINGLE transaction
        const groupResults = [];
        const txContext = createTransactionContext();

        // if any item process failed, this value will be true
        let anyThingWrong = false;

        for (let idx = 0; idx < groupRequests.length; idx++) {
          const batchRequest = groupRequests[idx];

          try {

            const ctx: ODataHttpContext = {
              url: batchRequest.url,
              method: batchRequest.method,
              protocol: req.secure ? 'https' : 'http',
              host: req.headers.host,
              base: req.baseUrl,
              request: req,
              response: res,
              tx: txContext
            };

            const processor = server.createProcessor(ctx, { metadata: res['metadata'] });

            const result = await processor.execute(batchRequest.body);

            groupResults.push({
              id: batchRequest.id,
              status: result.statusCode || 200,
              body: result.body
            });

          } catch (err) {

            anyThingWrong = true;
            const statusCode = err.statusCode || 500;
            groupResults.push({
              id: batchRequest.id,
              status: statusCode,
              body: {
                error: {
                  code: statusCode,
                  message: err.message
                }
              }
            });

          }
        }

        if (anyThingWrong) {
          await rollbackTransaction(txContext);
        } else {
          await commitTransaction(txContext);
        }

        return groupResults;

      }));

      res.json({
        responses: flatten(collectedResults)
      });

    } catch (error) {
      next(error);
    }
  };
}

/**
 * create simple simple request handler
 *
 * @param server
 */
export function withODataRequestHandler(server: typeof ODataServer) {

  const logger = createLogger('request:simple');

  return async (req: Request, res: Response, next: NextFunction) => {

    // new transaction for request
    const txContext = createTransactionContext();

    const ctx: ODataHttpContext = {
      url: req.url,
      method: req.method,
      protocol: req.secure ? 'https' : 'http',
      host: req.headers.host,
      base: req.baseUrl,
      request: req,
      response: res,
      tx: txContext
    };

    let hasError = false;

    try {

      ensureODataHeaders(req, res);

      const processor = server.createProcessor(ctx, <ODataProcessorOptions>{
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

      processor.on('data', (chunk, encoding, done) => {
        if (!hasError) { res.write(chunk, encoding, done); }
      });

      let body = req.body;

      // if chunked upload, will use request stream as body
      if (req.headers['transfer-encoding'] == 'chunked') {
        body = req;
      }

      const origStatus = res.statusCode;

      const result = await processor.execute(body);

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

      await commitTransaction(txContext);
      res.end();

    } catch (err) {

      await rollbackTransaction(txContext);
      hasError = true;
      next(err);

    }
  };
};


/** Create Express middleware for OData error handling */
export function withODataErrorHandler(err, _, res, next) {
  if (err) {
    if (res.headersSent) {
      return next(err);
    }
    const statusCode = err.statusCode || err.status || (res.statusCode < 400 ? 500 : res.statusCode);
    if (!res.statusCode || res.statusCode < 400) {
      res.status(statusCode);
    }

    logger(err.stack);

    res.send({
      error: {
        code: statusCode,
        message: err.message
        // stack: process.env.ODATA_V4_ENABLE_STACKTRACE ? undefined : err.stack
      }
    });
  } else {
    next();
  }
}
