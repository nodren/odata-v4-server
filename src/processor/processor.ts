// @ts-nocheck
import { inject, InjectContainer } from '@newdash/inject';
import { get } from '@newdash/newdash/get';
import { isEmpty } from '@newdash/newdash/isEmpty';
import { isUndefined } from '@newdash/newdash/isUndefined';
import { ODataFilter } from '@odata/parser';
import { Token, TokenType } from '@odata/parser/lib/lexer';
import { findOne } from '@odata/parser/lib/utils';
import * as deepmerge from 'deepmerge';
import * as qs from 'qs';
import { Readable, Transform, TransformOptions } from 'stream';
import * as url from 'url';
import * as util from 'util';
import { InjectKey, ServerType } from '../constants';
import { ODataController, ODataControllerBase } from '../controller';
import * as Edm from '../edm';
import { MethodNotAllowedError, NotImplementedError, ResourceNotFoundError, ServerInternalError } from '../error';
import { IODataResult } from '../index';
import { createLogger } from '../logger';
import * as odata from '../odata';
import { ODataResult } from '../result';
import { ODataHttpContext, ODataServer } from '../server';
import { getODataNavigation } from '../type';
import { isIterator, isPromise, isStream } from '../utils';
import { NavigationPart, ODATA_TYPE, ResourcePathVisitor } from '../visitor';
import { fnCaller } from './fnCaller';
import { getODataRoot } from './getODataRoot';


const logger = createLogger('processor');


const createODataContext = function (context: ODataHttpContext, entitySets, server: typeof ODataServer, resourcePath, processor) {
  const odataContextBase = `${getODataRoot(context)}/$metadata#`;
  let odataContext = '';
  let prevResource = null;
  let prevType: any = server;
  let selectContext = '';
  if (processor.query && processor.query.$select) {
    selectContext = `(${processor.query.$select})`;
  }
  resourcePath.navigation.forEach((baseResource, i): string | void => {
    const next = resourcePath.navigation[i + 1];
    const selectContextPart = (i == resourcePath.navigation.length - 1) ? selectContext : '';
    if (next && next.type == TokenType.RefExpression) {
      return;
    }
    if (baseResource.type == TokenType.QualifiedEntityTypeName || baseResource.type == TokenType.QualifiedComplexTypeName) {
      return odataContext += `/${baseResource.name}`;
    }
    if (baseResource.type == TokenType.EntitySetName) {
      prevResource = baseResource;
      prevType = baseResource.key ? entitySets[baseResource.name].prototype.elementType : entitySets[baseResource.name];
      odataContext += baseResource.name;
      odataContext += selectContextPart;
      if (baseResource.key && resourcePath.navigation.indexOf(baseResource) == resourcePath.navigation.length - 1) {
        return odataContext += '/$entity';
      }
      if (baseResource.key) {
        if (baseResource.key.length > 1) {
          return odataContext += `(${baseResource.key.map((key) => `${key.name}=${decodeURIComponent(key.raw)}`).join(',')})`;
        }
        return odataContext += `(${decodeURIComponent(baseResource.key[0].raw)})`;
      }
    } else if (getResourcePartFunction(baseResource.type) && !(baseResource.name in expCalls)) {
      odataContext = '';
      if (prevResource) {
        const target = prevType || entitySets[prevResource.name];
        if (!target) {
          return;
        }
        const propertyKey = baseResource.name.split('.').pop();
        let returnType = Edm.getReturnType(target, propertyKey, server.container);
        const returnTypeName = Edm.getReturnTypeName(target, propertyKey, server.container);
        if (typeof returnType == 'function') {
          prevType = returnType;
          const ctrl = server.getController(returnType);
          let entitySet = null;
          for (const prop in entitySets) {
            if (entitySets[prop] == ctrl) {
              entitySet = prop;
              break;
            }
          }
          returnType = entitySet ? entitySet + (returnTypeName.indexOf('Collection') == 0 ? selectContextPart : `${selectContextPart}/$entity`) : returnTypeName;
        } else {
          returnType = returnTypeName;
        }
        return odataContext += returnType;
      }
      const call = baseResource.name;
      let returnType = Edm.getReturnType(server, call, server.container);
      const returnTypeName = Edm.getReturnTypeName(server, call, server.container);
      if (typeof returnType == 'function') {
        prevType = returnType;
        const ctrl = server.getController(returnType);
        let entitySet = null;
        for (const prop in entitySets) {
          if (entitySets[prop] == ctrl) {
            entitySet = prop;
            break;
          }
        }
        returnType = entitySet ? entitySet + (returnTypeName.indexOf('Collection') == 0 ? selectContextPart : `${selectContextPart}/$entity`) : returnTypeName;
      } else {
        returnType = returnTypeName;
      }
      return odataContext += returnType;
    }
    if (baseResource.type == TokenType.EntityCollectionNavigationProperty) {
      prevResource = baseResource;
      odataContext += `/${baseResource.name}`;
      prevType = baseResource.key ? Edm.getType(prevType, baseResource.name, server.container) : server.getController(<Function>Edm.getType(prevType, baseResource.name, server.container));
      const ctrl = server.getController(prevType);
      let entitySet = null;
      for (const prop in entitySets) {
        if (entitySets[prop] == ctrl) {
          entitySet = prop;
          break;
        }
      }
      if (entitySet) {
        odataContext = entitySet;
      }
      odataContext += selectContextPart;
      if (baseResource.key && resourcePath.navigation.indexOf(baseResource) == resourcePath.navigation.length - 1) {
        return odataContext += '/$entity';
      }
      if (baseResource.key) {
        if (baseResource.key.length > 1) {
          return odataContext += `(${baseResource.key.map((key) => `${key.name}=${decodeURIComponent(key.raw)}`).join(',')})`;
        }
        return odataContext += `(${decodeURIComponent(baseResource.key[0].raw)})`;
      }
      return odataContext;
    }
    if (baseResource.type == TokenType.EntityNavigationProperty) {
      prevResource = baseResource;
      prevType = Edm.getType(prevType, baseResource.name, server.container);
      const ctrl = server.getController(prevType);
      let entitySet = null;
      for (const prop in entitySets) {
        if (entitySets[prop] == ctrl) {
          entitySet = prop;
          break;
        }
      }
      return entitySet ? odataContext = `${entitySet + selectContextPart}/$entity` : odataContext += `/${baseResource.name}`;
    }
    if (baseResource.type == TokenType.PrimitiveProperty ||
      baseResource.type == TokenType.PrimitiveCollectionProperty ||
      baseResource.type == TokenType.ComplexProperty ||
      baseResource.type == TokenType.ComplexCollectionProperty) {
      prevType = Edm.getType(prevType, baseResource.name, server.container);
      return odataContext += `/${baseResource.name}`;
    }
  });
  return odataContextBase + odataContext;
};


export const ODataRequestMethods: string[] = [
  'get',
  'post',
  'put',
  'patch',
  'delete'
];

const ODataRequestResult: any = {
  get: ODataResult.Ok,
  post: ODataResult.Created,
  put: (result, contentType) => (result ? ODataResult.Created : ODataResult.NoContent)(result, contentType),
  patch: ODataResult.NoContent,
  delete: ODataResult.NoContent
};

