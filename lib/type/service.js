"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypedViewService = exports.ODataServiceProvider = exports.TypedService = void 0;
const tslib_1 = require("tslib");
// @ts-nocheck
const inject_1 = require("@newdash/inject");
const forEach_1 = require("@newdash/newdash/forEach");
const isArray_1 = require("@newdash/newdash/isArray");
const isEmpty_1 = require("@newdash/newdash/isEmpty");
const distance_1 = require("@newdash/newdash/string/distance");
const parser_1 = require("@odata/parser");
require("reflect-metadata");
const constants_1 = require("../constants");
const controller_1 = require("../controller");
const Edm = require("../edm");
const error_1 = require("../error");
const literal_1 = require("../literal");
const logger_1 = require("../logger");
const odata = require("../odata");
const decorators_1 = require("./decorators");
const entity_1 = require("./entity");
const hooks_1 = require("./hooks");
const validate_1 = require("./validate");
const logger = logger_1.createLogger('type:service');
/**
 * Typeorm Service (Controller)
 */
class TypedService extends controller_1.ODataController {
    constructor() { super(); }
    /**
     * get transactional connection
     *
     * @param ctx
     */
    async _getConnection(qr) {
        return qr.manager.connection;
    }
    async _getEntityManager(qr) {
        return qr.manager;
    }
    async _getRepository(entityType) {
        if (entityType instanceof Promise) {
            throw error_1.ServerInternalError('get repository for Promise object, please check server implementation.');
        }
        return (await this._getEntityManager()).getRepository(entityType !== null && entityType !== void 0 ? entityType : await this._getEntityType());
    }
    async _getService(entityType, ic, serverType) {
        ic.registerInstance(constants_1.InjectKey.ODataTypeParameter, entityType, true);
        const service = await serverType.getService(entityType);
        return ic.wrap(service);
    }
    ;
    async _getEntityType() {
        return inject_1.getUnProxyTarget(this.elementType);
    }
    async executeHooks(hookType, data, key, ic, tx) {
        const entityType = await this._getEntityType();
        ic = await ic.createSubContainer();
        const ctx = {
            hookType,
            key,
            ic,
            txContext: tx,
            entityType
        };
        if (data != undefined) {
            if (isArray_1.isArray(data)) {
                ctx.listData = data;
            }
            else {
                ctx.data = data;
            }
        }
        ctx.ic.registerInstance(constants_1.InjectKey.HookContext, ctx);
        if (ctx.hookType == undefined) {
            throw new error_1.ServerInternalError('Hook Type must be specify by controller');
        }
        ctx.getService = this._getService.bind(this);
        const isEvent = hooks_1.HookEvents.includes(ctx.hookType);
        if (isEvent) {
            delete ctx.txContext;
        }
        const serverType = decorators_1.getODataServerType(this.constructor);
        const hooks = hooks_1.findHooks(serverType, ctx.entityType, ctx.hookType);
        for (let idx = 0; idx < hooks.length; idx++) {
            const hook = ctx.ic.wrap(hooks[idx]);
            if (isEvent) {
                // is event, just trigger executor but not wait it finished
                // @ts-ignore
                hook.execute().catch(logger); // create transaction context here
            }
            else {
                // is hook, wait them executed
                // @ts-ignore
                await hook.execute();
            }
        }
    }
    /**
     * transform inbound payload
     *
     * please AVOID run this method for single body multi times
     */
    async _transformInboundPayload(body) {
        const entityType = await this._getEntityType();
        forEach_1.forEach(body, (value, key) => {
            const type = Edm.getType(entityType, key);
            if (type) {
                if (type === 'Edm.Decimal') {
                    body[key] = String(value);
                }
                else {
                    body[key] = literal_1.Literal.convert(type, value);
                }
            }
        });
    }
    /**
     * apply typeorm transformers, for read only
     *
     * (because the SQL query can not be processed in typeorm lifecycle)
     *
     * @private
     * @internal
     * @ignore
     *
     * @param body
     */
    async _applyTransforms(body) {
        const entityType = await this._getEntityType();
        const conn = await this._getConnection();
        const driver = conn.driver;
        const meta = conn.getMetadata(entityType);
        const columns = meta.columns;
        function applyTransformForItem(item) {
            columns.forEach((colMeta) => {
                const { propertyName, type } = colMeta;
                let value = item[propertyName];
                if (value != undefined) {
                    value = driver.prepareHydratedValue(value, colMeta);
                    if (type == 'decimal' && typeof value == 'number') {
                        // make all decimal value as string
                        value = String(value);
                    }
                    item[propertyName] = value;
                }
            });
        }
        if (isArray_1.isArray(body)) {
            for (let idx = 0; idx < body.length; idx++) {
                const item = body[idx];
                applyTransformForItem(item);
            }
        }
        else {
            applyTransformForItem(body);
        }
    }
    async findOne(key) {
        const entityType = await this._getEntityType();
        if (key != undefined && key != null) {
            // with key
            const repo = await this._getRepository();
            const data = await repo.findOne(key);
            if (isEmpty_1.isEmpty(data)) {
                throw new error_1.ResourceNotFoundError(`Resource not found: ${entityType === null || entityType === void 0 ? void 0 : entityType.name}[${key}]`);
            }
            await this.executeHooks(hooks_1.HookType.afterLoad, data);
            return data;
        }
        // without key, generally in navigation
        return {};
    }
    async createColumnMapper() {
        const entityType = await this._getEntityType();
        if (this._columnNameMappingStore == undefined) {
            this._columnNameMappingStore = new Map();
            const conn = await this._getConnection();
            const meta = conn.getMetadata(entityType);
            const columns = meta.columns;
            for (let idx = 0; idx < columns.length; idx++) {
                const column = columns[idx];
                this._columnNameMappingStore.set(column.propertyName, column.databaseName);
            }
        }
        return (propName) => this._columnNameMappingStore.get(propName);
    }
    async find(query, helper) {
        const entityType = await this._getEntityType();
        const conn = await this._getConnection();
        const repo = await this._getRepository();
        let data = [];
        if (query) {
            if (typeof query == 'string') {
                query = parser_1.defaultParser.query(query);
            }
            if (query instanceof parser_1.ODataQueryParam) {
                query = parser_1.defaultParser.query(query.toString());
            }
            if (query instanceof parser_1.ODataFilter) {
                query = parser_1.defaultParser.query(parser_1.param().filter(query).toString());
            }
            // optimize here
            const meta = conn.getMetadata(entityType);
            const schema = meta.schema;
            const tableName = meta.tableName;
            const colNameMapper = await this.createColumnMapper();
            const { queryStatement, countStatement } = helper.buildSQL({
                tableName,
                schema,
                query,
                colNameMapper
            });
            // query all ids firstly
            data = await repo.query(queryStatement);
            // apply transform
            await this._applyTransforms(data);
            // get counts if necessary
            if (countStatement) {
                const countResult = await repo.query(countStatement);
                let [{ TOTAL }] = countResult; // default count column name is 'TOTAL'
                // for mysql, maybe other db driver also will response string
                if (typeof TOTAL == 'string') {
                    TOTAL = parseInt(TOTAL);
                }
                data['inlinecount'] = TOTAL;
            }
        }
        else {
            data = await repo.find();
        }
        if (data.length > 0) {
            await this.executeHooks(hooks_1.HookType.afterLoad, data);
        }
        return data;
    }
    /**
     * deep insert
     *
     * @private
     * @ignore
     * @internal
     * @param parentBody
     * @param ctx
     *
     * @returns require the parent object re-save again
     */
    async _deepInsert(parentBody) {
        const entityType = await this._getEntityType();
        const repo = await this._getRepository(entityType);
        const instance = repo.create(parentBody);
        // creation (INSERT only)
        await repo.insert(instance);
        const navigations = decorators_1.getODataEntityNavigations(entityType.prototype);
        const [parentObjectKeyName] = Edm.getKeyProperties(entityType);
        const parentObjectKey = instance[parentObjectKeyName];
        for (const navigationName in navigations) {
            if (Object.prototype.hasOwnProperty.call(navigations, navigationName)) {
                if (Object.prototype.hasOwnProperty.call(parentBody, navigationName)) {
                    // if navigation property have value
                    const navigationData = parentBody[navigationName];
                    const options = navigations[navigationName];
                    const deepInsertElementType = options.entity();
                    const parentObjectFKName = options.foreignKey;
                    const navTargetFKName = options.targetForeignKey;
                    if (isEmpty_1.isEmpty(parentObjectFKName) && isEmpty_1.isEmpty(navTargetFKName)) {
                        throw new error_1.ServerInternalError(`fk is not defined on entity ${entityType.name} or ${deepInsertElementType.name}`);
                    }
                    const service = await this._getService(deepInsertElementType);
                    const [navTargetKeyName] = Edm.getKeyProperties(deepInsertElementType);
                    switch (options.type) {
                        case 'OneToMany':
                            if (isArray_1.isArray(navigationData)) {
                                parentBody[navigationName] = await Promise.all(navigationData.map((navigationItem) => {
                                    navigationItem[navTargetFKName] = parentObjectKey;
                                    return service.create(navigationItem);
                                }));
                            }
                            else {
                                // for one-to-many relationship, must provide an array, even only have one record
                                throw new error_1.ServerInternalError(`navigation property [${navigationName}] must be an array!`);
                            }
                            break;
                        case 'ManyToOne':
                            parentBody[navigationName] = await service.create(navigationData);
                            await repo.update(parentObjectKey, { [parentObjectFKName]: parentBody[navigationName][navTargetKeyName] });
                            break;
                        default:
                            if (navTargetFKName) {
                                navigationData[navTargetFKName] = parentBody[parentObjectKeyName];
                            }
                            parentBody[navigationName] = await service.create(navigationData);
                            if (parentObjectFKName) {
                                // save the fk to parent table
                                await repo.update(parentObjectKey, { [parentObjectFKName]: parentBody[navigationName][navTargetKeyName] });
                            }
                            break;
                    }
                }
            }
        }
        return instance;
    }
    /**
     * deep merge
     * @param parentBody
     * @param entityType
     */
    async _deepMerge(parentBody) {
        const entityType = await this._getEntityType();
        const navigations = decorators_1.getODataEntityNavigations(entityType.prototype);
        for (const navigationName in navigations) {
            if (Object.prototype.hasOwnProperty.call(navigations, navigationName)) {
                if (Object.prototype.hasOwnProperty.call(parentBody, navigationName)) {
                    throw new error_1.BadRequestError(`update navigation '${navigationName}' failed, deep merge is not supported.`);
                }
            }
        }
    }
    async create(body) {
        await this._validate(body, odata.ODataMethodType.POST); // validate raw payload firstly
        await this._transformInboundPayload(body);
        await this.executeHooks(hooks_1.HookType.beforeCreate, body);
        // deep insert, re-save on-demand
        const instance = await this._deepInsert(body);
        await this.executeHooks(hooks_1.HookType.afterCreate, instance);
        return instance;
    }
    async _validate(input, method = parser_1.ODataMethod.POST) {
        const entityType = await this._getEntityType();
        const entityName = entity_1.getClassName(entityType);
        const msgs = validate_1.applyValidate(entityType, input, method);
        const columns = Edm.getProperties(entityType);
        // ensure client provide all keys are defined in entity type
        for (const key of Object.keys(input)) {
            if (!columns.includes(key)) {
                msgs.push(`property/navigation '${key}' is not existed on EntityType(${entityName}), did you mean '${distance_1.closest(key, columns)}'?`);
            }
        }
        if (msgs.length > 0) {
            throw new error_1.BadRequestError(`Entity '${entityName}': ${msgs.join(', ')}`);
        }
    }
    // create or overwrite
    async save(key, body) {
        const repo = await this._getRepository();
        if (key) {
            const item = await repo.findOne(key);
            // if exist
            if (item) {
                return this.update(key, body);
            }
        }
        return this.create(body);
    }
    // odata patch will not response any content
    async update(key, body) {
        await this._validate(body, odata.ODataMethodType.PATCH);
        await this._transformInboundPayload(body);
        const repo = await this._getRepository();
        const instance = body;
        await this.executeHooks(hooks_1.HookType.beforeUpdate, instance, key);
        await repo.update(key, instance);
        await this.executeHooks(hooks_1.HookType.afterUpdate, instance, key);
    }
    // odata delete will not response any content
    async delete(key) {
        const repo = await this._getRepository();
        await this.executeHooks(hooks_1.HookType.beforeDelete, undefined, key);
        await repo.delete(key);
        await this.executeHooks(hooks_1.HookType.afterDelete, undefined, key);
    }
}
tslib_1.__decorate([
    tslib_1.__param(0, inject_1.inject(constants_1.InjectKey.TransactionQueryRunner)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], TypedService.prototype, "_getConnection", null);
tslib_1.__decorate([
    tslib_1.__param(0, inject_1.inject(constants_1.InjectKey.TransactionQueryRunner)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], TypedService.prototype, "_getEntityManager", null);
tslib_1.__decorate([
    tslib_1.__param(0, odata.type),
    tslib_1.__param(1, odata.injectContainer),
    tslib_1.__param(2, inject_1.inject(constants_1.InjectKey.ServerType)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof E !== "undefined" && E) === "function" ? _a : Object, inject_1.InjectContainer, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], TypedService.prototype, "_getService", null);
tslib_1.__decorate([
    tslib_1.__param(3, inject_1.inject(inject_1.InjectContainer)),
    tslib_1.__param(4, inject_1.inject(constants_1.InjectKey.RequestTransaction)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object, Object, inject_1.InjectContainer, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], TypedService.prototype, "executeHooks", null);
tslib_1.__decorate([
    odata.GET,
    tslib_1.__param(0, odata.key),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], TypedService.prototype, "findOne", null);
tslib_1.__decorate([
    inject_1.noWrap,
    tslib_1.__metadata("design:type", Map)
], TypedService.prototype, "_columnNameMappingStore", void 0);
tslib_1.__decorate([
    odata.GET,
    tslib_1.__param(0, odata.query),
    tslib_1.__param(1, inject_1.inject(constants_1.InjectKey.DatabaseHelper)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], TypedService.prototype, "find", null);
tslib_1.__decorate([
    odata.POST,
    tslib_1.__param(0, odata.body),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], TypedService.prototype, "create", null);
tslib_1.__decorate([
    odata.PUT,
    tslib_1.__param(0, odata.key), tslib_1.__param(1, odata.body),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], TypedService.prototype, "save", null);
tslib_1.__decorate([
    odata.PATCH,
    tslib_1.__param(0, odata.key), tslib_1.__param(1, odata.body),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], TypedService.prototype, "update", null);
tslib_1.__decorate([
    odata.DELETE,
    tslib_1.__param(0, odata.key),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], TypedService.prototype, "delete", null);
exports.TypedService = TypedService;
/**
 * provide odata service instance by entity
 */
class ODataServiceProvider {
    async provide(entityType, server, tx) {
        if (entityType instanceof inject_1.LazyRef) {
            entityType = entityType.getRef();
        }
        const [service] = await server.getServicesWithContext(tx, entityType);
        return service;
    }
}
tslib_1.__decorate([
    inject_1.transient,
    inject_1.withType(constants_1.InjectKey.InjectODataService),
    tslib_1.__param(0, inject_1.noWrap), tslib_1.__param(0, inject_1.required), tslib_1.__param(0, inject_1.inject(constants_1.InjectKey.ODataTypedService)),
    tslib_1.__param(1, inject_1.required), tslib_1.__param(1, inject_1.inject(constants_1.InjectKey.ServerType)),
    tslib_1.__param(2, inject_1.noWrap), tslib_1.__param(2, inject_1.required), tslib_1.__param(2, inject_1.inject(constants_1.InjectKey.ODataTxContextParameter)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ODataServiceProvider.prototype, "provide", null);
exports.ODataServiceProvider = ODataServiceProvider;
/**
 * Typeorm Service for view
 */
class TypedViewService extends TypedService {
    async delete(key) {
        throw new error_1.MethodNotAllowedError();
    }
    async update(key, body) {
        throw new error_1.MethodNotAllowedError();
    }
    async create(body) {
        throw new error_1.MethodNotAllowedError();
    }
    async findOne(key) {
        const entityType = this._getEntityType();
        const keys = Edm.getKeyProperties(entityType) || [];
        if (keys.length > 0) {
            return super.findOne(key);
        }
        throw new error_1.MethodNotAllowedError(`RETRIEVE is not supported for view entity which key is not defined.`);
    }
}
tslib_1.__decorate([
    tslib_1.__param(0, odata.key),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], TypedViewService.prototype, "delete", null);
tslib_1.__decorate([
    tslib_1.__param(0, odata.key), tslib_1.__param(1, odata.body),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], TypedViewService.prototype, "update", null);
tslib_1.__decorate([
    tslib_1.__param(0, odata.body),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], TypedViewService.prototype, "create", null);
tslib_1.__decorate([
    tslib_1.__param(0, odata.key),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], TypedViewService.prototype, "findOne", null);
exports.TypedViewService = TypedViewService;
//# sourceMappingURL=service.js.map