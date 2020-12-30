"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnectionName = exports.withConnection = exports.getODataServerType = exports.withODataServerType = exports.getODataEntityNavigations = exports.getODataNavigation = exports.ODataNavigation = exports.OptionalProperty = exports.Property = exports.UUIDKeyProperty = exports.IncKeyProperty = exports.KeyProperty = exports.createPropertyDecorator = exports.getPropertyOptions = exports.ODataColumn = exports.isODataViewType = exports.isODataEntityType = exports.getODataColumns = exports.ODataEntityType = exports.ODataView = exports.ODataModel = exports.getODataEntityType = exports.getODataEntitySetName = exports.getDBHelper = exports.withDBHelper = exports.withEntityType = exports.withEntitySetName = exports.ODataFunction = exports.ODataAction = void 0;
const newdash_1 = require("@newdash/newdash");
const isClass_1 = require("@newdash/newdash/isClass");
const isEmpty_1 = require("@newdash/newdash/isEmpty");
const toInteger_1 = require("@newdash/newdash/toInteger");
const bignumber_js_1 = require("bignumber.js");
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const Edm = require("../../edm");
const error_1 = require("../../error");
const db_helper_1 = require("../db_helper");
const entity_1 = require("../entity");
const KEY_ODATA_ENTITY = 'odata:entity:is_entity';
const KEY_ODATA_VIEW = 'odata:entity:is_view';
const KEY_CONN_NAME = 'odata:controller:connection';
const KEY_ODATA_ENTITY_PROP = 'odata.entity:entity_prop';
const KEY_ODATA_ENTITY_PROPS = 'odata.entity:entity_props';
const KEY_ODATA_ENTITY_SET = 'odata.entity:entity_set_name';
const KEY_ODATA_PROP_NAVIGATION = 'odata.entity:entity_prop_navigation';
const KEY_ODATA_ENTITY_NAVIGATIONS = 'odata.entity:entity_navigations';
const KEY_ODATA_ENTITY_TYPE = 'odata.entity:entity_type';
const KEY_TYPEORM_DB_TYPE = 'odata.typeorm:db_type';
const KEY_WITH_ODATA_SERVER = 'odata:with_server';
/**
 * define odata action for entity
 *
 * @alias Edm.Action
 */
exports.ODataAction = Edm.Action;
/**
 * define odata function for entity
 *
 * @alias Edm.Function
 */
exports.ODataFunction = Edm.Function;
/**
 * set entity set name for odata entity
 *
 * @param entitySetName
 */
function withEntitySetName(entitySetName) {
    return function (target) {
        Reflect.defineMetadata(KEY_ODATA_ENTITY_SET, entitySetName, target);
    };
}
exports.withEntitySetName = withEntitySetName;
/**
 * set entity type for anything
 *
 * @param entity
 */
function withEntityType(entity) {
    return function (target) {
        Reflect.defineMetadata(KEY_ODATA_ENTITY_TYPE, entity, target);
    };
}
exports.withEntityType = withEntityType;
/**
 * with db helper for entity/service/server
 *
 * @param type
 */
function withDBHelper(type) {
    return function (target) {
        Reflect.defineMetadata(KEY_TYPEORM_DB_TYPE, type, target);
    };
}
exports.withDBHelper = withDBHelper;
/**
 * get db helper for entity/service/server
 *
 * @param target
 */
function getDBHelper(target) {
    return Reflect.getMetadata(KEY_TYPEORM_DB_TYPE, target);
}
exports.getDBHelper = getDBHelper;
/**
 * set entity set name for odata entity
 *
 * @param target
 */
function getODataEntitySetName(target) {
    const metaName = Reflect.getMetadata(KEY_ODATA_ENTITY_SET, target);
    if (metaName) {
        return metaName;
    }
    else if (target === null || target === void 0 ? void 0 : target.name) {
        return `${target.name}s`;
    }
    return undefined;
}
exports.getODataEntitySetName = getODataEntitySetName;
/**
 * get entity type for controller
 *
 * @param target
 */
