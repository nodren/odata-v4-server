"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createODataServer = exports.ODataServer = exports.ODataServerBase = void 0;
const inject_1 = require("@newdash/inject");
const metadata_1 = require("@odata/metadata");
const parser_1 = require("@odata/parser");
const bodyParser = require("body-parser");
const cors = require("cors");
const express = require("express");
const stream_1 = require("stream");
const swaggerUi = require("swagger-ui-express");
const constants_1 = require("./constants");
const controller_1 = require("./controller");
const edm_1 = require("./edm");
const metadata_2 = require("./metadata");
const middlewares_1 = require("./middlewares");
const odata = require("./odata");
// eslint-disable-next-line no-duplicate-imports
const odata_1 = require("./odata");
const processor_1 = require("./processor");
const transaction_1 = require("./transaction");
const type_1 = require("./type");
/**
 * ODataServer base class to be extended by concrete OData Server data sources
 **/
class ODataServerBase {
    static async execute(url, method, body) {
        // format context
        let context = {};
        if (typeof url == 'object') {
            context = Object.assign(context, url);
            if (typeof method == 'object') {
                body = method;
            }
            url = undefined;
            method = undefined;
        }
        else if (typeof url == 'string') {
            context.url = url;
            if (typeof method == 'object') {
                body = method;
                method = 'POST';
            }
            context.method = method || 'GET';
        }
        context.method = context.method || 'GET';
        context.request = context.request || body;
        const txContext = transaction_1.createTransactionContext();
        try {
            const processor = await this.createProcessor(context, {
                objectMode: true,
                metadata: context.metadata || processor_1.ODataMetadataType.minimal
            });
            const values = [];
            let flushObject;
            let response = '';
            if (context.response instanceof stream_1.Writable) {
                processor.pipe(context.response);
            }
            processor.on('data', (chunk) => {
                if (!(typeof chunk == 'string' || chunk instanceof Buffer)) {
                    if (chunk['@odata.context'] && chunk.value && Array.isArray(chunk.value) && chunk.value.length == 0) {
                        flushObject = chunk;
                        flushObject.value = values;
                    }
                    else {
                        values.push(chunk);
                    }
                }
                else {
                    response += chunk.toString();
                }
            });
            // @ts-ignore
            const result = await processor.execute(context.body || body);
            if (flushObject) {
                result.body = flushObject;
                if (!result.elementType || typeof result.elementType == 'object') {
                    result.elementType = flushObject.elementType;
                }
                delete flushObject.elementType;
                result.contentType = result.contentType || 'application/json';
            }
            else if (result && response) {
                result.body = response;
            }
            await transaction_1.commitTransaction(txContext);
            return result;
        }
        catch (error) {
            await transaction_1.rollbackTransaction(txContext);
            throw error;
        }
    }
    static getInjectContainer() {
        if (this._injectContainer == undefined) {
            this._injectContainer = inject_1.InjectContainer.New();
            this._injectContainer.registerInstance(constants_1.InjectKey.ServerType, this);
            this._injectContainer.registerProvider(transaction_1.TransactionQueryRunnerProvider);
            this._injectContainer.registerProvider(transaction_1.TransactionConnectionProvider);
            this._injectContainer.registerProvider(type_1.ODataServiceProvider);
            this._injectContainer.doNotWrap(constants_1.InjectKey.ServerType, constants_1.InjectKey.TransactionQueryRunner, constants_1.InjectKey.TransactionConnection, constants_1.InjectKey.ProcessorOption, constants_1.InjectKey.RequestContext, constants_1.InjectKey.Response, constants_1.InjectKey.ODataBodyParameter, constants_1.InjectKey.ODataQueryParameter, constants_1.InjectKey.GlobalConnection, constants_1.InjectKey.ODataTypeParameter, constants_1.InjectKey.DatabaseHelper);
        }
        return this._injectContainer;
    }
    static async createProcessor(context, options) {
        const requestContainer = await this.getInjectContainer().createSubContainer();
        requestContainer.registerInstance(constants_1.InjectKey.RequestContext, context);
        requestContainer.registerInstance(constants_1.InjectKey.ProcessorOption, options);
        return requestContainer.getInstance(processor_1.ODataProcessor);
    }
    static $metadata(metadata) {
        if (metadata) {
            if (!(metadata instanceof metadata_1.Edm.Edmx)) {
                if (metadata.version && metadata.dataServices && Array.isArray(metadata.dataServices.schema)) {
                    this._metadataCache = metadata_1.ServiceMetadata.processMetadataJson(metadata);
                }
                else {
                    this._metadataCache = metadata_1.ServiceMetadata.defineEntities(metadata);
                }
            }
        }
        return this._metadataCache || (this._metadataCache = metadata_1.ServiceMetadata.processMetadataJson(metadata_2.createMetadataJSON(this)));
    }
    static document() {
        return metadata_1.ServiceDocument.processEdmx(this.$metadata().edmx);
    }
    static addController(controller, entitySetName, elementType) {
        odata.controller(controller, entitySetName, elementType)(this);
    }
    static getController(elementType) {
        var _a;
        for (const i in this.prototype) {
            const prop = this.prototype[i];
            if ((prop === null || prop === void 0 ? void 0 : prop.prototype) instanceof controller_1.ODataController && ((_a = prop === null || prop === void 0 ? void 0 : prop.prototype) === null || _a === void 0 ? void 0 : _a.elementType) == elementType) {
                return prop;
            }
        }
        return null;
    }
    static create(path, port, hostname) {
        var _a;
        const server = this;
        const router = express.Router();
        router.use(middlewares_1.withODataVersionVerify);
        router.use(bodyParser.json());
        if (server.cors) {
            router.use(cors());
        }
        router.use(middlewares_1.withODataHeader);
        router.get('/', middlewares_1.ensureODataHeaders, (req, _, next) => {
            next();
        }, server.document().requestHandler());
        router.get('/\\$metadata', server.$metadata().requestHandler());
        // enable swagger ui
        router.use('/api-docs', middlewares_1.withSwaggerDocument(server.$metadata()), swaggerUi.serve, swaggerUi.setup());
        // $batch request handler
        router.post('/\\$batch', middlewares_1.withODataBatchRequestHandler(this));
        // simple single request handler
        router.use(middlewares_1.withODataRequestHandler(this));
        router.use(middlewares_1.withODataErrorHandler);
        if (typeof path == 'number') {
            if (typeof port == 'string') {
                hostname = `${port}`;
            }
            port = parseInt(path, 10);
            path = undefined;
        }
        if (typeof port == 'number') {
            const app = express();
            app.use((_a = path) !== null && _a !== void 0 ? _a : '/', router);
            return app.listen(port, hostname);
        }
        return router;
    }
    static async getControllerInstance(controllerOrEntityType) {
        const ic = await this._injectContainer.createSubContainer();
        if (controllerOrEntityType == undefined) {
            throw new Error('must provide the controller type');
        }
        let serviceType = undefined;
        if (controllerOrEntityType.prototype instanceof controller_1.ODataController) {
            // if controller
            serviceType = controllerOrEntityType;
        }
        else {
            // if entity
            ic.registerInstance(constants_1.InjectKey.ODataTypeParameter, controllerOrEntityType);
            serviceType = this.getController(controllerOrEntityType);
        }
        if (serviceType == undefined) {
            throw new TypeError(`${controllerOrEntityType === null || controllerOrEntityType === void 0 ? void 0 : controllerOrEntityType.name} is not a controller or entity type.`);
        }
        return ic.getInstance(serviceType);
    }
}
exports.ODataServerBase = ODataServerBase;
ODataServerBase.variant = constants_1.ServerType.base;
ODataServerBase.container = new edm_1.ContainerBase();
ODataServerBase.parser = parser_1.defaultParser;
ODataServerBase.errorHandler = middlewares_1.withODataErrorHandler;
class ODataServer extends odata_1.ODataBase(ODataServerBase) {
}
exports.ODataServer = ODataServer;
/** Create Express server for OData Server
 * @param server   OData Server instance
 * @param path     routing path for Express
 * @param port     port number for Express to listen to
 * @param hostname hostname for Express
 * @return         Express Router object
 */
function createODataServer(server, path, port, hostname) {
    return server.create(path, port, hostname);
}
exports.createODataServer = createODataServer;
//# sourceMappingURL=server.js.map