const expCalls = {
  $count(this: ODataResult) {
    return this.body && this.body.value ? (this.body.value.length || 0) : 0;
  },
  async $value(this: ODataResult, processor: ODataProcessor) {
    try {
      const prevPart = processor.resourcePath.navigation[processor.resourcePath.navigation.length - 2];

      let fn = odata.findODataMethod(processor.ctrl, `${processor.method}/${prevPart.name}/$value`, prevPart.key || []);
      if (!fn && typeof this.elementType == 'function' && Edm.isMediaEntity(this.elementType)) {
        fn = odata.findODataMethod(processor.ctrl, `${processor.method}/$value`, prevPart.key || []);
      }
      if (fn) {
        const ctrl = processor.ctrl;
        const params = {};
        if (prevPart.key) {
          prevPart.key.forEach((key) => params[key.name] = key.value);
        }

        const fnDesc = fn;
        await processor.__applyParams(ctrl, fnDesc.call, params, processor.url.query, this);

        fn = ctrl.prototype[fnDesc.call];
        if (fnDesc.key.length == 1 && prevPart.key.length == 1 && fnDesc.key[0].to != prevPart.key[0].name) {
          params[fnDesc.key[0].to] = params[prevPart.key[0].name];
          delete params[prevPart.key[0].name];
        } else {
          for (let i = 0; i < fnDesc.key.length; i++) {
            if (fnDesc.key[i].to != fnDesc.key[i].from) {
              params[fnDesc.key[i].to] = params[fnDesc.key[i].from];
              delete params[fnDesc.key[i].from];
            }
          }
        }

        let currentResult = fnCaller(ctrl, fn, params);

        if (isIterator(fn)) {
          currentResult = run(currentResult, defaultHandlers);
        }

        if (!isPromise(currentResult)) {
          currentResult = Promise.resolve(currentResult);
        }

        if (prevPart.type == 'PrimitiveProperty' || prevPart.type == 'PrimitiveKeyProperty') {
          return currentResult.then((value) => value.toString());
        }
        return currentResult;
      }
      if (this.stream) {
        return Promise.resolve(this.stream);
      }
      if (this.body) {
        let result = this.body.value || this.body;
        for (const prop in result) {
          if (prop.indexOf('@odata') >= 0) {
            delete result[prop];
          }
        }

        result = (<IODataResult>result).value || result;
        if (typeof result == 'object' && (prevPart.type == 'PrimitiveProperty' || prevPart.type == 'PrimitiveKeyProperty')) {
          return Promise.resolve(result.toString());
        }
        return Promise.resolve(result);
      }
    } catch (err) {
      return Promise.reject(err);
    }
  },
  async $ref(this: any, processor) {
    try {
      const prevPart = processor.resourcePath.navigation[processor.resourcePath.navigation.length - 2];
      const routePart = processor.resourcePath.navigation[processor.resourcePath.navigation.length - 3];

      let fn = odata.findODataMethod(processor.prevCtrl, `${processor.method}/${prevPart.name}/$ref`, routePart.key || []);
      if (processor.method == 'get') {
        return {
          '@odata.context': `${getODataRoot(processor.context)}/$metadata#$ref`,
          '@odata.id': `${this.body['@odata.id']}/${prevPart.name}`
        };
      }
      if (!fn) {
        throw new ResourceNotFoundError();
      }

      let linkUrl = (processor.resourcePath.id || (processor.body || {})['@odata.id'] || '').replace(getODataRoot(processor.context), '');
      let linkAst,
        linkPath,
        linkPart;
      if (linkUrl) {
        linkUrl = decodeURIComponent(linkUrl);
        processor.emit('header', { 'OData-EntityId': linkUrl });
        linkAst = processor.serverType.parser.odataUri(linkUrl, {
          metadata: processor.serverType.$metadata().edmx
        });
        linkPath = await new ResourcePathVisitor(processor.serverType, processor.entitySets).Visit(linkAst);
        linkPart = linkPath.navigation[linkPath.navigation.length - 1];
      } else {
        linkPart = prevPart;
      }

      const ctrl = processor.prevCtrl;
      const params = {};
      if (routePart.key) {
        routePart.key.forEach((key) => params[key.name] = key.value);
      }

      const fnDesc = fn;
      await processor.__applyParams(ctrl, fnDesc.call, params, processor.url.query, this);

      fn = ctrl.prototype[fnDesc.call];
      if (fnDesc.key.length == 1 && routePart.key.length == 1 && fnDesc.key[0].to != routePart.key[0].name) {
        params[fnDesc.key[0].to] = params[routePart.key[0].name];
        delete params[routePart.key[0].name];
      } else {
        for (let i = 0; i < fnDesc.key.length; i++) {
          if (fnDesc.key[i].to != fnDesc.key[i].from) {
            params[fnDesc.key[i].to] = params[fnDesc.key[i].from];
            delete params[fnDesc.key[i].from];
          }
        }
      }

      const linkParams = {};
      if (linkPart.key) {
        linkPart.key.forEach((key) => linkParams[key.name] = key.value);
      }

      if (fnDesc.link.length == 1 && linkPart.key.length == 1 && fnDesc.link[0].to != linkPart.key[0].name) {
        params[fnDesc.link[0].to] = linkParams[linkPart.key[0].name];
      } else {
        for (let i = 0; i < fnDesc.link.length; i++) {
          params[fnDesc.link[i].to] = linkParams[fnDesc.link[i].from];
        }
      }

      let currentResult = fnCaller(ctrl, fn, params);

      if (isIterator(fn)) {
        currentResult = run(currentResult, defaultHandlers);
      }

      if (!isPromise(currentResult)) {
        currentResult = Promise.resolve(currentResult);
      }

      return currentResult;
    } catch (err) {
      return Promise.reject(err);
    }
  }
};

const getResourcePartFunction = (type) => {
  switch (type) {
    case 'PrimitiveFunctionImportCall':
    case 'PrimitiveCollectionFunctionImportCall':
    case 'ComplexFunctionImportCall':
    case 'ComplexCollectionFunctionImportCall':
    case 'EntityFunctionImportCall':
    case 'EntityCollectionFunctionImportCall':
    case 'ActionImportCall':
    case 'ActionImport':
      return '__actionOrFunctionImport';
    case 'BoundPrimitiveFunctionCall':
    case 'BoundPrimitiveCollectionFunctionCall':
    case 'BoundComplexFunctionCall':
    case 'BoundComplexCollectionFunctionCall':
    case 'BoundEntityFunctionCall':
    case 'BoundEntityCollectionFunctionCall':
    case 'BoundActionCall':
    case 'BoundAction':
    case 'CountExpression':
    case 'ValueExpression':
    case 'RefExpression':
      return '__actionOrFunction';
    default:
      return null;
  }
};

const jsPrimitiveTypes = [
  Object,
  String,
  Boolean,
  Number,
  Date
];

const writeMethods = [
  'delete',
  'post',
  'put',
  'patch'
];

export type GeneratorAction = (value?) => any;
export type PromiseGeneratorHandler = Promise<any> | void;

export namespace ODataGeneratorHandlers {

  export function PromiseHandler(request: any, next: GeneratorAction): PromiseGeneratorHandler {
    if (isPromise(request)) {
      return request.then(next);
    }
  }

  export function StreamHandler(request: any, next: GeneratorAction): PromiseGeneratorHandler {
    if (isStream(request)) {
      return new Promise((resolve, reject) => {
        request.on('end', resolve);
        request.on('error', reject);
      }).then(next);
    }
  }

  export function GeneratorHandler(request: any, next: GeneratorAction): PromiseGeneratorHandler {
    if (isIterator(request)) {
      return run(request(), defaultHandlers).then(next);
    }
  }
}

const defaultHandlers = [
  ODataGeneratorHandlers.GeneratorHandler,
  ODataGeneratorHandlers.PromiseHandler,
  ODataGeneratorHandlers.StreamHandler
];

function run(iterator, handlers) {
  function id(x) {
    return x;
  }
  function iterate(value?) {
    const next = iterator.next(value);
    const request = next.value;
    const nextAction = next.done ? id : iterate;

    for (const handler of handlers) {
      const action = handler(request, nextAction);
      if (typeof action != 'undefined') {
        return action;
      }
    }
    return nextAction(request);
  }
  return iterate();
}

class ODataStreamWrapper extends Transform {
  buffer: any[];

  constructor() {
    super(<TransformOptions>{
      objectMode: true
    });
    this.buffer = [];
  }

  _transform(chunk: any, _: string, done: Function) {
    this.buffer.push(chunk);
    if (typeof done == 'function') {
      done();
    }
  }

  _flush(done?: Function) {
    if (typeof done == 'function') {
      done();
    }
  }

  toPromise(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.on('finish', () => {
        resolve(this.buffer);
      });
      this.on('error', reject);
    });
  }
}

class StreamWrapper {
  stream: any
  constructor(value) {
    this.stream = value;
  }
}

export enum ODataMetadataType {
  minimal,
  full,
  none
}

export interface ODataProcessorOptions {
  disableEntityConversion?: boolean
  metadata?: ODataMetadataType
  objectMode?: boolean
}

export class ODataProcessor extends Transform {
  private serverType: typeof ODataServer
  private options: ODataProcessorOptions
  private ctrl: typeof ODataController
  private prevCtrl: typeof ODataController
  private instance: ODataController
  private resourcePath: ResourcePathVisitor
  private workflow: any[]
  private context: ODataHttpContext
  private method: string
  private url: any
  private query: any
  private entitySets: {
    [entitySet: string]: typeof ODataController
  }
  private odataContext: string
  private body: any
  private streamStart = false;
  private streamEnabled = false;
  private streamObject = false;
  private streamEnd = false;
  private streamInlineCount: number;
  private elementType: any;
  private resultCount = 0;

  private container: InjectContainer;