function getODataEntityType(target) {
    return Reflect.getMetadata(KEY_ODATA_ENTITY_TYPE, target);
}
exports.getODataEntityType = getODataEntityType;
/**
 * OData Entity Type
 *
 * The wrapper of the typeorm `Entity` decorator
 *
 * @param options
 */
function ODataModel(options = {}, entitySetName) {
    return function (target) {
        Reflect.defineMetadata(KEY_ODATA_ENTITY, true, target);
        typeorm_1.Entity(options)(target);
        if (entitySetName) {
            withEntitySetName(entitySetName)(target);
        }
    };
}
exports.ODataModel = ODataModel;
/**
 * define odata view
 *
 * @param options
 * @param entitySetName
 */
function ODataView(options = {}, entitySetName) {
    return function (target) {
        Reflect.defineMetadata(KEY_ODATA_VIEW, true, target);
        typeorm_1.ViewEntity(options)(target);
        if (entitySetName) {
            withEntitySetName(entitySetName)(target);
        }
    };
}
exports.ODataView = ODataView;
/**
 * define an odata entity type/domain model
 *
 * @deprecated do not use this
 */
exports.ODataEntityType = ODataModel;
exports.getODataColumns = (classOrInstance) => {
    if (isClass_1.isClass(classOrInstance)) {
        return Reflect.getOwnMetadata(KEY_ODATA_ENTITY_PROPS, classOrInstance.prototype) || [];
    }
    return Reflect.getMetadata(KEY_ODATA_ENTITY_PROPS, classOrInstance) || [];
};
exports.isODataEntityType = (classOrInstance) => {
    if (classOrInstance == undefined) {
        return false;
    }
    if (isClass_1.isClass(classOrInstance)) {
        return Boolean(Reflect.getMetadata(KEY_ODATA_ENTITY, classOrInstance));
    }
    return Boolean(Reflect.getMetadata(KEY_ODATA_ENTITY, classOrInstance.constructor));
};
exports.isODataViewType = (classOrInstance) => {
    if (classOrInstance == undefined) {
        return false;
    }
    if (isClass_1.isClass(classOrInstance)) {
        return Boolean(Reflect.getMetadata(KEY_ODATA_VIEW, classOrInstance));
    }
    return Boolean(Reflect.getMetadata(KEY_ODATA_VIEW, classOrInstance.constructor));
};
/**
 * ODataColumn
 *
 * combine the `Edm` & `typeorm` decorator
 *
 * @param options
 */
