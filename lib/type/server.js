"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTypedODataServer = exports.TypedODataServer = void 0;
// @ts-nocheck
const inject_1 = require("@newdash/inject");
const newdash_1 = require("@newdash/newdash");
const uniq_1 = require("@newdash/newdash/uniq");
const typeorm_1 = require("typeorm");
const _1 = require(".");
const __1 = require("..");
const constants_1 = require("../constants");
const error_1 = require("../error");
const logger_1 = require("../logger");
const server_1 = require("../server");
const transaction_1 = require("../transaction");
const db_helper_1 = require("./db_helper");
const decorators_1 = require("./decorators");
const entity_1 = require("./entity");
const hooks_1 = require("./hooks");
const service_1 = require("./service");
const logger = logger_1.createLogger('type:server');
/**
 * typed odata server
 */
class TypedODataServer extends server_1.ODataServer {
    /**
     * get service instance for entity
     *
     * @internal
     * @param entityType entity type of service
     */
    static async getService(entityType) {
        return this.getControllerInstance(entityType);
    }
    ;
    static async getServicesWithContext(tx, ...entityTypes) {
        const ic = await this.getInjectContainer().createSubContainer();
        ic.registerInstance(constants_1.InjectKey.ODataTxContextParameter, tx);
        const services = await Promise.all(entityTypes.map(async (entityType) => {
            const innerContainer = await ic.createSubContainer();
            innerContainer.registerInstance(constants_1.InjectKey.ODataTypeParameter, entityType, true);
            return innerContainer.wrap(await this.getControllerInstance(entityType));
        }));
        return services;
    }
    ;
    /**
     * get service instance with transaction context for specific entity
     *
     * @external
     * @param entityTypes entity types
     */
    static async getServicesWithNewContext(...entityTypes) {
        const tx = transaction_1.createTransactionContext();
        const services = await this.getServicesWithContext(tx, ...entityTypes);
        return { services, tx };
    }
    ;
    /**
     * get server owned connection
     */
    static getConnection() {
        throw new error_1.ServerInternalError('Not implemented');
    }
}
exports.TypedODataServer = TypedODataServer;
TypedODataServer.variant = constants_1.ServerType.typed;
async function createTypedODataServer(connection, ...configurations) {
    return new Promise((resolve, reject) => {
        // run in next loop, wait all module load finished
        // to allow cycle reference on 'entity types' works fine
        setTimeout(async () => {
            try {
                let connName = 'default';
                let connOpt = undefined;
                let connObj = undefined;
                if (connection instanceof Promise) {
                    connection = await connection;
                }
                switch (typeof connection) {
                    case 'object':
                        if (connection instanceof typeorm_1.Connection) {
                            connObj = connection;
                        }
                        else {
                            connObj = await typeorm_1.createConnection(connection);
                        }
                        break;
                    case 'string':
                        connObj = typeorm_1.getConnection(connection);
                        break;
                    default:
                        throw new Error(`not supported initialized parameter [connection] for create odata server`);
                }
                connName = connObj.name;
                connOpt = connObj.driver.options;
                configurations = uniq_1.uniq(newdash_1.concat(configurations, connOpt.entities));
                const dbHelper = db_helper_1.createDBHelper(connOpt);
                logger(`create typed odata server with connection name: %s`, connName);
                const serverType = class extends TypedODataServer {
                    static getConnection() { return connObj; }
                };
                const iContainer = serverType.getInjectContainer();
                iContainer.registerProvider(inject_1.createInstanceProvider(constants_1.InjectKey.GlobalConnection, connObj));
                iContainer.registerProvider(inject_1.createInstanceProvider(constants_1.InjectKey.DatabaseHelper, dbHelper));
                Object.defineProperty(serverType, 'name', { value: `TypedServerWithConn_${connName}` });
                configurations.filter((i) => Boolean(i)).forEach((configuration) => {
                    decorators_1.withODataServerType(serverType)(configuration);
                    decorators_1.withConnection(connName)(configuration);
                    if (configuration.prototype instanceof hooks_1.BaseHookProcessor || configuration instanceof hooks_1.BaseHookProcessor) {
                        logger(`load hook %s`, (configuration === null || configuration === void 0 ? void 0 : configuration.name) || 'Unknown hook');
                        hooks_1.withHook(configuration)(serverType);
                    }
                    else if (decorators_1.isODataEntityType(configuration) || decorators_1.isODataViewType(configuration)) {
                        const entityType = configuration;
                        let controllerType;
                        if (decorators_1.isODataEntityType(configuration)) {
                            logger(`load entity %s`, (configuration === null || configuration === void 0 ? void 0 : configuration.name) || 'Unknown entity');
                            entity_1.validateEntityType(entityType);
                            controllerType = class extends service_1.TypedService {
                                constructor() {
                                    super(...arguments);
                                    this.elementType = entityType;
                                }
                            };
                        }
                        else if (decorators_1.isODataViewType(configuration)) {
                            logger(`load view %s`, (configuration === null || configuration === void 0 ? void 0 : configuration.name) || 'Unknown entity');
                            controllerType = class extends _1.TypedViewService {
                                constructor() {
                                    super(...arguments);
                                    this.elementType = entityType;
                                }
                            };
                        }
                        const entitySetName = decorators_1.getODataEntitySetName(configuration);
                        // define controller name to use decorator
                        Object.defineProperty(controllerType, 'name', { value: `${entitySetName}Service` });
                        decorators_1.withODataServerType(serverType)(controllerType);
                        decorators_1.withEntityType(entityType)(controllerType);
                        decorators_1.withDBHelper(dbHelper)(controllerType);
                        // attach connection metadata
                        decorators_1.withConnection(connName)(controllerType);
                        // default public controller
                        __1.odata.withController(controllerType, entitySetName, configuration)(serverType);
                    }
                });
                resolve(serverType);
            }
            catch (error) {
                reject(error);
            }
        }, 0);
    });
}
exports.createTypedODataServer = createTypedODataServer;
//# sourceMappingURL=server.js.map