  constructor(
    @inject(InjectKey.RequestContext) context: ODataHttpContext,
    @inject(InjectKey.ServerType) server: typeof ODataServer,
    @inject(InjectKey.ProcessorOption) options?: ODataProcessorOptions,
    @inject(InjectContainer) ic?: InjectContainer
  ) {
    super(<TransformOptions>{
      objectMode: true
    });

    this.context = context;
    this.serverType = server;
    this.options = options || <ODataProcessorOptions>{};

    const method = this.method = context.method.toLowerCase();

    if (!ODataRequestMethods.includes(method)) {
      throw new MethodNotAllowedError();
    }

    context.url = decodeURIComponent(context.url);
    this.url = url.parse(context.url);
    this.query = qs.parse(this.url.query);
    let ast;
    try {
      ast = this.serverType.parser.odataUri(context.url, {
        metadata: this.serverType.$metadata().edmx
      });
    } catch (error) {
      logger(`parsing uri: %s failed.`, context.url);
      throw error;
    }

    if (this.serverType.validator) {
      this.serverType.validator(ast);
    }
    const entitySets = this.entitySets = odata.getPublicControllers(this.serverType);

    this.workflow = [
      async (body: any) => {
        const resourcePath = this.resourcePath = await new ResourcePathVisitor(this.serverType, this.entitySets).Visit(ast);
        this.odataContext = createODataContext(context, entitySets, server, resourcePath, this);

        if (resourcePath.navigation.length == 0) {
          throw new ResourceNotFoundError();
        }

        this.workflow.push(...resourcePath.navigation.map((part, i) => {

          const next = resourcePath.navigation[i + 1];
          if (next && next.type == TokenType.RefExpression) {
            return null;
          }
          const fn = getResourcePartFunction(part.type) || (`__${part.type}`);

          switch (fn) {
            case '__actionOrFunction':
              return this.__actionOrFunction.call(this, part);
            case '__actionOrFunctionImport':
              return this.__actionOrFunctionImport.call(this, part);
            case '__QualifiedEntityTypeName':
            case '__QualifiedComplexTypeName':
              return this.__qualifiedTypeName.call(this, part);
            case '__PrimitiveKeyProperty':
            case '__PrimitiveCollectionProperty':
            case '__ComplexProperty':
            case '__ComplexCollectionProperty':
            case '__PrimitiveProperty':
              return this.__PrimitiveProperty.call(this, part);

            // read entity
            case '__EntitySetName':
              return this.__EntitySetName.call(this, part);
            case '__EntityCollectionNavigationProperty':
              return this.__EntityCollectionNavigationProperty.call(this, part);
            case '__EntityNavigationProperty':
              return this.__EntityNavigationProperty.call(this, part);
            default:
              return null;
          }
        }).filter((it) => !!it));

        this.workflow.push((result) => {
          if (result && result.statusCode && result.statusCode == 201) {
            if (result.body['@odata.id']) {
              this.emit('header', { 'Location': result.body['@odata.id'] });
            } else {
              this.emit('error', new ServerInternalError('instance created, but service logic not return the created instance id'));
            }

          }
          return Promise.resolve(result);
        });

        return body;
      }
    ];

    this._initInjectContainer(ic);

  }

  private _initInjectContainer(ic: InjectContainer) {

    if (this.container == undefined) {
      this.container = ic;
      this.container.registerInstance(InjectKey.ODataTxContextParameter, this.context?.tx);
      this.container.registerInstance(InjectKey.RequestBody, this.context?.request?.body);
      this.container.registerInstance(InjectKey.ODataInjectContainer, ic);
      this.container.registerInstance(InjectKey.RequestMethod, this.context?.request?.method);
      this.container.registerInstance(InjectKey.RequestEntityType, this.elementType);
      this.container.registerInstance(InjectKey.RequestTxId, this.context?.tx?.uuid);
      this.container.registerInstance(InjectKey.Request, this.context?.response);
      this.container.registerInstance(InjectKey.Response, this.context?.request);
    }

  }

  _transform(chunk: any, _: string, done: Function) {
    if (this.streamEnabled) {
      if (!(chunk instanceof Buffer)) {
        this.streamObject = true;
        if (!this.streamStart) {
          if (!this.options.objectMode) {
            this.push('{');
            if (this.options.metadata != ODataMetadataType.none) {
              this.push(`"@odata.context":"${this.odataContext}",`);
            }
            this.push('"value":[');
          }
        } else if (!this.options.objectMode && this.resultCount > 0) {
          this.push(',');
        }
        try {
          this.streamStart = true;
          if (chunk instanceof Object) {
            if (chunk['@odata.count'] || chunk.inlinecount) {
              this.streamInlineCount = chunk['@odata.count'] || chunk.inlinecount;
              if (Object.keys(chunk).length == 1) {
                return typeof done == 'function' ? done() : null;
              }
              delete chunk['@odata.count'];
              delete chunk.inlinecount;
            }
            const entity = {};
            let defer;
            if (this.ctrl) {
              defer = this.__appendLinks(this.ctrl, this.elementType || this.ctrl.prototype.elementType, entity, chunk);
            }
            const deferConvert = this.__convertEntity(entity, chunk, this.elementType || this.ctrl.prototype.elementType, this.resourcePath.includes, this.resourcePath.select);
            defer = defer ? defer.then((_) => deferConvert) : deferConvert;
            defer.then(() => {
              chunk = this.options.objectMode ? entity : JSON.stringify(entity);
              this.push(chunk);
              this.resultCount++;
              if (typeof done == 'function') {
                done();
              }
            }, (err) => {
              console.log(err);
              if (typeof done == 'function') {
                done(err);
              }
            });
          } else {
            this.push(JSON.stringify(chunk));
            this.resultCount++;
            if (typeof done == 'function') {
              done();
            }
          }
        } catch (err) {
          console.log(err);
          if (typeof done == 'function') {
            done(err);
          }
        }
      } else {
        this.streamStart = true;
        this.push(chunk);
        this.resultCount++;
        if (typeof done == 'function') {
          done();
        }
      }
    } else {
      this.resultCount++;
      if (typeof done == 'function') {
        done();
      }
    }
  }

  _flush(done?: Function) {
    if (this.streamEnabled && this.streamObject) {
      if (this.options.objectMode) {
        const flushObject: any = {
          value: [],
          elementType: this.elementType || this.ctrl.prototype.elementType
        };
        if (this.options.metadata != ODataMetadataType.none) {
          flushObject['@odata.context'] = this.odataContext;
        }
        if (this.streamStart && typeof this.streamInlineCount == 'number') {
          flushObject['@odata.count'] = this.streamInlineCount;
        }
        this.push(flushObject);
      } else {
        if (this.streamStart) {
          if (typeof this.streamInlineCount == 'number') {
            this.push(`],"@odata.count":${this.streamInlineCount}}`);
          } else {
            this.push(']}');
          }
        } else {
          if (this.options.metadata == ODataMetadataType.none) {
            this.push('{"value":[]}');
          } else {
            this.push(`{"@odata.context":"${this.odataContext}","value":[]}`);
          }
        }
      }
    } else if (this.streamEnabled && !this.streamStart) {
      if (this.options.metadata == ODataMetadataType.none) {
        this.push('{"value":[]}');
      } else {
        this.push(`{"@odata.context":"${this.odataContext}","value":[]}`);
      }
    }
    this.streamEnd = true;
    if (typeof done == 'function') {
      done();
    }
  }

  private __qualifiedTypeName(part: NavigationPart): Function {
    return (result) => {
      result.elementType = part.node[ODATA_TYPE];
      return result;
    };
  }

  private __EntityCollectionNavigationProperty(part: NavigationPart): Function {
    return async (result) => {
      try {

        const resultType = result.elementType;
        if (isUndefined(resultType)) {
          throw new ResourceNotFoundError();
        }
        const elementType = <Function>Edm.getType(resultType, part.name, this.serverType.container);
        const partIndex = this.resourcePath.navigation.indexOf(part);
        const method = writeMethods.indexOf(this.method) >= 0 && partIndex < this.resourcePath.navigation.length - 1
          ? 'get'
          : this.method;

        let fn: any = odata.findODataMethod(this.ctrl, `${method}/${part.name}`, part.key);

        // if the controller has defined a customize processor for this navigation
        if (fn) {
          const ctrl = this.ctrl;
          const fnDesc = fn;
          const params = {};
          if (part.key) {
            part.key.forEach((key) => params[key.name] = key.value);
          }
          await this.__applyParams(ctrl, fnDesc.call, params, this.url.query, result);
          fn = ctrl.prototype[fnDesc.call];
          if (fnDesc.key.length == 1 && part.key.length == 1 && fnDesc.key[0].to != part.key[0].name) {
            params[fnDesc.key[0].to] = params[part.key[0].name];
            delete params[part.key[0].name];
          } else {
            for (let i = 0; i < fnDesc.key.length; i++) {
              if (fnDesc.key[i].to != fnDesc.key[i].from) {
                params[fnDesc.key[i].to] = params[fnDesc.key[i].from];
                delete params[fnDesc.key[i].from];
              }
            }
          }
          if (part.key) {
            part.key.forEach((key) => params[key.name] = key.value);
          }
          this.elementType = elementType;
          return this.__read(ctrl, part, params, result, fn, elementType).then((result) => {
            this.ctrl = this.serverType.getController(elementType);
            return result;
          });
        }

        // use default process, find the correct controller for this navigation
        const ctrl = this.serverType.getController(elementType);
        const foreignKeys = Edm.getForeignKeys(resultType, part.name);
        const typeKeys = Edm.getKeyProperties(resultType);
        result.foreignKeys = {};

        // create filter string for navigation
        const foreignFilter = (await Promise.all(foreignKeys.map(async (key) => {
          result.foreignKeys[key] = result.body[typeKeys[0]];
          return `${key} eq ${await Edm.escape(result.body[typeKeys[0]], Edm.getTypeName(elementType, key, this.serverType.container))}`;
        }))).join(' and ');

        const params = {};

        if (part.key) {
          part.key.forEach((key) => params[key.name] = key.value);
        }

        return this.__read(ctrl, part, params, result, foreignFilter);
      } catch (err) {
        return Promise.reject(err);
      }
    };
  }