function ODataColumn(options = {}) {
    return function (object, propertyName) {
        const entityColumns = exports.getODataColumns(object);
        const { primary, length, precision, nullable, scale } = options;
        if (primary) {
            Edm.Key(object, propertyName);
        }
        if (length) {
            Edm.MaxLength(toInteger_1.default(length))(object, propertyName);
        }
        if (precision) {
            Edm.Precision(toInteger_1.default(precision))(object, propertyName);
        }
        if (scale) {
            Edm.Scale(toInteger_1.default(scale))(object, propertyName);
        }
        if (nullable) {
            Edm.Nullable(object, propertyName);
        }
        // make options transform as array
        if (options.transformer === undefined) {
            options.transformer = [];
        }
        else if (newdash_1.isArray(options.transformer)) {
        }
        else {
            options.transformer = [options.transformer];
        }
        if ((options === null || options === void 0 ? void 0 : options.default) !== undefined) {
            Edm.DefaultValue(options.default)(object, propertyName);
        }
        const reflectType = Reflect.getMetadata('design:type', object, propertyName);
        switch (reflectType) {
            case String:
                switch (options.type) {
                    case 'decimal':
                    case 'dec':
                    case 'float':
                    case 'float4':
                    case 'float8':
                    case 'tinyint':
                    case 'int2':
                    case 'int4':
                    case 'int8':
                    case 'int64':
                    case 'bigint':
                        throw new error_1.StartupError(`please use 'BigNumber' to define numeric property.`);
                    case 'uuid':
                        Edm.Guid(object, propertyName);
                        break;
                    case 'date':
                        Edm.Date(object, propertyName);
                        break;
                    case 'datetime':
                    case 'datetime2':
                    case 'datetimeoffset':
                        throw error_1.PropertyDefinitionError.wrongDBType(reflectType, options.type);
                    default:
                        Edm.String(object, propertyName);
                        break;
                }
                break;
            case bignumber_js_1.BigNumber:
                switch (options.type) {
                    case 'decimal':
                    case 'dec':
                    case 'float':
                    case 'float4':
                    case 'float8':
                        Edm.Decimal(object, propertyName);
                        options.transformer.push(db_helper_1.DecimalTransformer);
                        break;
                    case 'int2':
                    case 'int4':
                    case 'int8':
                        Edm.Int16(object, propertyName);
                        options.transformer.push(db_helper_1.DecimalTransformer);
                        break;
                    case 'int64':
                    case 'bigint':
                        Edm.Int64(object, propertyName);
                        options.transformer.push(db_helper_1.DecimalTransformer);
                        break;
                    case 'uuid':
                    case 'date':
                    case 'datetime':
                    case 'datetime2':
                    case 'datetimeoffset':
                        throw error_1.PropertyDefinitionError.wrongDBType(reflectType, options.type);
                    default:
                        Edm.Decimal(object, propertyName);
                        break;
                }
                break;
            case Number:
                switch (options.type) {
                    case 'tinyint':
                    case 'int2':
                    case 'int4':
                    case 'int8':
                        Edm.Int16(object, propertyName);
                        break;
                    case 'integer':
                        Edm.Int32(object, propertyName);
                        break;
                    case 'int64':
                    case 'bigint':
                    case 'decimal':
                    case 'dec':
                    case 'float':
                    case 'float4':
                    case 'float8':
                        throw error_1.PropertyDefinitionError.wrongDBType(reflectType, options.type);
                    default:
                        // unknown or not have type
                        Edm.Int32(object, propertyName);
                        break;
                }
                break;
            case Boolean:
                Edm.Boolean(object, propertyName);
                if (options.type === undefined) {
                    options.type = 'boolean';
                }
                break;
            case Date:
                if (options.type !== undefined && options.type !== 'bigint') {
                    throw new error_1.PropertyDefinitionError(`please do not define the type of date time field`);
                }
                Edm.DateTimeOffset(object, propertyName);
                options.type = 'bigint';
                options.transformer.push(db_helper_1.DateTimeTransformer);
                break;
            default:
                throw new error_1.NotImplementedError(`Not support the type of field '${propertyName}'.`);
        }
        typeorm_1.Column(options)(object, propertyName);
        const eOption = Object.assign({}, options, { reflectType });
        entityColumns.push(eOption);
        Reflect.defineMetadata(KEY_ODATA_ENTITY_PROPS, entityColumns, object);
        Reflect.defineMetadata(KEY_ODATA_ENTITY_PROP, eOption, object, propertyName);
    };
}
exports.ODataColumn = ODataColumn;
/**
 * get property column options
 *
 * @param target
 * @param propsName
 */
function getPropertyOptions(target, propsName) {
    if (isClass_1.isClass(target)) {
        return Reflect.getOwnMetadata(KEY_ODATA_ENTITY_PROP, target.prototype, propsName);
    }
    return Reflect.getMetadata(KEY_ODATA_ENTITY_PROP, target, propsName);
}
exports.getPropertyOptions = getPropertyOptions;
/**
 * create property with default option
 *
 * @param defaultOption
 */
function createPropertyDecorator(defaultOption) {
    return function (options) {
        return function (target, propName) {
            return ODataColumn({ ...defaultOption, ...options })(target, propName);
        };
    };
}
exports.createPropertyDecorator = createPropertyDecorator;
/**
 * define key property for odata entity type
 *
 * @param options
 */
exports.KeyProperty = createPropertyDecorator({ primary: true });
/**
 * auto increment key property
 */
exports.IncKeyProperty = createPropertyDecorator({ primary: true, type: 'integer', generated: 'increment' });
/**
 * uuid generated key property
 */
