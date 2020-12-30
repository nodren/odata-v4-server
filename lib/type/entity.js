"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEntityType = exports.isEntityHasProperty = exports.getClassName = exports.BaseODataModel = void 0;
const forEach_1 = require("@newdash/newdash/forEach");
const isFunction_1 = require("@newdash/newdash/isFunction");
const isUndefined_1 = require("@newdash/newdash/isUndefined");
const typeorm_1 = require("typeorm");
const edm_1 = require("../edm");
const error_1 = require("../error");
const transaction_1 = require("../transaction");
const decorators_1 = require("./decorators");
/**
 * @deprecated DO not use this, it will be removed
 */
class BaseODataModel {
    _getServerType() {
        // @ts-ignore
        return decorators_1.getODataServerType(this.constructor);
    }
    async _getService(entityType) {
        return this._getServerType().getService(entityType);
    }
    ;
    async _getConnection(ctx) {
        return (await this._getQueryRunner(ctx)).manager.connection;
    }
    async _getEntityManager(ctx) {
        return (await this._getQueryRunner(ctx)).manager;
    }
    async _getQueryRunner(ctx) {
        // @ts-ignore
        return transaction_1.getOrCreateTransaction(typeorm_1.getConnection(decorators_1.getConnectionName(this.constructor)), ctx);
    }
    async _getRepository(ctx, entity) {
        return (await this._getConnection(ctx)).getRepository(entity || this.constructor);
    }
}
exports.BaseODataModel = BaseODataModel;
function getClassName(type) {
    return type.name;
}
exports.getClassName = getClassName;
function isEntityHasProperty(entityType, propName) {
    const properties = edm_1.getProperties(entityType);
    return properties.includes(propName);
}
exports.isEntityHasProperty = isEntityHasProperty;
/**
 * validate entity type keys & foreign keys
 *
 * @param entityType
 */
function validateEntityType(entityType) {
    const entityName = getClassName(entityType);
    const keyNames = edm_1.getKeyProperties(entityType);
    if ((keyNames === null || keyNames === void 0 ? void 0 : keyNames.length) != 1) {
        throw new error_1.StartupError(`${entityName} must have one and only one key property.`);
    }
    const navigations = decorators_1.getODataEntityNavigations(entityType);
    forEach_1.default(navigations, (navOption, navPropName) => {
        const targetEntityType = isFunction_1.isFunction(navOption.entity) && (navOption === null || navOption === void 0 ? void 0 : navOption.entity());
        if (isUndefined_1.default(targetEntityType)) {
            throw new error_1.ForeignKeyValidationError(`entity '${entityName}' navigation '${navPropName}' lost the target entity type.`);
        }
        if ('foreignKey' in navOption) {
            if (!isEntityHasProperty(entityType, navOption.foreignKey)) {
                throw new error_1.ForeignKeyValidationError(`entity '${entityName}' navigation '${navPropName}' has foreign key '${navOption.foreignKey}, but it not exist on this entity type.'`);
            }
        }
        if ('targetForeignKey' in navOption) {
            if (!isEntityHasProperty(targetEntityType, navOption.targetForeignKey)) {
                const targetEntityTypeName = getClassName(targetEntityType);
                throw new error_1.ForeignKeyValidationError(`entity '${entityName}' navigation '${navPropName}' has a ref foreign key '${navOption.targetForeignKey}' on entity ${targetEntityTypeName}, but it not exist on that entity type.'`);
            }
        }
    });
}
exports.validateEntityType = validateEntityType;
//# sourceMappingURL=entity.js.map