  private __EntityNavigationProperty(part: NavigationPart): Function {
    return async (result) => {
      const resultType = result.elementType;
      const elementType = <Function>Edm.getType(resultType, part.name, this.serverType.container);
      const partIndex = this.resourcePath.navigation.indexOf(part);
      const method = writeMethods.indexOf(this.method) >= 0 && partIndex < this.resourcePath.navigation.length - 1
        ? 'get'
        : this.method;

      let fn: any = odata.findODataMethod(this.ctrl, `${method}/${part.name}`, part.key);
      // if the controller has defined a customize processor for this navigation
      if (fn) {
        const ctrl = this.ctrl;
        const fnDesc = fn;
        const params = {};
        if (part.key) {
          part.key.forEach((key) => params[key.name] = key.value);
        }
        await this.__applyParams(ctrl, fnDesc.call, params, this.url.query, result);
        fn = ctrl.prototype[fnDesc.call];
        if (fnDesc.key.length == 1 && part.key.length == 1 && fnDesc.key[0].to != part.key[0].name) {
          params[fnDesc.key[0].to] = params[part.key[0].name];
          delete params[part.key[0].name];
        } else {
          for (let i = 0; i < fnDesc.key.length; i++) {
            if (fnDesc.key[i].to != fnDesc.key[i].from) {
              params[fnDesc.key[i].to] = params[fnDesc.key[i].from];
              delete params[fnDesc.key[i].from];
            }
          }
        }
        this.elementType = elementType;
        result = await this.__read(ctrl, part, params, result, fn, elementType);
        this.ctrl = this.serverType.getController(elementType);
        return result;
      }

      const ctrl = this.serverType.getController(elementType);
      const foreignKeys = Edm.getForeignKeys(resultType, part.name);
      result.foreignKeys = {};
      (<any>part).key = foreignKeys.map((key) => {
        result.foreignKeys[key] = result.body[key];
        return {
          name: key,
          value: result.body[key]
        };
      });

      const params = {};

      if (part.key) {
        part.key.forEach((key) => params[key.name] = key.value);
      }

      return this.__read(ctrl, part, params, result);
    };
  }

  private __PrimitiveProperty(part: NavigationPart): Function {
    return async (result) => {
      this.__enableStreaming(part);

      let currentResult;

      const prevPart = this.resourcePath.navigation[this.resourcePath.navigation.indexOf(part) - 1];
      let fn = odata.findODataMethod(this.ctrl, `${this.method}/${part.name}`, prevPart.key || []) ||
        odata.findODataMethod(this.ctrl, `${this.method}/${part.name}/$value`, prevPart.key || []);
      if (!fn && this.method != 'get') {
        fn = this.method == 'delete'
          ? odata.findODataMethod(this.ctrl, 'patch', prevPart.key || [])
          : odata.findODataMethod(this.ctrl, `${this.method}`, prevPart.key || []);
        if (fn) {
          let body = this.body;
          if (Edm.getTypeName(result.elementType, part.name, this.serverType.container) != 'Edm.Stream') {
            body = body.body || body;
          }
          this.body = {};
          this.body[part.name] = this.method == 'delete' ? null : body.value || body;
        }
      }

      if (fn) {
        const ctrl = this.prevCtrl;
        const params = {};
        if (prevPart.key) {
          prevPart.key.forEach((key) => params[key.name] = key.value);
        }

        const fnDesc = fn;
        await this.__applyParams(ctrl, fnDesc.call, params, this.url.query, result);

        fn = ctrl.prototype[fnDesc.call];
        if (fnDesc.key.length == 1 && prevPart.key.length == 1 && fnDesc.key[0].to != prevPart.key[0].name) {
          params[fnDesc.key[0].to] = params[prevPart.key[0].name];
          delete params[prevPart.key[0].name];
        } else {
          for (let i = 0; i < fnDesc.key.length; i++) {
            if (fnDesc.key[i].to != fnDesc.key[i].from) {
              params[fnDesc.key[i].to] = params[fnDesc.key[i].from];
              delete params[fnDesc.key[i].from];
            }
          }
        }

        this.elementType = Edm.getType(result.elementType, part.name, this.serverType.container) || Object;
        if (typeof this.elementType == 'string') {
          this.elementType = Object;
        }
        currentResult = fnCaller(ctrl, fn, params);

        if (isIterator(fn)) {
          currentResult = run(currentResult, defaultHandlers);
        }

        if (!isPromise(currentResult)) {
          currentResult = Promise.resolve(currentResult);
        }
      } else {
        let value = result.body[part.name];
        if (value instanceof StreamWrapper) {
          value = value.stream;
        }

        currentResult = Promise.resolve(value);
      }

      if (this.method == 'get') {
        let value = await currentResult;

        result.body = {
          '@odata.context': this.options.metadata != ODataMetadataType.none ? result.body['@odata.context'] : undefined,
          value
        };
        const elementType = result.elementType;

        // if (value instanceof Object)
        result.elementType = Edm.isEnumType(result.elementType, part.name)
          ? Edm.getTypeName(result.elementType, part.name, this.serverType.container)
          : Edm.getType(result.elementType, part.name, this.serverType.container) || Object;

        if (value && (isStream(value) || isStream(value.stream))) {
          this.emit('header', {
            'Content-Type': Edm.getContentType(elementType.prototype, part.name) || value.contentType || 'application/octet-stream'
          });
          if (value.stream) {
            value = value.stream;
          }
          value.pipe(this);
          return new Promise((resolve, reject) => {
            value.on('end', resolve);
            value.on('error', reject);
          });
        }
        if (this.streamEnabled && this.streamStart) {
          delete result.body;
        }
        if (result.stream) {
          delete result.stream;
        }
        return result;

      }

      return ODataResult.NoContent(currentResult);

    };
  }

