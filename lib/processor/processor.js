"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ODataProcessor = exports.ODataMetadataType = exports.ODataGeneratorHandlers = exports.ODataRequestMethods = void 0;
const tslib_1 = require("tslib");
// @ts-nocheck
const inject_1 = require("@newdash/inject");
const get_1 = require("@newdash/newdash/get");
const isEmpty_1 = require("@newdash/newdash/isEmpty");
const isUndefined_1 = require("@newdash/newdash/isUndefined");
const parser_1 = require("@odata/parser");
const lexer_1 = require("@odata/parser/lib/lexer");
const utils_1 = require("@odata/parser/lib/utils");
const deepmerge = require("deepmerge");
const qs = require("qs");
const stream_1 = require("stream");
const url = require("url");
const util = require("util");
const constants_1 = require("../constants");
const controller_1 = require("../controller");
const Edm = require("../edm");
const error_1 = require("../error");
const logger_1 = require("../logger");
const odata = require("../odata");
const result_1 = require("../result");
const type_1 = require("../type");
const utils_2 = require("../utils");
const visitor_1 = require("../visitor");
const fnCaller_1 = require("./fnCaller");
const getODataRoot_1 = require("./getODataRoot");
const logger = logger_1.createLogger('processor');
const createODataContext = function (context, entitySets, server, resourcePath, processor) {
    const odataContextBase = `${getODataRoot_1.getODataRoot(context)}/$metadata#`;
    let odataContext = '';
    let prevResource = null;
    let prevType = server;
    let selectContext = '';
    if (processor.query && processor.query.$select) {
        selectContext = `(${processor.query.$select})`;
    }
    resourcePath.navigation.forEach((baseResource, i) => {
        const next = resourcePath.navigation[i + 1];
        const selectContextPart = (i == resourcePath.navigation.length - 1) ? selectContext : '';
        if (next && next.type == lexer_1.TokenType.RefExpression) {
            return;
        }
        if (baseResource.type == lexer_1.TokenType.QualifiedEntityTypeName || baseResource.type == lexer_1.TokenType.QualifiedComplexTypeName) {
            return odataContext += `/${baseResource.name}`;
        }
        if (baseResource.type == lexer_1.TokenType.EntitySetName) {
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
        }
        else if (getResourcePartFunction(baseResource.type) && !(baseResource.name in expCalls)) {
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
                }
                else {
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
            }
            else {
                returnType = returnTypeName;
            }
            return odataContext += returnType;
        }
        if (baseResource.type == lexer_1.TokenType.EntityCollectionNavigationProperty) {
            prevResource = baseResource;
            odataContext += `/${baseResource.name}`;
            prevType = baseResource.key ? Edm.getType(prevType, baseResource.name, server.container) : server.getController(Edm.getType(prevType, baseResource.name, server.container));
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
        if (baseResource.type == lexer_1.TokenType.EntityNavigationProperty) {
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
        if (baseResource.type == lexer_1.TokenType.PrimitiveProperty ||
            baseResource.type == lexer_1.TokenType.PrimitiveCollectionProperty ||
            baseResource.type == lexer_1.TokenType.ComplexProperty ||
            baseResource.type == lexer_1.TokenType.ComplexCollectionProperty) {
            prevType = Edm.getType(prevType, baseResource.name, server.container);
            return odataContext += `/${baseResource.name}`;
        }
    });
    return odataContextBase + odataContext;
};
exports.ODataRequestMethods = [
    'get',
    'post',
    'put',
    'patch',
    'delete'
];
const ODataRequestResult = {
    get: result_1.ODataResult.Ok,
    post: result_1.ODataResult.Created,
    put: (result, contentType) => (result ? result_1.ODataResult.Created : result_1.ODataResult.NoContent)(result, contentType),
    patch: result_1.ODataResult.NoContent,
    delete: result_1.ODataResult.NoContent
};
const expCalls = {
    $count() {
        return this.body && this.body.value ? (this.body.value.length || 0) : 0;
    },
    async $value(processor) {
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
                }
                else {
                    for (let i = 0; i < fnDesc.key.length; i++) {
                        if (fnDesc.key[i].to != fnDesc.key[i].from) {
                            params[fnDesc.key[i].to] = params[fnDesc.key[i].from];
                            delete params[fnDesc.key[i].from];
                        }
                    }
                }
                let currentResult = fnCaller_1.fnCaller(ctrl, fn, params);
                if (utils_2.isIterator(fn)) {
                    currentResult = run(currentResult, defaultHandlers);
                }
                if (!utils_2.isPromise(currentResult)) {
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
                result = result.value || result;
                if (typeof result == 'object' && (prevPart.type == 'PrimitiveProperty' || prevPart.type == 'PrimitiveKeyProperty')) {
                    return Promise.resolve(result.toString());
                }
                return Promise.resolve(result);
            }
        }
        catch (err) {
            return Promise.reject(err);
        }
    },
    async $ref(processor) {
        try {
            const prevPart = processor.resourcePath.navigation[processor.resourcePath.navigation.length - 2];
            const routePart = processor.resourcePath.navigation[processor.resourcePath.navigation.length - 3];
            let fn = odata.findODataMethod(processor.prevCtrl, `${processor.method}/${prevPart.name}/$ref`, routePart.key || []);
            if (processor.method == 'get') {
                return {
                    '@odata.context': `${getODataRoot_1.getODataRoot(processor.context)}/$metadata#$ref`,
                    '@odata.id': `${this.body['@odata.id']}/${prevPart.name}`
                };
            }
            if (!fn) {
                throw new error_1.ResourceNotFoundError();
            }
            let linkUrl = (processor.resourcePath.id || (processor.body || {})['@odata.id'] || '').replace(getODataRoot_1.getODataRoot(processor.context), '');
            let linkAst, linkPath, linkPart;
            if (linkUrl) {
                linkUrl = decodeURIComponent(linkUrl);
                processor.emit('header', { 'OData-EntityId': linkUrl });
                linkAst = processor.serverType.parser.odataUri(linkUrl, {
                    metadata: processor.serverType.$metadata().edmx
                });
                linkPath = await new visitor_1.ResourcePathVisitor(processor.serverType, processor.entitySets).Visit(linkAst);
                linkPart = linkPath.navigation[linkPath.navigation.length - 1];
            }
            else {
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
            }
            else {
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
            }
            else {
                for (let i = 0; i < fnDesc.link.length; i++) {
                    params[fnDesc.link[i].to] = linkParams[fnDesc.link[i].from];
                }
            }
            let currentResult = fnCaller_1.fnCaller(ctrl, fn, params);
            if (utils_2.isIterator(fn)) {
                currentResult = run(currentResult, defaultHandlers);
            }
            if (!utils_2.isPromise(currentResult)) {
                currentResult = Promise.resolve(currentResult);
            }
            return currentResult;
        }
        catch (err) {
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
var ODataGeneratorHandlers;
(function (ODataGeneratorHandlers) {
    function PromiseHandler(request, next) {
        if (utils_2.isPromise(request)) {
            return request.then(next);
        }
    }
    ODataGeneratorHandlers.PromiseHandler = PromiseHandler;
    function StreamHandler(request, next) {
        if (utils_2.isStream(request)) {
            return new Promise((resolve, reject) => {
                request.on('end', resolve);
                request.on('error', reject);
            }).then(next);
        }
    }
    ODataGeneratorHandlers.StreamHandler = StreamHandler;
    function GeneratorHandler(request, next) {
        if (utils_2.isIterator(request)) {
            return run(request(), defaultHandlers).then(next);
        }
    }
    ODataGeneratorHandlers.GeneratorHandler = GeneratorHandler;
})(ODataGeneratorHandlers = exports.ODataGeneratorHandlers || (exports.ODataGeneratorHandlers = {}));
const defaultHandlers = [
    ODataGeneratorHandlers.GeneratorHandler,
    ODataGeneratorHandlers.PromiseHandler,
    ODataGeneratorHandlers.StreamHandler
];
function run(iterator, handlers) {
    function id(x) {
        return x;
    }
    function iterate(value) {
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
class ODataStreamWrapper extends stream_1.Transform {
    constructor() {
        super({
            objectMode: true
        });
        this.buffer = [];
    }
    _transform(chunk, _, done) {
        this.buffer.push(chunk);
        if (typeof done == 'function') {
            done();
        }
    }
    _flush(done) {
        if (typeof done == 'function') {
            done();
        }
    }
    toPromise() {
        return new Promise((resolve, reject) => {
            this.on('finish', () => {
                resolve(this.buffer);
            });
            this.on('error', reject);
        });
    }
}
class StreamWrapper {
    constructor(value) {
        this.stream = value;
    }
}
var ODataMetadataType;
(function (ODataMetadataType) {
    ODataMetadataType[ODataMetadataType["minimal"] = 0] = "minimal";
    ODataMetadataType[ODataMetadataType["full"] = 1] = "full";
    ODataMetadataType[ODataMetadataType["none"] = 2] = "none";
})(ODataMetadataType = exports.ODataMetadataType || (exports.ODataMetadataType = {}));
let ODataProcessor = class ODataProcessor extends stream_1.Transform {
    constructor(context, server, options, ic) {
        super({
            objectMode: true
        });
        this.streamStart = false;
        this.streamEnabled = false;
        this.streamObject = false;
        this.streamEnd = false;
        this.resultCount = 0;
        this.context = context;
        this.serverType = server;
        this.options = options || {};
        const method = this.method = context.method.toLowerCase();
        if (!exports.ODataRequestMethods.includes(method)) {
            throw new error_1.MethodNotAllowedError();
        }
        context.url = decodeURIComponent(context.url);
        this.url = url.parse(context.url);
        this.query = qs.parse(this.url.query);
        let ast;
        try {
            ast = this.serverType.parser.odataUri(context.url, {
                metadata: this.serverType.$metadata().edmx
            });
        }
        catch (error) {
            logger(`parsing uri: %s failed.`, context.url);
            throw error;
        }
        if (this.serverType.validator) {
            this.serverType.validator(ast);
        }
        const entitySets = this.entitySets = odata.getPublicControllers(this.serverType);
        this.workflow = [
            async (body) => {
                const resourcePath = this.resourcePath = await new visitor_1.ResourcePathVisitor(this.serverType, this.entitySets).Visit(ast);
                this.odataContext = createODataContext(context, entitySets, server, resourcePath, this);
                if (resourcePath.navigation.length == 0) {
                    throw new error_1.ResourceNotFoundError(`Resource not found for '${ast.raw}'.`);
                }
                this.workflow.push(...resourcePath.navigation.map((part, i) => {
                    const next = resourcePath.navigation[i + 1];
                    if (next && next.type == lexer_1.TokenType.RefExpression) {
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
                        }
                        else {
                            this.emit('error', new error_1.ServerInternalError('instance created, but service logic not return the created instance id'));
                        }
                    }
                    return Promise.resolve(result);
                });
                return body;
            }
        ];
        this._initInjectContainer(ic);
    }
    _initInjectContainer(ic) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        if (this.container == undefined) {
            this.container = ic;
            this.container.registerInstance(constants_1.InjectKey.ODataTxContextParameter, (_a = this.context) === null || _a === void 0 ? void 0 : _a.tx);
            this.container.registerInstance(constants_1.InjectKey.RequestBody, (_c = (_b = this.context) === null || _b === void 0 ? void 0 : _b.request) === null || _c === void 0 ? void 0 : _c.body);
            this.container.registerInstance(constants_1.InjectKey.ODataInjectContainer, ic);
            this.container.registerInstance(constants_1.InjectKey.RequestMethod, (_e = (_d = this.context) === null || _d === void 0 ? void 0 : _d.request) === null || _e === void 0 ? void 0 : _e.method);
            this.container.registerInstance(constants_1.InjectKey.RequestEntityType, this.elementType);
            this.container.registerInstance(constants_1.InjectKey.RequestTxId, (_g = (_f = this.context) === null || _f === void 0 ? void 0 : _f.tx) === null || _g === void 0 ? void 0 : _g.uuid);
            this.container.registerInstance(constants_1.InjectKey.Request, (_h = this.context) === null || _h === void 0 ? void 0 : _h.response);
            this.container.registerInstance(constants_1.InjectKey.Response, (_j = this.context) === null || _j === void 0 ? void 0 : _j.request);
        }
    }
    _transform(chunk, _, done) {
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
                }
                else if (!this.options.objectMode && this.resultCount > 0) {
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
                    }
                    else {
                        this.push(JSON.stringify(chunk));
                        this.resultCount++;
                        if (typeof done == 'function') {
                            done();
                        }
                    }
                }
                catch (err) {
                    console.log(err);
                    if (typeof done == 'function') {
                        done(err);
                    }
                }
            }
            else {
                this.streamStart = true;
                this.push(chunk);
                this.resultCount++;
                if (typeof done == 'function') {
                    done();
                }
            }
        }
        else {
            this.resultCount++;
            if (typeof done == 'function') {
                done();
            }
        }
    }
    _flush(done) {
        if (this.streamEnabled && this.streamObject) {
            if (this.options.objectMode) {
                const flushObject = {
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
            }
            else {
                if (this.streamStart) {
                    if (typeof this.streamInlineCount == 'number') {
                        this.push(`],"@odata.count":${this.streamInlineCount}}`);
                    }
                    else {
                        this.push(']}');
                    }
                }
                else {
                    if (this.options.metadata == ODataMetadataType.none) {
                        this.push('{"value":[]}');
                    }
                    else {
                        this.push(`{"@odata.context":"${this.odataContext}","value":[]}`);
                    }
                }
            }
        }
        else if (this.streamEnabled && !this.streamStart) {
            if (this.options.metadata == ODataMetadataType.none) {
                this.push('{"value":[]}');
            }
            else {
                this.push(`{"@odata.context":"${this.odataContext}","value":[]}`);
            }
        }
        this.streamEnd = true;
        if (typeof done == 'function') {
            done();
        }
    }
    __qualifiedTypeName(part) {
        return (result) => {
            result.elementType = part.node[visitor_1.ODATA_TYPE];
            return result;
        };
    }
    __EntityCollectionNavigationProperty(part) {
        return async (result) => {
            try {
                const resultType = result.elementType;
                if (isUndefined_1.isUndefined(resultType)) {
                    throw new error_1.ResourceNotFoundError();
                }
                const elementType = Edm.getType(resultType, part.name, this.serverType.container);
                const partIndex = this.resourcePath.navigation.indexOf(part);
                const method = writeMethods.indexOf(this.method) >= 0 && partIndex < this.resourcePath.navigation.length - 1
                    ? 'get'
                    : this.method;
                let fn = odata.findODataMethod(this.ctrl, `${method}/${part.name}`, part.key);
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
                    }
                    else {
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
            }
            catch (err) {
                return Promise.reject(err);
            }
        };
    }
    __EntityNavigationProperty(part) {
        return async (result) => {
            const resultType = result.elementType;
            const elementType = Edm.getType(resultType, part.name, this.serverType.container);
            const partIndex = this.resourcePath.navigation.indexOf(part);
            const method = writeMethods.indexOf(this.method) >= 0 && partIndex < this.resourcePath.navigation.length - 1
                ? 'get'
                : this.method;
            let fn = odata.findODataMethod(this.ctrl, `${method}/${part.name}`, part.key);
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
                }
                else {
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
            part.key = foreignKeys.map((key) => {
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
    __PrimitiveProperty(part) {
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
                }
                else {
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
                currentResult = fnCaller_1.fnCaller(ctrl, fn, params);
                if (utils_2.isIterator(fn)) {
                    currentResult = run(currentResult, defaultHandlers);
                }
                if (!utils_2.isPromise(currentResult)) {
                    currentResult = Promise.resolve(currentResult);
                }
            }
            else {
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
                if (value && (utils_2.isStream(value) || utils_2.isStream(value.stream))) {
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
            return result_1.ODataResult.NoContent(currentResult);
        };
    }
    async __read(ctrl, part, params, data, filter, elementType, include, select) {
        var _a;
        if (this.ctrl) {
            this.prevCtrl = this.ctrl;
        }
        else {
            this.prevCtrl = ctrl;
        }
        this.ctrl = ctrl;
        const method = writeMethods.indexOf(this.method) >= 0 &&
            this.resourcePath.navigation.indexOf(part) < this.resourcePath.navigation.length - 1
            ? 'get'
            : this.method;
        this.instance = await this.serverType.getControllerInstance(ctrl);
        let fn;
        let ic;
        if (typeof filter == 'string' || !filter) {
            // get metadata of method
            fn = odata.findODataMethod(ctrl, method, part.key);
            // not found method to process
            if (!fn) {
                throw new error_1.NotImplementedError();
            }
            let queryString = filter ? `$filter=${filter}` : (include || this.url).query;
            if (include && filter && include.query && !include.query.$filter) {
                include.query.$filter = filter;
                queryString = Object.keys(include.query).map((p) => `${p}=${include.query[p]}`).join('&');
            }
            else if ((include && filter && include.query) ||
                (!include && this.resourcePath.navigation.indexOf(part) == this.resourcePath.navigation.length - 1)) {
                const theQuery = (include !== null && include !== void 0 ? include : this).query;
                queryString = Object.keys(theQuery).map((p) => {
                    if (p === '$filter' && filter) {
                        return `${p}=(${theQuery[p]}) and (${filter})`;
                    }
                    return `${p}=${theQuery[p]}`;
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
                    ic.registerInstance(constants_1.InjectKey.ODataKeyParameters, params[fnDesc.key[0].to]);
                    delete params[part.key[0].name];
                }
                else {
                    for (let i = 0; i < fnDesc.key.length; i++) {
                        if (fnDesc.key[i].to != fnDesc.key[i].from) {
                            params[fnDesc.key[i].to] = params[fnDesc.key[i].from];
                            delete params[fnDesc.key[i].from];
                        }
                    }
                }
                // <<
            }
            else {
                ic = await this.__applyParams(ctrl, method, params, queryString, undefined, include);
            }
        }
        else {
            fn = filter;
        }
        if (!include) {
            this.__enableStreaming(part);
        }
        let currentResult;
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
                    params[typeParam] = ((_a = body['@odata.type']) !== null && _a !== void 0 ? _a : (`${ctrlInstance.elementType.namespace}.${ctrlInstance.elementType.name}`)).replace(/^#/, '');
                }
                if (bodyParam) {
                    await this.__deserialize(body, ctrl.prototype.elementType);
                    this.__stripOData(body);
                    params[bodyParam] = body;
                }
                if (!part.key) {
                    const properties = Edm.getProperties((elementType || ctrl.prototype.elementType).prototype);
                    properties.forEach((prop) => {
                        if (Edm.isKey(elementType || ctrl.prototype.elementType, prop)) {
                            params[prop] = (this.body || {})[prop] || ((data || {}).body || {})[prop];
                        }
                    });
                }
                break;
        }
        if (this.serverType.variant == constants_1.ServerType.typed && ic !== undefined) {
            const preferParams = fnCaller_1.fnCaller.getFnParam(fn, params);
            currentResult = await ic.injectExecute(ctrlInstance, fn, ...preferParams);
        }
        else {
            currentResult = fnCaller_1.fnCaller(ctrlInstance, fn, params);
        }
        if (utils_2.isIterator(fn)) {
            currentResult = run(currentResult, defaultHandlers);
        }
        if (!utils_2.isPromise(currentResult)) {
            currentResult = Promise.resolve(currentResult);
        }
        let result = await currentResult;
        if (utils_2.isStream(result) && include) {
            result = await include.streamPromise;
            result = await ODataRequestResult[method](result);
        }
        else if (utils_2.isStream(result) && (!part.key || !Edm.isMediaEntity(elementType || this.ctrl.prototype.elementType))) {
            return new Promise((resolve, reject) => {
                result.on('end', () => resolve(ODataRequestResult[method]()));
                result.on('error', reject);
            });
        }
        else if (!(result instanceof result_1.ODataResult)) {
            result = await ODataRequestResult[method](result);
            if (!this.streamStart && writeMethods.indexOf(this.method) < 0 && !result.body) {
                throw new error_1.ResourceNotFoundError();
            }
        }
        if (elementType) {
            result.elementType = elementType;
        }
        await this.__appendODataContext(result, elementType || this.ctrl.prototype.elementType, (include || this.resourcePath).includes, select);
        if (!this.streamEnd && this.streamEnabled && this.streamStart) {
            return new Promise((resolve) => {
                this.on('end', () => resolve(result));
            });
        }
        return result;
    }
    async __deserialize(obj, type) {
        for (const prop in obj) {
            try {
                const propType = Edm.getType(type, prop, this.serverType.container);
                const fn = Edm.getDeserializer(type, prop, propType, this.serverType.container);
                if (typeof fn == 'function') {
                    obj[prop] = await fn(obj[prop], prop, propType);
                }
                else if (typeof obj[prop] == 'object') {
                    await this.__deserialize(obj[prop], propType);
                }
            }
            catch (err) { }
        }
    }
    __stripOData(obj) {
        for (const prop in obj) {
            if (prop.indexOf('@odata') >= 0) {
                delete obj[prop];
            }
            if (typeof obj[prop] == 'object') {
                this.__stripOData(obj[prop]);
            }
        }
    }
    __EntitySetName(part) {
        const ctrl = this.entitySets[part.name];
        const params = {};
        if (part.key) {
            part.key.forEach((key) => params[key.name] = key.value);
        }
        return (data) => this.__read(ctrl, part, params, data, undefined, undefined, undefined, this.resourcePath.select);
    }
    __actionOrFunctionImport(part) {
        const fn = this.serverType.prototype[part.name];
        return async (data) => {
            this.__enableStreaming(part);
            const returnType = Edm.getReturnType(this.serverType, part.name, this.serverType.container);
            let isAction = false;
            const schemas = this.serverType.$metadata().edmx.dataServices.schemas;
            if (Edm.isActionImport(this.serverType, part.name) ||
                schemas.some((schema) => schema.entityContainer.some((container) => container.actionImports.some((actionImport) => actionImport.name == part.name)))) {
                isAction = true;
                part.params = Object.assign(part.params || {}, this.body || {});
            }
            await this.__applyParams(this.serverType, part.name, part.params);
            let result = fnCaller_1.fnCaller(data, fn, part.params);
            if (utils_2.isIterator(fn)) {
                result = run(result, defaultHandlers);
            }
            if (isAction && !returnType) {
                return result_1.ODataResult.NoContent(result);
            }
            result = await result_1.ODataResult.Ok(result);
            if (utils_2.isStream(result.body)) {
                return new Promise((resolve, reject) => {
                    result.body.on('end', resolve);
                    result.body.on('error', reject);
                });
            }
            await this.__appendODataContext(result, returnType, this.resourcePath.includes, this.resourcePath.select);
            return result;
        };
    }
    __actionOrFunction(part) {
        return (result) => new Promise(async (resolve, reject) => {
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
                let scope = this.serverType;
                let returnType = Object;
                let isAction = false;
                const schemas = this.serverType.$metadata().edmx.dataServices.schemas;
                let ic = undefined;
                // entity bound operation
                // e.g. POST /Teachers(1)/Default.addClass {payload}
                if (entityBoundOp) {
                    // use original result for typed odata model
                    if (this.serverType.variant == constants_1.ServerType.typed) {
                        scope = result.getOriginalResult();
                    }
                    else {
                        scope = result.body;
                    }
                    returnType = Edm.getReturnType(elementType, boundOpName, this.serverType.container);
                    if (Edm.isAction(elementType, boundOpName) ||
                        schemas.some((schema) => schema.actions.some((action) => action.name == boundOpName && action.isBound && action.parameters.some((parameter) => parameter.name == 'bindingParameter' && parameter.type == (`${elementType.namespace}.${elementType.name}`))))) {
                        isAction = true;
                        part.params = Object.assign(part.params || {}, this.body || {});
                    }
                    ic = await this.__applyParams(elementType, boundOpName, part.params, null, result);
                }
                else if (ctrlBoundOp) {
                    scope = this.instance;
                    returnType = Edm.getReturnType(this.ctrl, boundOpName, this.serverType.container);
                    if (Edm.isAction(elementType, boundOpName) ||
                        schemas.some((schema) => schema.actions.some((action) => action.name == boundOpName && action.isBound && action.parameters.some((parameter) => parameter.name == 'bindingParameter' && parameter.type == `Collection(${elementType.namespace}.${elementType.name})`)))) {
                        isAction = true;
                        part.params = Object.assign(part.params || {}, this.body || {});
                    }
                    ic = await this.__applyParams(this.ctrl, boundOpName, part.params, null, result);
                }
                else if (expOp) {
                    scope = result;
                    part.params['processor'] = this;
                }
                const boundOp = entityBoundOp || ctrlBoundOp || expOp;
                let opResult;
                if (this.serverType.variant == constants_1.ServerType.typed && ic !== undefined) {
                    const predefineParams = fnCaller_1.fnCaller.getFnParam(boundOp, part.params);
                    opResult = await ic.injectExecute(scope, boundOp, ...predefineParams);
                }
                else {
                    opResult = fnCaller_1.fnCaller(scope, boundOp, part.params);
                }
                if (utils_2.isIterator(boundOp)) {
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
                        }
                        else {
                            result_1.ODataResult.NoContent().then(resolve, reject);
                        }
                    }
                    else {
                        expResult = await expResult;
                        let rf;
                        if (boundOpName == '$ref' && this.method != 'get') {
                            rf = result_1.ODataResult.NoContent;
                        }
                        else {
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
                    resolve(await result_1.ODataResult.NoContent(opResult));
                }
                else {
                    const result = await result_1.ODataResult.Ok(opResult);
                    if (utils_2.isStream(result.body)) {
                        result.body.on('end', resolve);
                        result.body.on('error', reject);
                    }
                    else {
                        await this.__appendODataContext(result, returnType, this.resourcePath.includes, this.resourcePath.select);
                        if (typeof result.body.value == 'undefined') {
                            result.body.value = opResult;
                        }
                        resolve(result);
                    }
                }
            }
            catch (err) {
                reject(err);
            }
        });
    }
    async __appendLinks(ctrl, elementType, context, body, result) {
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
                    id = await Edm.escape(body[keys[0]], Edm.getTypeName(elementType, keys[0], this.serverType.container), Edm.getURLSerializer(elementType, keys[0], Edm.getType(elementType, keys[0], this.serverType.container), this.serverType.container));
                }
                else {
                    id = (await Promise.all(keys.map(async (it) => `${it}=${await Edm.escape(body[it], Edm.getTypeName(elementType, it, this.serverType.container), Edm.getURLSerializer(elementType, it, Edm.getType(elementType, it, this.serverType.container), this.serverType.container))}`))).join(',');
                }
            }
            catch (err) { }
        }
        if (entitySet && typeof id != 'undefined') {
            context['@odata.id'] = `${getODataRoot_1.getODataRoot(this.context)}/${entitySet}(${id})`;
            if (typeof elementType == 'function' && Edm.isMediaEntity(elementType)) {
                context['@odata.mediaReadLink'] = `${getODataRoot_1.getODataRoot(this.context)}/${entitySet}(${id})/$value`;
                if (odata.findODataMethod(ctrl, 'post/$value', [])) {
                    context['@odata.mediaEditLink'] = `${getODataRoot_1.getODataRoot(this.context)}/${entitySet}(${id})/$value`;
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
                context['@odata.editLink'] = `${getODataRoot_1.getODataRoot(this.context)}/${entitySet}(${id})`;
            }
        }
        else {
            if (typeof elementType == 'function' && Edm.isMediaEntity(elementType)) {
                context['@odata.mediaReadLink'] = `${getODataRoot_1.getODataRoot(this.context)}${this.context.url}(${id})/$value`;
                context['@odata.mediaReadLink'] = context['@odata.mediaReadLink'].replace(`(${id})(${id})`, `(${id})`);
                if (odata.findODataMethod(ctrl, 'post/$value', [])) {
                    context['@odata.mediaEditLink'] = `${getODataRoot_1.getODataRoot(this.context)}${this.context.url}(${id})/$value`;
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
                    context['@odata.editLink'] = `${getODataRoot_1.getODataRoot(this.context)}${this.context.url}(${id})`;
                    context['@odata.editLink'] = context['@odata.editLink'].replace(`(${id})(${id})`, `(${id})`);
                }
            }
        }
    }
    async __appendODataContext(result, ctrlType, includes, select) {
        if (typeof result.body == 'undefined') {
            return;
        }
        const context = {
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
                        }
                        else {
                            context.value[i] = entity;
                        }
                    })(entity, i)));
                }
                else {
                    if (ctrl) {
                        await this.__appendLinks(ctrl, elementType, context, result.body, result);
                    }
                    await this.__convertEntity(context, result.body, elementType, includes, select);
                }
            }
        }
        else if (typeof result.body != 'undefined' && result.body) {
            context.value = result.body;
        }
        result.body = context;
    }
    async __resolveAsync(type, prop, propValue, entity, converter) {
        if (typeof converter == 'function') {
            propValue = await converter(propValue, prop, type);
        }
        if (utils_2.isIterator(propValue)) {
            propValue = await run(propValue.call(entity), defaultHandlers);
        }
        if (typeof propValue == 'function') {
            propValue = propValue.call(entity);
        }
        if (utils_2.isPromise(propValue)) {
            propValue = await propValue;
        }
        if (type != 'Edm.Stream' && utils_2.isStream(propValue)) {
            const stream = new ODataStreamWrapper();
            propValue.pipe(stream);
            propValue = await stream.toPromise();
        }
        return propValue;
    }
    __setODataType(context, elementType) {
        const containerType = this.serverType.container.resolve(elementType);
        if (containerType) {
            context['@odata.type'] = `#${odata.getNamespace(Object.getPrototypeOf(this.serverType.container).constructor, containerType) || (this.serverType.container['namespace'] || elementType.namespace || this.serverType.namespace)}.${containerType}`;
        }
        else {
            context['@odata.type'] = `#${(elementType.namespace || this.serverType.namespace)}.${elementType.name}`;
        }
    }
    async __convertEntity(context, result, elementType, includes, select) {
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
                    if (nav.type == lexer_1.TokenType.EntityNavigationProperty || nav.type == lexer_1.TokenType.EntityCollectionNavigationProperty && !includes[nav.name]) {
                        includes[nav.name] = include;
                    }
                }
            }
        }
        if (props.length > 0) {
            const metadata = {};
            await Promise.all(props.map((prop) => (async (prop) => {
                const type = Edm.getType(elementType, prop, this.serverType.container);
                let itemType;
                if (typeof type == 'function' && !Edm.isTypeDefinition(elementType, prop)) {
                    itemType = function () { };
                    util.inherits(itemType, type);
                }
                const converter = Edm.getSerializer(elementType, prop, type, this.serverType.container) || Edm.getConverter(elementType, prop);
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
                        }
                        else if (typeof type == 'function' && !Edm.isTypeDefinition(elementType, prop)) {
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
                    }
                    else {
                        if (this.options.metadata == ODataMetadataType.full) {
                            if (Edm.isEntityType(elementType, prop)) {
                                if ((!includes || (includes && !includes[prop]))) {
                                    metadata[`${prop}@odata.associationLink`] = `${context['@odata.id']}/${prop}/$ref`;
                                    metadata[`${prop}@odata.navigationLink`] = `${context['@odata.id']}/${prop}`;
                                }
                            }
                            else if (type != 'Edm.String' && type != 'Edm.Boolean') {
                                let typeName = Edm.getTypeName(elementType, prop, this.serverType.container);
                                if (typeof type == 'string' && type.indexOf('Edm.') == 0) {
                                    typeName = typeName.replace(/Edm\./, '');
                                }
                                context[`${prop}@odata.type`] = `#${typeName}`;
                            }
                        }
                        if (includes && includes[prop]) {
                            await this.__include(includes[prop], (select || {})[prop], context, prop, ctrl, entity, elementType);
                        }
                        else if (typeof type == 'function' && propValue && !Edm.isTypeDefinition(elementType, prop)) {
                            context[prop] = new itemType();
                            await this.__convertEntity(context[prop], propValue, type, includes, (select || {})[prop]);
                        }
                        else if (type == 'Edm.Stream') {
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
                        }
                        else if (typeof propValue != 'undefined') {
                            context[prop] = propValue;
                        }
                    }
                }
            })(prop)));
            Object.assign(context, metadata);
        }
    }
    async __include(include, select, context, prop, ctrl, result, elementType) {
        const oldPrevCtrl = this.prevCtrl;
        const oldCtrl = this.ctrl;
        const isCollection = Edm.isCollection(elementType, include.navigationProperty);
        const navigationType = Edm.getType(elementType, include.navigationProperty, this.serverType.container);
        let navigationResult;
        if (typeof result[prop] == 'object') {
            navigationResult = await result_1.ODataResult.Ok(result[prop]);
            await this.__appendODataContext(navigationResult, navigationType, include.includes, select);
            ctrl = this.serverType.getController(navigationType);
        }
        else {
            const fn = odata.findODataMethod(ctrl, `get/${include.navigationProperty}`, []);
            const params = {};
            let stream, streamPromise;
            if (isCollection) {
                stream = include.stream = new ODataStreamWrapper();
                streamPromise = include.streamPromise = stream.toPromise();
            }
            if (fn) {
                await this.__applyParams(ctrl, fn.call, params, include.ast, result, include);
                const fnCall = ctrl.prototype[fn.call];
                let fnResult = fnCaller_1.fnCaller(ctrl, fnCall, params);
                if (utils_2.isIterator(fnCall)) {
                    fnResult = await run(fnResult, defaultHandlers);
                }
                if (utils_2.isPromise(fnResult)) {
                    fnResult = await fnResult;
                }
                if (isCollection && (utils_2.isStream(fnResult) || !fnResult || (stream && stream.buffer && stream.buffer.length > 0)) && stream && streamPromise) {
                    navigationResult = await result_1.ODataResult.Ok((await streamPromise) || []);
                }
                else {
                    navigationResult = await result_1.ODataResult.Ok(fnResult);
                }
                await this.__appendODataContext(navigationResult, navigationType, include.includes, select);
                ctrl = this.serverType.getController(navigationType);
            }
            else {
                ctrl = this.serverType.getController(navigationType);
                if (isCollection) {
                    const foreignKeys = Edm.getForeignKeys(elementType, include.navigationProperty);
                    const typeKeys = Edm.getKeyProperties(elementType);
                    result.foreignKeys = {};
                    const part = {};
                    const foreignFilter = (await Promise.all(foreignKeys.map(async (key) => {
                        result.foreignKeys[key] = result[typeKeys[0]];
                        return `${key} eq ${await Edm.escape(result[typeKeys[0]], Edm.getTypeName(navigationType, key, this.serverType.container))}`;
                    }))).join(' and ');
                    if (part.key) {
                        part.key.forEach((key) => params[key.name] = key.value);
                    }
                    navigationResult = await this.__read(ctrl, part, params, result, foreignFilter, navigationType, include, include.select);
                }
                else {
                    const foreignKeys = Edm.getForeignKeys(elementType, include.navigationProperty);
                    const part = {};
                    // enhanced logic for typed odata server
                    const nav = type_1.getODataNavigation(elementType, include.navigationProperty);
                    if ((nav === null || nav === void 0 ? void 0 : nav.type) == 'OneToOne' && !isEmpty_1.isEmpty(nav.targetForeignKey)) {
                        const [keyName] = Edm.getKeyProperties(elementType);
                        const foreignFilter = parser_1.ODataFilter.New().field(nav.targetForeignKey).eq(result[keyName]).toString();
                        navigationResult = await this.__read(ctrl, part, params, result, foreignFilter, navigationType, include, include.select);
                        const data = get_1.get(navigationResult, '_originalResult.value[0]');
                        if (!isUndefined_1.isUndefined(data)) {
                            navigationResult = await result_1.ODataResult.Ok(data);
                        }
                    }
                    else {
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
        }
        else if (navigationResult.body && Object.keys(navigationResult.body).length > 0) {
            context[prop] = navigationResult.body;
        }
        this.prevCtrl = oldPrevCtrl;
        this.ctrl = oldCtrl;
    }
    __enableStreaming(part) {
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
    async __applyParams(container, name, params, queryString, result, include) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
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
        const elementType = (result === null || result === void 0 ? void 0 : result.elementType) || ((_b = (_a = this.ctrl) === null || _a === void 0 ? void 0 : _a.prototype) === null || _b === void 0 ? void 0 : _b.elementType) || null;
        if (queryParam) {
            let queryAst = queryString || ((_e = (_d = (_c = this.resourcePath) === null || _c === void 0 ? void 0 : _c.ast) === null || _d === void 0 ? void 0 : _d.value) === null || _e === void 0 ? void 0 : _e.query) || null;
            if (typeof queryAst == 'string') {
                queryAst = this.serverType.parser.query(queryAst, {
                // metadata: this.resourcePath.ast.metadata || this.serverType.$metadata().edmx
                });
                if (!include) {
                    // if query string are deep equal, do not merge, avoid duplicate items
                    if (queryString != ((_j = (_h = (_g = (_f = this.resourcePath) === null || _f === void 0 ? void 0 : _f.ast) === null || _g === void 0 ? void 0 : _g.value) === null || _h === void 0 ? void 0 : _h.query) === null || _j === void 0 ? void 0 : _j.raw)) {
                        queryAst = deepmerge(queryAst, this.resourcePath.ast.value.query || {});
                    }
                }
                const lastNavigationPath = this.resourcePath.navigation[this.resourcePath.navigation.length - 1];
                const queryType = lastNavigationPath.type == 'QualifiedEntityTypeName' ?
                    this.resourcePath.navigation[this.resourcePath.navigation.length - 1].node[visitor_1.ODATA_TYPE] :
                    (result || this.ctrl.prototype).elementType;
                await new visitor_1.ResourcePathVisitor(this.serverType, this.entitySets).Visit(queryAst, {}, queryType);
            }
            params[queryParam] = this.serverType.connector ? this.serverType.connector.createQuery(queryAst, elementType) : queryAst;
            if (container.prototype instanceof controller_1.ODataControllerBase) {
                const validator = container.validator;
                if (validator) {
                    validator(params[queryParam]);
                }
            }
            ic.registerInstance(constants_1.InjectKey.ODataQueryParameter, params[queryParam]);
        }
        let filterAst = queryString;
        const resourceFilterAst = utils_1.findOne((_m = (_l = (_k = this.resourcePath) === null || _k === void 0 ? void 0 : _k.ast) === null || _l === void 0 ? void 0 : _l.value) === null || _m === void 0 ? void 0 : _m.query, lexer_1.TokenType.Filter);
        if (typeof filterAst == 'string') {
            // @ts-ignore
            filterAst = qs.parse(filterAst).$filter;
            if (typeof filterAst == 'string') {
                filterAst = this.serverType.parser.filter(filterAst, {
                // metadata: this.resourcePath.ast.metadata || this.serverType.$metadata().edmx
                });
                const lastNavigationPath = this.resourcePath.navigation[this.resourcePath.navigation.length - 1];
                const queryType = lastNavigationPath.type == 'QualifiedEntityTypeName' ?
                    this.resourcePath.navigation[this.resourcePath.navigation.length - 1].node[visitor_1.ODATA_TYPE] :
                    (result || this.ctrl.prototype).elementType;
                await new visitor_1.ResourcePathVisitor(this.serverType, this.entitySets).Visit(filterAst, {}, queryType);
            }
        }
        else {
            const token = queryString;
            filterAst = utils_1.findOne(token, lexer_1.TokenType.Filter);
        }
        if (filterAst && !include) {
            // if filter string are deep equal, do not merge, avoid duplicate items
            if ((filterAst === null || filterAst === void 0 ? void 0 : filterAst.raw) != (resourceFilterAst === null || resourceFilterAst === void 0 ? void 0 : resourceFilterAst.raw)) {
                filterAst = deepmerge(filterAst, (resourceFilterAst || {}).value || {});
            }
        }
        if (filterParam) {
            params[filterParam] = this.serverType.connector ? this.serverType.connector.createFilter(filterAst, elementType) : filterAst;
            if (container.prototype instanceof controller_1.ODataControllerBase) {
                const validator = container.validator;
                if (validator) {
                    validator(params[filterParam]);
                }
            }
        }
        ic.registerInstance(constants_1.InjectKey.ODataFilterParameter, this.serverType.connector ? this.serverType.connector.createFilter(filterAst, elementType) : filterAst);
        if (contextParam) {
            params[contextParam] = this.context;
        }
        ic.registerInstance(constants_1.InjectKey.ODataContextParameter, this.context);
        if (txContextParam) {
            params[txContextParam] = (_o = this.context) === null || _o === void 0 ? void 0 : _o.tx;
        }
        ic.registerInstance(constants_1.InjectKey.ODataTxContextParameter, (_p = this.context) === null || _p === void 0 ? void 0 : _p.tx);
        if (streamParam) {
            params[streamParam] = include ? include.stream : this;
        }
        ic.registerInstance(constants_1.InjectKey.ODataStreamParameter, include ? include.stream : this);
        if (resultParam) {
            params[resultParam] = result instanceof result_1.ODataResult ? result.body : result;
        }
        ic.registerInstance(constants_1.InjectKey.ODataResultParameter, result instanceof result_1.ODataResult ? result.body : result);
        if (idParam) {
            params[idParam] = decodeURI(this.resourcePath.id || this.body['@odata.id']);
        }
        if (this.resourcePath || this.body) {
            ic.registerInstance(constants_1.InjectKey.ODataIdParameter, decodeURI(get_1.get(this, 'resourcePath.id') || get_1.get(this, ['body', '@odata.id'])));
        }
        if (bodyParam && !params[bodyParam]) {
            params[bodyParam] = this.body;
        }
        ic.registerInstance(constants_1.InjectKey.ODataBodyParameter, this.body);
        if (typeParam) {
            params[typeParam] = params[typeParam] || elementType;
        }
        ic.registerInstance(constants_1.InjectKey.ODataTypeParameter, params[typeParam] || elementType, true);
        if (injectContainerParam) {
            params[injectContainerParam] = ic;
        }
        ic.registerInstance(constants_1.InjectKey.ODataInjectContainer, ic);
        return ic;
    }
    async execute(body) {
        this.body = body;
        let next = await this.workflow.shift().call(this, body);
        while (this.workflow.length > 0) {
            next = await this.workflow.shift().call(this, next);
        }
        return next;
    }
};
ODataProcessor = tslib_1.__decorate([
    tslib_1.__param(0, inject_1.inject(constants_1.InjectKey.RequestContext)),
    tslib_1.__param(1, inject_1.inject(constants_1.InjectKey.ServerType)),
    tslib_1.__param(2, inject_1.inject(constants_1.InjectKey.ProcessorOption)),
    tslib_1.__param(3, inject_1.inject(inject_1.InjectContainer)),
    tslib_1.__metadata("design:paramtypes", [Object, Object, Object, inject_1.InjectContainer])
], ODataProcessor);
exports.ODataProcessor = ODataProcessor;
//# sourceMappingURL=processor.js.map