exports.UUIDKeyProperty = createPropertyDecorator({ primary: true, type: 'uuid', generated: 'uuid' });
/**
 * define property for odata entity type
 */
exports.Property = createPropertyDecorator({});
/**
 * define optional property for odata entity type
 */
exports.OptionalProperty = createPropertyDecorator({ nullable: true });
/**
 * ODataNavigation decorator
 *
 * define the navigation
 *
 * @param options
 */
function ODataNavigation(options) {
    return function (target, propertyName) {
        var _a;
        const entityName = (_a = target === null || target === void 0 ? void 0 : target.constructor) === null || _a === void 0 ? void 0 : _a.name;
        // @ts-ignore
        if (isEmpty_1.isEmpty(options === null || options === void 0 ? void 0 : options.foreignKey) && isEmpty_1.isEmpty(options === null || options === void 0 ? void 0 : options.targetForeignKey)) {
            throw new error_1.ServerInternalError(`navigation the ref 'foreign key' must be defined in ${entityName} ${propertyName}`);
        }
        const navigations = getODataEntityNavigations(target);
        navigations[propertyName] = options;
        Reflect.defineMetadata(KEY_ODATA_ENTITY_NAVIGATIONS, navigations, target);
        Reflect.defineMetadata(KEY_ODATA_PROP_NAVIGATION, options, target, propertyName);
        switch (options.type) {
            case 'OneToMany':
                Edm.Collection(Edm.EntityType(Edm.ForwardRef(options.entity)))(target, propertyName);
                Edm.ForeignKey(options.targetForeignKey)(target, propertyName);
                break;
            case 'ManyToOne':
                Edm.EntityType(Edm.ForwardRef(options.entity))(target, propertyName);
                Edm.ForeignKey(options.foreignKey)(target, propertyName);
                break;
            case 'OneToOne':
                Edm.EntityType(Edm.ForwardRef(options.entity))(target, propertyName);
                Edm.ForeignKey(options.foreignKey)(target, propertyName);
            default:
                break;
        }
    };
}
exports.ODataNavigation = ODataNavigation;
/**
 * get odata navigation options
 *
 * @param target
 * @param propertyName
 */
function getODataNavigation(target, propertyName) {
    if (isClass_1.isClass(target)) {
        return Reflect.getMetadata(KEY_ODATA_PROP_NAVIGATION, target.prototype, propertyName);
    }
    return Reflect.getMetadata(KEY_ODATA_PROP_NAVIGATION, target, propertyName);
}
exports.getODataNavigation = getODataNavigation;
/**
 * get odata navigation for entity
 *
 * @param target
 * @param propertyName
 */
function getODataEntityNavigations(target) {
    if (target.prototype instanceof entity_1.BaseODataModel) {
        return Reflect.getMetadata(KEY_ODATA_ENTITY_NAVIGATIONS, target.prototype) || {};
    }
    return Reflect.getMetadata(KEY_ODATA_ENTITY_NAVIGATIONS, target) || {};
}
exports.getODataEntityNavigations = getODataEntityNavigations;
function withODataServerType(serverType) {
    return function (target) {
        Reflect.defineMetadata(KEY_WITH_ODATA_SERVER, serverType, target);
    };
}
exports.withODataServerType = withODataServerType;
function getODataServerType(target) {
    return Reflect.getMetadata(KEY_WITH_ODATA_SERVER, target);
}
exports.getODataServerType = getODataServerType;
/**
 * indicate the controller use the connection name
 * if user not use this decorator, or set empty connection name, the controller will use the 'default' connection of typeorm
 *
 * @param connectionName typeorm connection name
 */
function withConnection(connectionName = 'default') {
    return function (controller) {
        Reflect.defineMetadata(KEY_CONN_NAME, connectionName, controller);
    };
}
exports.withConnection = withConnection;
/**
 * getConnectName for typed controller
 * @param target
 */
function getConnectionName(target) {
    return Reflect.getMetadata(KEY_CONN_NAME, target);
}
exports.getConnectionName = getConnectionName;
//# sourceMappingURL=odata.js.map