  private async __read(ctrl: typeof ODataController, part: any, params: any, data?: any, filter?: string | Function, elementType?: any, include?, select?) {

    if (this.ctrl) {
      this.prevCtrl = this.ctrl;
    } else {
      this.prevCtrl = ctrl;
    }
    this.ctrl = ctrl;

    const method = writeMethods.indexOf(this.method) >= 0 &&
      this.resourcePath.navigation.indexOf(part) < this.resourcePath.navigation.length - 1
      ? 'get'
      : this.method;

    this.instance = await this.serverType.getControllerInstance(ctrl);

    let fn;
    let ic: InjectContainer;
    if (typeof filter == 'string' || !filter) {
      // get metadata of method
      fn = odata.findODataMethod(ctrl, method, part.key);

      // not found method to process
      if (!fn) {
        throw new NotImplementedError();
      }

      let queryString = filter ? `$filter=${filter}` : (include || this.url).query;
      if (include && filter && include.query && !include.query.$filter) {
        include.query.$filter = filter;
        queryString = Object.keys(include.query).map((p) => `${p}=${include.query[p]}`).join('&');
      } else if (
        (include && filter && include.query) ||
        (!include && this.resourcePath.navigation.indexOf(part) == this.resourcePath.navigation.length - 1)
      ) {
        queryString = Object.keys((include || this).query).map((p) => {
          if (p == '$filter' && filter) {
            (include || this).query[p] = `(${(include || this).query[p]}) and (${filter})`;
          }
          return `${p}=${(include || this).query[p]}`;
        }).join('&') || queryString;
      }

      // build object to query string
      if (queryString && typeof queryString == 'object') {
        queryString = Object.keys(queryString).map((p) => `${p}=${queryString[p]}`).join('&');
      }

      if (typeof fn != 'function') {
        // construct injected params
        const fnDesc = fn;
        fn = ctrl.prototype[fnDesc.call];

        // assign other parameters
        ic = await this.__applyParams(ctrl, fnDesc.call, params, queryString, undefined, include);

        // >> assign keys to params
        if (fnDesc.key.length == 1 && part.key.length == 1 && fnDesc.key[0].to != part.key[0].name) {
          params[fnDesc.key[0].to] = params[part.key[0].name];
          ic.registerInstance(InjectKey.ODataKeyParameters, params[fnDesc.key[0].to]);
          delete params[part.key[0].name];
        } else {
          for (let i = 0; i < fnDesc.key.length; i++) {
            if (fnDesc.key[i].to != fnDesc.key[i].from) {
              params[fnDesc.key[i].to] = params[fnDesc.key[i].from];
              delete params[fnDesc.key[i].from];
            }
          }
        }
        // <<

      } else {
        ic = await this.__applyParams(ctrl, method, params, queryString, undefined, include);
      }
    } else {
      fn = filter;
    }

    if (!include) {
      this.__enableStreaming(part);
    }

    let currentResult: any;

    const ctrlInstance = await this.serverType.getControllerInstance(ctrl);

    // inject parameters by type
    switch (method) {
      case 'get':
      case 'delete':
        break;
      case 'post':
        this.odataContext += '/$entity';
      case 'put':
      case 'patch':
        const body = data ? Object.assign(this.body || {}, data.foreignKeys) : this.body;
        const bodyParam = odata.getBodyParameter(ctrl, fn.name);
        const typeParam = odata.getTypeParameter(ctrl, fn.name);
        if (typeParam) {
          params[typeParam] = (
            body['@odata.type'] ??
            (`${ctrlInstance.elementType.namespace}.${ctrlInstance.elementType.name}`)
          ).replace(/^#/, '');
        }
        if (bodyParam) {
          await this.__deserialize(body, ctrl.prototype.elementType);
          this.__stripOData(body);
          params[bodyParam] = body;
        }
        if (!part.key) {
          const properties: string[] = Edm.getProperties((elementType || ctrl.prototype.elementType).prototype);
          properties.forEach((prop) => {
            if (Edm.isKey(elementType || ctrl.prototype.elementType, prop)) {
              params[prop] = (this.body || {})[prop] || ((data || {}).body || {})[prop];
            }
          });
        }

        break;
    }

    if (this.serverType.variant == ServerType.typed && ic !== undefined) {
      const preferParams = fnCaller.getFnParam(fn, params);
      currentResult = await ic.injectExecute(ctrlInstance, fn, ...preferParams);
    } else {
      currentResult = fnCaller(ctrlInstance, fn, params);
    }

    if (isIterator(fn)) {
      currentResult = run(currentResult, defaultHandlers);
    }

    if (!isPromise(currentResult)) {
      currentResult = Promise.resolve(currentResult);
    }

    let result = await currentResult;

    if (isStream(result) && include) {

      result = await include.streamPromise;
      result = await ODataRequestResult[method](result);

    } else if (isStream(result) && (!part.key || !Edm.isMediaEntity(elementType || this.ctrl.prototype.elementType))) {

      return new Promise((resolve, reject) => {
        result.on('end', () => resolve(ODataRequestResult[method]()));
        result.on('error', reject);
      });

    } else if (!(result instanceof ODataResult)) {
      result = await ODataRequestResult[method](result);

      if (!this.streamStart && writeMethods.indexOf(this.method) < 0 && !result.body) {
        throw new ResourceNotFoundError();
      }

    }

    if (elementType) {
      result.elementType = elementType;
    }

    await this.__appendODataContext(
      result,
      elementType || this.ctrl.prototype.elementType,
      (include || this.resourcePath).includes,
      select
    );

    if (!this.streamEnd && this.streamEnabled && this.streamStart) {
      return new Promise((resolve) => {
        this.on('end', () => resolve(result));
      });
    }

    return result;

  }

  private async __deserialize(obj, type) {
    for (const prop in obj) {
      try {
        const propType = Edm.getType(type, prop, this.serverType.container);
        const fn = Edm.getDeserializer(type, prop, propType, this.serverType.container);
        if (typeof fn == 'function') {
          obj[prop] = await fn(obj[prop], prop, propType);
        } else if (typeof obj[prop] == 'object') {
          await this.__deserialize(obj[prop], propType);
        }
      } catch (err) { }
    }
  }

  private __stripOData(obj) {
    for (const prop in obj) {
      if (prop.indexOf('@odata') >= 0) {
        delete obj[prop];
      }
      if (typeof obj[prop] == 'object') {
        this.__stripOData(obj[prop]);
      }
    }
  }

  private __EntitySetName(part: NavigationPart): Function {
    const ctrl = this.entitySets[part.name];
    const params = {};
    if (part.key) {
      part.key.forEach((key) => params[key.name] = key.value);
    }
    return (data) => this.__read(ctrl, part, params, data, undefined, undefined, undefined, this.resourcePath.select);
  }

  private __actionOrFunctionImport(part: NavigationPart): Function {

    const fn = this.serverType.prototype[part.name];
    return async (data) => {
      this.__enableStreaming(part);

      const returnType = <Function>Edm.getReturnType(this.serverType, part.name, this.serverType.container);
      let isAction = false;
      const schemas = this.serverType.$metadata().edmx.dataServices.schemas;
      if (Edm.isActionImport(this.serverType, part.name) ||
        schemas.some((schema) => schema.entityContainer.some((container) => container.actionImports.some((actionImport) => actionImport.name == part.name)))
      ) {
        isAction = true;
        part.params = Object.assign(part.params || {}, this.body || {});
      }
      await this.__applyParams(this.serverType, part.name, part.params);
      let result = fnCaller(data, fn, part.params);

      if (isIterator(fn)) {
        result = run(result, defaultHandlers);
      }

      if (isAction && !returnType) {
        return ODataResult.NoContent(result);
      }

      result = await ODataResult.Ok(result);

      if (isStream(result.body)) {
        return new Promise((resolve, reject) => {
          (<any>result.body).on('end', resolve);
          (<any>result.body).on('error', reject);
        });
      }

      await this.__appendODataContext(result, returnType, this.resourcePath.includes, this.resourcePath.select);
      return result;

    };
  }

  private __actionOrFunction(part: NavigationPart): Function {
    return (result: ODataResult) => new Promise(async (resolve, reject) => {
      try {

        this.__enableStreaming(part);

        if (!result) {
          return resolve();
        }

        const boundOpName = part.name.split('.').pop();
        const elementType = result.elementType;
        const entityBoundOp = typeof elementType == 'function' ? elementType.prototype[boundOpName] : null;
        const ctrlBoundOp = this.instance[boundOpName];
        const expOp = expCalls[boundOpName];
        let scope: any = this.serverType;
        let returnType: any = Object;
        let isAction = false;
        const schemas = this.serverType.$metadata().edmx.dataServices.schemas;

        let ic: InjectContainer = undefined;

        // entity bound operation
        // e.g. POST /Teachers(1)/Default.addClass {payload}
        if (entityBoundOp) {

          // use original result for typed odata model
          if (this.serverType.variant == ServerType.typed) {
            scope = result.getOriginalResult();
          } else {
            scope = result.body;
          }

          returnType = <Function>Edm.getReturnType(elementType, boundOpName, this.serverType.container);

          if (Edm.isAction(elementType, boundOpName) ||
            schemas.some((schema) =>
              schema.actions.some((action) =>
                action.name == boundOpName && action.isBound && action.parameters.some((parameter) =>
                  parameter.name == 'bindingParameter' && parameter.type == (`${(<any>elementType).namespace}.${(<any>elementType).name}`))))
          ) {
            isAction = true;
            part.params = Object.assign(part.params || {}, this.body || {});
          }
          ic = await this.__applyParams(elementType, boundOpName, part.params, null, result);
        } else if (ctrlBoundOp) {
          scope = this.instance;
          returnType = <Function>Edm.getReturnType(this.ctrl, boundOpName, this.serverType.container);
          if (Edm.isAction(elementType, boundOpName) ||
            schemas.some((schema) =>
              schema.actions.some((action) =>
                action.name == boundOpName && action.isBound && action.parameters.some((parameter) =>
                  parameter.name == 'bindingParameter' && parameter.type == `Collection(${(<any>elementType).namespace}.${(<any>elementType).name})`)))
          ) {
            isAction = true;
            part.params = Object.assign(part.params || {}, this.body || {});
          }
          ic = await this.__applyParams(this.ctrl, boundOpName, part.params, null, result);
        } else if (expOp) {
          scope = result;
          part.params['processor'] = this;
        }

        const boundOp = entityBoundOp || ctrlBoundOp || expOp;

        let opResult;
        if (this.serverType.variant == ServerType.typed && ic !== undefined) {
          const predefineParams = fnCaller.getFnParam(boundOp, part.params);
          opResult = await ic.injectExecute(scope, boundOp, ...predefineParams);
        } else {
          opResult = fnCaller(scope, boundOp, part.params);
        }


        if (isIterator(boundOp)) {
          opResult = run(opResult, defaultHandlers);
        }

        if (boundOp == expOp) {

          let expResult = Promise.resolve(boundOpName == '$count' ? opResult || this.resultCount : opResult);

          if (elementType && boundOpName == '$value' && typeof elementType == 'function' && Edm.isMediaEntity(elementType)) {
            opResult = await opResult;
            if (this.method == 'get') {
              this.emit('header', {
                'Content-Type': Edm.getContentType(elementType) || opResult.contentType || 'application/octet-stream'
              });
              if (opResult.stream) {
                opResult = opResult.stream;
              }
              opResult.pipe(this);
              opResult.on('end', resolve);
              opResult.on('error', reject);
            } else {
              ODataResult.NoContent().then(resolve, reject);
            }
          } else {
            expResult = await expResult;

            let rf: any;

            if (boundOpName == '$ref' && this.method != 'get') {
              rf = ODataResult.NoContent;
            } else {
              rf = ODataRequestResult[this.method];
            }

            const result = await rf(expResult, typeof expResult == 'object' ? 'application/json' : 'text/plain');

            if (typeof expResult == 'object' && (boundOpName != '$ref' || this.method == 'get')) {
              result.elementType = elementType;
            }

            resolve(result);

          }
        }

        if (isAction && !returnType) {

          resolve(await ODataResult.NoContent(opResult));

        } else {

          const result = await ODataResult.Ok(opResult);

          if (isStream(result.body)) {

            (<any>result.body).on('end', resolve);
            (<any>result.body).on('error', reject);

          } else {

            await this.__appendODataContext(result, returnType, this.resourcePath.includes, this.resourcePath.select);

            if (typeof result.body.value == 'undefined') {
              result.body.value = opResult;
            }
            resolve(result);

          }

        }

      } catch (err) {

        reject(err);

      }
    });
  }

  private async __appendLinks(ctrl, elementType, context, body, result?) {
    if (this.options.metadata == ODataMetadataType.none) {
      return;
    }
    let entitySet = this.entitySets[this.resourcePath.navigation[0].name] == ctrl ? this.resourcePath.navigation[0].name : null;
    if (!entitySet) {
      for (const prop in this.entitySets) {
        if (this.entitySets[prop] == ctrl) {
          entitySet = prop;
          break;
        }
      }
    }
    const resultType = Object.getPrototypeOf(body).constructor;
    if (resultType != Object && resultType != elementType) {
      elementType = resultType;
    }
    if (typeof body['@odata.type'] == 'function') {
      elementType = body['@odata.type'];
    }
    let keys = Edm.getKeyProperties(elementType);
    const resolveBaseType = (elementType) => {
      if (elementType && elementType.prototype) {
        const proto = Object.getPrototypeOf(elementType.prototype);
        if (proto) {
          const baseType = proto.constructor;
          if (baseType != Object && Edm.getProperties(baseType.prototype).length > 0) {
            keys = Edm.getKeyProperties(baseType).concat(keys);
            resolveBaseType(baseType);
          }
        }
      }
    };
    resolveBaseType(elementType);
    if (!entitySet || ctrl.prototype.elementType != elementType) {
      const typeCtrl = this.serverType.getController(elementType);
      if (typeCtrl) {
        for (const prop in this.entitySets) {
          if (this.entitySets[prop] == typeCtrl) {
            entitySet = prop;
            break;
          }
        }
      }
    }
    let id;
    if (keys.length > 0) {
      try {
        if (keys.length == 1) {
          id = await Edm.escape(
            body[keys[0]],
            Edm.getTypeName(elementType, keys[0], this.serverType.container),
            Edm.getURLSerializer(
              elementType,
              keys[0],
              Edm.getType(elementType, keys[0], this.serverType.container),
              this.serverType.container
            ));
        } else {
          id = (await Promise.all(keys.map(async (it) =>
            `${it}=${await Edm.escape(
              body[it],
              Edm.getTypeName(elementType, it, this.serverType.container),
              Edm.getURLSerializer(
                elementType,
                it,
                Edm.getType(elementType, it, this.serverType.container),
                this.serverType.container
              ))}`))).join(',');
        }
      } catch (err) { }
    }
    if (entitySet && typeof id != 'undefined') {
      context['@odata.id'] = `${getODataRoot(this.context)}/${entitySet}(${id})`;
      if (typeof elementType == 'function' && Edm.isMediaEntity(elementType)) {
        context['@odata.mediaReadLink'] = `${getODataRoot(this.context)}/${entitySet}(${id})/$value`;
        if (odata.findODataMethod(ctrl, 'post/$value', [])) {
          context['@odata.mediaEditLink'] = `${getODataRoot(this.context)}/${entitySet}(${id})/$value`;
        }
        const contentType = Edm.getContentType(elementType);
        if (contentType) {
          context['@odata.mediaContentType'] = contentType;
        }
        if (typeof result == 'object') {
          Object.defineProperty(result, 'stream', {
            configurable: true,
            enumerable: false,
            writable: false,
            value: body
          });
        }
      }
      if (odata.findODataMethod(ctrl, 'put', keys) ||
        odata.findODataMethod(ctrl, 'patch', keys)) {
        context['@odata.editLink'] = `${getODataRoot(this.context)}/${entitySet}(${id})`;
      }
    } else {
      if (typeof elementType == 'function' && Edm.isMediaEntity(elementType)) {
        context['@odata.mediaReadLink'] = `${getODataRoot(this.context)}${this.context.url}(${id})/$value`;
        context['@odata.mediaReadLink'] = context['@odata.mediaReadLink'].replace(`(${id})(${id})`, `(${id})`);
        if (odata.findODataMethod(ctrl, 'post/$value', [])) {
          context['@odata.mediaEditLink'] = `${getODataRoot(this.context)}${this.context.url}(${id})/$value`;
          context['@odata.mediaEditLink'] = context['@odata.mediaEditLink'].replace(`(${id})(${id})`, `(${id})`);
        }
        const contentType = Edm.getContentType(elementType);
        if (contentType) {
          context['@odata.mediaContentType'] = contentType;
        }
        if (typeof result == 'object') {
          Object.defineProperty(result, 'stream', {
            configurable: true,
            enumerable: false,
            writable: false,
            value: body
          });
        }
      }
      if (keys.length > 0 && typeof id != 'undefined') {
        if (odata.findODataMethod(ctrl, 'put', keys) ||
          odata.findODataMethod(ctrl, 'patch', keys)) {
          context['@odata.editLink'] = `${getODataRoot(this.context)}${this.context.url}(${id})`;
          context['@odata.editLink'] = context['@odata.editLink'].replace(`(${id})(${id})`, `(${id})`);
        }
      }
    }
  }

  private async __appendODataContext(result: any, ctrlType: Function, includes?, select?) {
    if (typeof result.body == 'undefined') {
      return;
    }
    const context: any = {
      '@odata.context': this.options.metadata != ODataMetadataType.none ? this.odataContext : undefined
    };

    const elementType = result.elementType = jsPrimitiveTypes.indexOf(result.elementType) >= 0 || result.elementType == String || typeof result.elementType != 'function' ? ctrlType : result.elementType;
    if (typeof result.body == 'object' && result.body) {
      if (typeof result.body['@odata.count'] == 'number') {
        context['@odata.count'] = result.body['@odata.count'];
      }
      if (!result.body['@odata.context']) {
        const ctrl = this.ctrl && this.ctrl.prototype.elementType == ctrlType ? this.ctrl : this.serverType.getController(ctrlType);
        if (result.body.value && Array.isArray(result.body.value)) {
          context.value = [];
          await Promise.all(result.body.value.map((entity, i) => (async (entity, i) => {
            if (typeof entity == 'object') {
              const item = {};
              if (ctrl) {
                await this.__appendLinks(ctrl, elementType, item, entity);
              }
              await this.__convertEntity(item, entity, elementType, includes, select);
              context.value[i] = item;
            } else {
              context.value[i] = entity;
            }
          })(entity, i)));
        } else {
          if (ctrl) {
            await this.__appendLinks(ctrl, elementType, context, result.body, result);
          }
          await this.__convertEntity(context, result.body, elementType, includes, select);
        }
      }
    } else if (typeof result.body != 'undefined' && result.body) {
      context.value = result.body;
    }
    result.body = context;
  }

  private async __resolveAsync(type, prop, propValue, entity, converter) {
    if (typeof converter == 'function') {
      propValue = await converter(propValue, prop, type);
    }
    if (isIterator(propValue)) {
      propValue = await run(propValue.call(entity), defaultHandlers);
    }
    if (typeof propValue == 'function') {
      propValue = propValue.call(entity);
    }
    if (isPromise(propValue)) {
      propValue = await propValue;
    }
    if (type != 'Edm.Stream' && isStream(propValue)) {
      const stream = new ODataStreamWrapper();
      (<Readable>propValue).pipe(stream);
      propValue = await stream.toPromise();
    }
    return propValue;
  }

  private __setODataType(context, elementType) {
    const containerType = this.serverType.container.resolve(elementType);
    if (containerType) {
      context['@odata.type'] = `#${odata.getNamespace(Object.getPrototypeOf(this.serverType.container).constructor, containerType) || (this.serverType.container['namespace'] || elementType.namespace || this.serverType.namespace)}.${containerType}`;
    } else {
      context['@odata.type'] = `#${(elementType.namespace || this.serverType.namespace)}.${elementType.name}`;
    }
  }

  private async __convertEntity(context, result, elementType, includes?, select?) {
    if (!(elementType.prototype instanceof Object) || elementType === Object || this.options.disableEntityConversion) {
      return Object.assign(context, result || {});
    }
    const resultType = Object.getPrototypeOf(result).constructor;
    if (resultType != Object && resultType != this.ctrl.prototype.elementType && resultType.prototype instanceof this.ctrl.prototype.elementType) {
      elementType = resultType;
      if (this.options.metadata != ODataMetadataType.none && Edm.isEntityType(elementType)) {
        this.__setODataType(context, elementType);
      }
    }
    if (typeof result['@odata.type'] == 'function') {
      elementType = result['@odata.type'];
      if (this.options.metadata != ODataMetadataType.none && Edm.isEntityType(elementType)) {
        this.__setODataType(context, elementType);
      }
    }
    if (this.options.metadata == ODataMetadataType.full) {
      this.__setODataType(context, elementType);
    }
    let props = Edm.getProperties(elementType.prototype);
    if (Edm.isOpenType(elementType)) {
      props = Object.getOwnPropertyNames(result).concat(props);
    }
    let ctrl = this.serverType.getController(elementType);
    const resolveBaseType = (elementType) => {
      if (elementType && elementType.prototype) {
        const proto = Object.getPrototypeOf(elementType.prototype);
        if (proto) {
          const baseType = proto.constructor;
          if (baseType != Object && Edm.getProperties(baseType.prototype).length > 0) {
            props = Edm.getProperties(baseType.prototype).concat(props);
            ctrl = ctrl || this.serverType.getController(baseType);
            resolveBaseType(baseType);
          }
        }
      }
    };
    resolveBaseType(elementType);
    const entityType = function () { };
    util.inherits(entityType, elementType);
    result = Object.assign(new entityType(), result || {});

    if (includes) {
      for (const expand in includes) {
        const include = includes[expand];
        for (const nav of include.navigation) {
          if (nav.type == TokenType.EntityNavigationProperty || nav.type == TokenType.EntityCollectionNavigationProperty && !includes[nav.name]) {
            includes[nav.name] = include;
          }
        }
      }
    }

    if (props.length > 0) {
      const metadata = {};
      await Promise.all(props.map((prop) => (async (prop) => {
        const type: any = Edm.getType(elementType, prop, this.serverType.container);
        let itemType;
        if (typeof type == 'function' && !Edm.isTypeDefinition(elementType, prop)) {
          itemType = function () { };
          util.inherits(itemType, type);
        }
        const converter: Function = Edm.getSerializer(elementType, prop, type, this.serverType.container) || Edm.getConverter(elementType, prop);
        const isCollection = Edm.isCollection(elementType, prop);
        const entity = result;
        let propValue = entity[prop];

        propValue = await this.__resolveAsync(type, prop, propValue, entity, converter);
        if (select && Object.keys(select).length == 0) {
          select = null;
        }

        if (!select || (select && select[prop]) || (includes && includes[prop])) {
          if (isCollection && propValue) {
            const value = Array.isArray(propValue) ? propValue : (typeof propValue != 'undefined' ? [
              propValue
            ] : []);
            for (let i = 0; i < value.length; i++) {
              value[i] = await this.__resolveAsync(type, prop, value[i], entity, converter);
            }
            if (includes && includes[prop]) {
              await this.__include(includes[prop], (select || {})[prop], context, prop, ctrl, entity, elementType);
            } else if (typeof type == 'function' && !Edm.isTypeDefinition(elementType, prop)) {
              for (let i = 0; i < value.length; i++) {
                const it = value[i];
                if (!it) {
                  return it;
                }
                const item = new itemType();
                await this.__convertEntity(item, it, type, includes, (select || {})[prop]);
                value[i] = item;
              }
            }
            context[prop] = value;
          } else {
            if (this.options.metadata == ODataMetadataType.full) {
              if (Edm.isEntityType(elementType, prop)) {
                if ((!includes || (includes && !includes[prop]))) {
                  metadata[`${prop}@odata.associationLink`] = `${context['@odata.id']}/${prop}/$ref`;
                  metadata[`${prop}@odata.navigationLink`] = `${context['@odata.id']}/${prop}`;
                }
              } else if (type != 'Edm.String' && type != 'Edm.Boolean') {
                let typeName = Edm.getTypeName(elementType, prop, this.serverType.container);
                if (typeof type == 'string' && type.indexOf('Edm.') == 0) {
                  typeName = typeName.replace(/Edm\./, '');
                }
                context[`${prop}@odata.type`] = `#${typeName}`;
              }
            }
            if (includes && includes[prop]) {
              await this.__include(includes[prop], (select || {})[prop], context, prop, ctrl, entity, elementType);
            } else if (typeof type == 'function' && propValue && !Edm.isTypeDefinition(elementType, prop)) {
              context[prop] = new itemType();
              await this.__convertEntity(context[prop], propValue, type, includes, (select || {})[prop]);
            } else if (type == 'Edm.Stream') {
              if (this.options.metadata != ODataMetadataType.none) {
                context[`${prop}@odata.mediaReadLink`] = `${context['@odata.id']}/${prop}`;
                if (odata.findODataMethod(ctrl, `post/${prop}`, []) || odata.findODataMethod(ctrl, `post/${prop}/$value`, [])) {
                  context[`${prop}@odata.mediaEditLink`] = `${context['@odata.id']}/${prop}`;
                }
                const contentType = Edm.getContentType(elementType.prototype, prop) || (propValue && propValue.contentType);
                if (contentType) {
                  context[`${prop}@odata.mediaContentType`] = contentType;
                }
              }
              Object.defineProperty(context, prop, {
                configurable: true,
                enumerable: false,
                writable: false,
                value: new StreamWrapper(propValue)
              });
            } else if (typeof propValue != 'undefined') {
              context[prop] = propValue;
            }
          }
        }
      })(prop)));
      Object.assign(context, metadata);
    }
  }

  private async __include(include: ResourcePathVisitor, select, context, prop, ctrl: typeof ODataController, result, elementType) {
    const oldPrevCtrl = this.prevCtrl;
    const oldCtrl = this.ctrl;
    const isCollection = Edm.isCollection(elementType, include.navigationProperty);
    const navigationType = <Function>Edm.getType(elementType, include.navigationProperty, this.serverType.container);
    let navigationResult;
    if (typeof result[prop] == 'object') {
      navigationResult = await ODataResult.Ok(result[prop]);
      await this.__appendODataContext(navigationResult, navigationType, include.includes, select);
      ctrl = this.serverType.getController(navigationType);
    } else {
      const fn = odata.findODataMethod(ctrl, `get/${include.navigationProperty}`, []);
      const params = {};
      let stream: ODataStreamWrapper,
        streamPromise: Promise<{}>;
      if (isCollection) {
        stream = (<any>include).stream = new ODataStreamWrapper();
        streamPromise = (<any>include).streamPromise = stream.toPromise();
      }
      if (fn) {
        await this.__applyParams(ctrl, fn.call, params, include.ast, result, include);
        const fnCall = ctrl.prototype[fn.call];
        let fnResult = fnCaller(ctrl, fnCall, params);

        if (isIterator(fnCall)) {
          fnResult = await run(fnResult, defaultHandlers);
        }

        if (isPromise(fnResult)) {
          fnResult = await fnResult;
        }

        if (isCollection && (isStream(fnResult) || !fnResult || (stream && stream.buffer && stream.buffer.length > 0)) && stream && streamPromise) {
          navigationResult = await ODataResult.Ok((await streamPromise) || []);
        } else {
          navigationResult = await ODataResult.Ok(fnResult);
        }
        await this.__appendODataContext(navigationResult, navigationType, include.includes, select);
        ctrl = this.serverType.getController(navigationType);
      } else {
        ctrl = this.serverType.getController(navigationType);
        if (isCollection) {
          const foreignKeys = Edm.getForeignKeys(elementType, include.navigationProperty);
          const typeKeys = Edm.getKeyProperties(elementType);
          result.foreignKeys = {};
          const part: any = {};
          const foreignFilter = (await Promise.all(foreignKeys.map(async (key) => {
            result.foreignKeys[key] = result[typeKeys[0]];
            return `${key} eq ${await Edm.escape(result[typeKeys[0]], Edm.getTypeName(navigationType, key, this.serverType.container))}`;
          }))).join(' and ');
          if (part.key) {
            part.key.forEach((key) => params[key.name] = key.value);
          }
          navigationResult = await this.__read(ctrl, part, params, result, foreignFilter, navigationType, include, include.select);
        } else {
          const foreignKeys = Edm.getForeignKeys(elementType, include.navigationProperty);
          const part: any = {};

          // enhanced logic for typed odata server
          const nav = getODataNavigation(elementType, include.navigationProperty);

          if (nav?.type == 'OneToOne' && !isEmpty(nav.targetForeignKey)) {
            const [keyName] = Edm.getKeyProperties(elementType);
            const foreignFilter = ODataFilter.New().field(nav.targetForeignKey).eq(result[keyName]).toString();
            navigationResult = await this.__read(ctrl, part, params, result, foreignFilter, navigationType, include, include.select);

            const data = get(navigationResult, '_originalResult.value[0]');

            if (!isUndefined(data)) {
              navigationResult = await ODataResult.Ok(data);
            }

          } else {

            result.foreignKeys = {};
            part.key = foreignKeys.map((key) => {
              result.foreignKeys[key] = result[key];
              return {
                name: key,
                value: result[key]
              };
            });
            if (part.key) {
              part.key.forEach((key) => params[key.name] = key.value);
            }
            navigationResult = await this.__read(ctrl, part, params, result, undefined, navigationType, include, include.select);

          }


        }
      }
    }
    let entitySet = this.entitySets[this.resourcePath.navigation[0].name] == ctrl ? this.resourcePath.navigation[0].name : null;
    if (!entitySet) {
      for (const prop in this.entitySets) {
        if (this.entitySets[prop] == ctrl) {
          entitySet = prop;
          break;
        }
      }
    }
    delete navigationResult.body['@odata.context'];
    if (this.options.metadata == ODataMetadataType.full) {
      context[`${prop}@odata.associationLink`] = `${context['@odata.id']}/${prop}/$ref`;
      context[`${prop}@odata.navigationLink`] = `${context['@odata.id']}/${prop}`;
    }
    if (isCollection && navigationResult.body.value && Array.isArray(navigationResult.body.value)) {
      if (typeof navigationResult.body['@odata.count'] == 'number') {
        context[`${prop}@odata.count`] = navigationResult.body['@odata.count'];
      }
      context[prop] = navigationResult.body.value;
    } else if (navigationResult.body && Object.keys(navigationResult.body).length > 0) {
      context[prop] = navigationResult.body;
    }
    this.prevCtrl = oldPrevCtrl;
    this.ctrl = oldCtrl;
  }

  private __enableStreaming(part: NavigationPart) {
    this.streamEnabled = part == this.resourcePath.navigation[this.resourcePath.navigation.length - 1] ||
      (this.resourcePath.navigation[this.resourcePath.navigation.indexOf(part) + 1] &&
        this.resourcePath.navigation[this.resourcePath.navigation.indexOf(part) + 1].name == '$value');
    if (!this.streamEnabled) {
      this.resultCount = 0;
    }
  }

  /**
   * inject params
   *
   * @param container
   * @param name
   * @param params
   * @param queryString
   * @param result
   * @param include
   */
  private async __applyParams(container: any, name: string, params: any, queryString?: string | Token, result?: any, include?) {
    const ic = await this.container.createSubContainer();

    // >> get parameters name in method
    const queryParam = odata.getQueryParameter(container, name);
    const filterParam = odata.getFilterParameter(container, name);
    const contextParam = odata.getContextParameter(container, name);
    const streamParam = odata.getStreamParameter(container, name);
    const resultParam = odata.getResultParameter(container, name);
    const idParam = odata.getIdParameter(container, name);
    const bodyParam = odata.getBodyParameter(container, name);
    const typeParam = odata.getTypeParameter(container, name);
    const txContextParam = odata.getTxContextParameter(container, name);
    const injectContainerParam = odata.getInjectContainerParameter(container, name);

    const elementType = result?.elementType || this.ctrl?.prototype?.elementType || null;

    if (queryParam) {

      let queryAst = queryString || this.resourcePath?.ast?.value?.query || null;

      if (typeof queryAst == 'string') {
        queryAst = this.serverType.parser.query(queryAst, {
          // metadata: this.resourcePath.ast.metadata || this.serverType.$metadata().edmx
        });

        if (!include) {
          // if query string are deep equal, do not merge, avoid duplicate items
          if (queryString != this.resourcePath?.ast?.value?.query?.raw) {
            queryAst = deepmerge(queryAst, this.resourcePath.ast.value.query || {});
          }
        }

        const lastNavigationPath = this.resourcePath.navigation[this.resourcePath.navigation.length - 1];
        const queryType = lastNavigationPath.type == 'QualifiedEntityTypeName' ?
          this.resourcePath.navigation[this.resourcePath.navigation.length - 1].node[ODATA_TYPE] :
          (result || this.ctrl.prototype).elementType;
        await new ResourcePathVisitor(this.serverType, this.entitySets).Visit(<Token>queryAst, {}, queryType);
      }
      params[queryParam] = this.serverType.connector ? this.serverType.connector.createQuery(queryAst, elementType) : queryAst;

      if (container.prototype instanceof ODataControllerBase) {
        const validator = (<typeof ODataControllerBase>container).validator;
        if (validator) {
          validator(params[queryParam]);
        }
      }
      ic.registerInstance(InjectKey.ODataQueryParameter, params[queryParam]);
    }


    let filterAst = queryString;
    const resourceFilterAst = findOne(this.resourcePath?.ast?.value?.query, TokenType.Filter);

    if (typeof filterAst == 'string') {
      // @ts-ignore
      filterAst = qs.parse(filterAst).$filter;
      if (typeof filterAst == 'string') {
        filterAst = this.serverType.parser.filter(filterAst, {
          // metadata: this.resourcePath.ast.metadata || this.serverType.$metadata().edmx
        });
        const lastNavigationPath = this.resourcePath.navigation[this.resourcePath.navigation.length - 1];
        const queryType = lastNavigationPath.type == 'QualifiedEntityTypeName' ?
          this.resourcePath.navigation[this.resourcePath.navigation.length - 1].node[ODATA_TYPE] :
          (result || this.ctrl.prototype).elementType;
        await new ResourcePathVisitor(this.serverType, this.entitySets).Visit(<Token>filterAst, {}, queryType);
      }
    } else {
      const token = <Token>queryString;
      filterAst = findOne(token, TokenType.Filter);
    }

    if (filterAst && !include) {
      // if filter string are deep equal, do not merge, avoid duplicate items
      if (filterAst?.raw != resourceFilterAst?.raw) {
        filterAst = deepmerge(filterAst, (resourceFilterAst || {}).value || {});
      }
    }

    if (filterParam) {
      params[filterParam] = this.serverType.connector ? this.serverType.connector.createFilter(filterAst, elementType) : filterAst;
      if (container.prototype instanceof ODataControllerBase) {
        const validator = (<typeof ODataControllerBase>container).validator;
        if (validator) {
          validator(params[filterParam]);
        }
      }
    }

    ic.registerInstance(InjectKey.ODataFilterParameter, this.serverType.connector ? this.serverType.connector.createFilter(filterAst, elementType) : filterAst);


    if (contextParam) {
      params[contextParam] = this.context;
    }
    ic.registerInstance(InjectKey.ODataContextParameter, this.context);

    if (txContextParam) {
      params[txContextParam] = this.context?.tx;
    }

    ic.registerInstance(InjectKey.ODataTxContextParameter, this.context?.tx);

    if (streamParam) {
      params[streamParam] = include ? include.stream : this;
    }

    ic.registerInstance(InjectKey.ODataStreamParameter, include ? include.stream : this);

    if (resultParam) {
      params[resultParam] = result instanceof ODataResult ? result.body : result;
    }

    ic.registerInstance(
      InjectKey.ODataResultParameter,
      result instanceof ODataResult ? result.body : result
    );

    if (idParam) {
      params[idParam] = decodeURI(this.resourcePath.id || this.body['@odata.id']);
    }

    if (this.resourcePath || this.body) {
      ic.registerInstance(
        InjectKey.ODataIdParameter,
        decodeURI(get(this, 'resourcePath.id') || get(this, ['body', '@odata.id'])));
    }

    if (bodyParam && !params[bodyParam]) {
      params[bodyParam] = this.body;
    }

    ic.registerInstance(InjectKey.ODataBodyParameter, this.body);

    if (typeParam) {
      params[typeParam] = params[typeParam] || elementType;
    }

    ic.registerInstance(InjectKey.ODataTypeParameter, params[typeParam] || elementType, true);

    if (injectContainerParam) {
      params[injectContainerParam] = ic;
    }

    ic.registerInstance(InjectKey.ODataInjectContainer, ic);


    return ic;

  }

  async execute(body?: any): Promise<ODataResult> {
    this.body = body;
    let next = await this.workflow.shift().call(this, body);
    while (this.workflow.length > 0) {
      next = await this.workflow.shift().call(this, next);
    }
    return next;
  }

}
