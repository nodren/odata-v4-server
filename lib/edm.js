"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContainerBase = exports.EdmContainerClass = exports.Container = exports.ForwardRef = exports.EntitySet = exports.getPartner = exports.Partner = exports.getForeignKeys = exports.ForeignKey = exports.getAnnotations = exports.Annotate = exports.getURLDeserializer = exports.URLDeserialize = exports.getURLSerializer = exports.URLSerialize = exports.getDeserializer = exports.Deserialize = exports.getSerializer = exports.Serialize = exports.getConverter = exports.Convert = exports.register = exports.isTypeDefinition = exports.TypeDefinition = exports.isEnumType = exports.EnumType = exports.isFlags = exports.Flags = exports.isEntityType = exports.EntityType = exports.isOpenType = exports.OpenType = exports.getContentType = exports.isMediaEntity = exports.MediaEntity = exports.isComplexType = exports.ComplexType = exports.isFunction = exports.isAction = exports.isFunctionImport = exports.isActionImport = exports.getReturnType = exports.getReturnTypeName = exports.getOperations = exports.Function = exports._Function = exports.FunctionImport = exports.Action = exports._Action = exports.ActionImport = exports.getConcurrencyMode = exports.ConcurrencyMode = exports.getDefaultValue = exports.DefaultValue = exports.getSRID = exports.SRID = exports.isUnicode = exports.Unicode = exports.getScale = exports.Scale = exports.getPrecision = exports.Precision = exports.getMaxLength = exports.MaxLength = exports.isRequired = exports.Required = exports.isNullable = exports.Nullable = exports.isComputed = exports.Computed = exports.escape = exports.getKeyProperties = exports.isKey = exports.Key = exports.getChildren = exports.getParameters = exports.getProperties = exports.isCollection = exports.getType = exports.getTypeName = exports.Collection = exports.ParameterType = exports.ReturnType = exports.GeometryCollection = exports.GeometryMultiPolygon = exports.GeometryMultiLineString = exports.GeometryMultiPoint = exports.GeometryPolygon = exports.GeometryLineString = exports.GeometryPoint = exports.Geometry = exports.GeographyCollection = exports.GeographyMultiPolygon = exports.GeographyMultiLineString = exports.GeographyMultiPoint = exports.GeographyPolygon = exports.GeographyLineString = exports.GeographyPoint = exports.Geography = exports.TimeOfDay = exports.String = exports.Stream = exports.Single = exports.SByte = exports.Int64 = exports.Int32 = exports.Int16 = exports.Guid = exports.Duration = exports.Double = exports.Decimal = exports.DateTimeOffset = exports.Date = exports.Byte = exports.Boolean = exports.Binary = void 0;
require("reflect-metadata");
const util = require("util");
const odata = require("./odata");
const utils_1 = require("./utils");
const EdmProperties = 'edm:properties';
const EdmKeyProperties = 'edm:keyproperties';
const EdmKeyProperty = 'edm:keyproperty';
const EdmForeignKeys = 'edm:foreignkeys';
const EdmComputedProperty = 'edm:computedproperty';
const EdmNullableProperty = 'edm:nullableproperty';
const EdmPartnerProperty = 'edm:partnerproperty';
const EdmType = 'edm:type';
const EdmElementType = 'edm:elementtype';
const EdmComplexType = 'edm:complextype';
const EdmEntityType = 'edm:entitytype';
const EdmEnumType = 'edm:enumtype';
const EdmTypeDefinition = 'edm:typedefinition';
const EdmFlags = 'edm:flags';
const EdmOperations = 'edm:operations';
const EdmAction = 'edm:action';
const EdmFunction = 'edm:function';
const EdmReturnType = 'edm:returntype';
const EdmParameters = 'edm:parameters';
const EdmAnnotations = 'edm:annotations';
const EdmConverter = 'edm:converter';
const EdmSerializer = 'edm:serializer';
const EdmDeserializer = 'edm:deserializer';
const EdmURLSerializer = 'edm:urlserializer';
const EdmURLDeserializer = 'edm:urldeserializer';
const EdmMediaEntity = 'edm:mediaentity';
const EdmOpenType = 'emd:opentype';
const EdmChildren = 'edm:children';
const EdmContainer = [];
const EdmMaxLength = 'edm:maxlength';
const EdmPrecision = 'edm:precision';
const EdmScale = 'edm:scale';
const EdmUnicode = 'edm:unicode';
const EdmSRID = 'edm:srid';
const EdmDefaultValue = 'edm:defaultvalue';
const EdmConcurrencyMode = 'edm:concurrencymode';
/**
 * Defines OData Edm decorators
 *
 * @param type Edm decorator type
 * @return     Edm decorator
 */
function typeDecoratorFactory(type) {
    const decorator = function (target, targetKey, parameterIndex) {
        const baseType = Object.getPrototypeOf(target).constructor;
        if (baseType != Object && getProperties(baseType.prototype).length > 0) {
            EntityType()(baseType.prototype);
            const children = Reflect.getOwnMetadata(EdmChildren, baseType) || [];
            if (children.indexOf(target.constructor) < 0) {
                children.unshift(target.constructor);
            }
            Reflect.defineMetadata(EdmChildren, children, baseType);
        }
        if (typeof parameterIndex == 'number') {
            const parameterNames = utils_1.getFunctionParameters(target, targetKey);
            const existingParameters = Reflect.getOwnMetadata(EdmParameters, target, targetKey) || [];
            const paramName = parameterNames[parameterIndex];
            const param = existingParameters.filter((p) => p.name == paramName)[0];
            if (param) {
                param.type = type;
            }
            else {
                existingParameters.push({
                    name: paramName,
                    type
                });
            }
            Reflect.defineMetadata(EdmParameters, existingParameters, target, targetKey);
        }
        else {
            if (typeof target == 'function') {
                register(target);
            }
            const desc = Object.getOwnPropertyDescriptor(target, targetKey);
            if (targetKey != EdmType && ((desc && typeof desc.value != 'function') || (!desc && typeof target[targetKey] != 'function'))) {
                const properties = Reflect.getOwnMetadata(EdmProperties, target) || [];
                if (properties.indexOf(targetKey) < 0) {
                    properties.push(targetKey);
                }
                Reflect.defineMetadata(EdmProperties, properties, target);
            }
            Reflect.defineMetadata(EdmType, type, target, targetKey);
        }
    };
    return function (...args) {
        if (arguments.length == 0) {
            return decorator;
        }
        return decorator.apply(this, args);
    };
}
/** Edm.Binary primitive type property decorator */
exports.Binary = typeDecoratorFactory('Edm.Binary');
/** Edm.Boolean primitive type property decorator */
exports.Boolean = typeDecoratorFactory('Edm.Boolean');
/** Edm.Byte primitive type property decorator */
exports.Byte = typeDecoratorFactory('Edm.Byte');
/** Edm.Date primitive type property decorator */
exports.Date = typeDecoratorFactory('Edm.Date');
/** Edm.DateTimeOffset primitive type property decorator */
exports.DateTimeOffset = typeDecoratorFactory('Edm.DateTimeOffset');
/** Edm.Decimal primitive type property decorator */
exports.Decimal = typeDecoratorFactory('Edm.Decimal');
/** Edm.Double primitive type property decorator */
exports.Double = typeDecoratorFactory('Edm.Double');
/** Edm.Duration primitive type property decorator */
exports.Duration = typeDecoratorFactory('Edm.Duration');
/** Edm.Guid primitive type property decorator */
exports.Guid = typeDecoratorFactory('Edm.Guid');
/** Edm.Int16 primitive type property decorator */
exports.Int16 = typeDecoratorFactory('Edm.Int16');
/** Edm.Int32 primitive type property decorator */
exports.Int32 = typeDecoratorFactory('Edm.Int32');
/** Edm.Int64 primitive type property decorator */
exports.Int64 = typeDecoratorFactory('Edm.Int64');
/** Edm.SByte primitive type property decorator */
exports.SByte = typeDecoratorFactory('Edm.SByte');
/** Edm.Single primitive type property decorator */
exports.Single = typeDecoratorFactory('Edm.Single');
function Stream(target) {
    if (typeof target == 'string') {
        const contentType = target;
        return function (target, targetKey) {
            Reflect.defineMetadata(EdmMediaEntity, contentType, target, targetKey);
            typeDecoratorFactory('Edm.Stream')(target, targetKey);
        };
    }
    // eslint-disable-next-line prefer-rest-params
    return typeDecoratorFactory('Edm.Stream').apply(this, arguments);
}
exports.Stream = Stream;
;
/** Edm.String primitive type property decorator */
exports.String = typeDecoratorFactory('Edm.String');
/** Edm.TimeOfDay primitive type property decorator */
exports.TimeOfDay = typeDecoratorFactory('Edm.TimeOfDay');
/** Edm.Geography primitive type property decorator */
exports.Geography = typeDecoratorFactory('Edm.Geography');
/** Edm.GeographyPoint primitive type property decorator */
exports.GeographyPoint = typeDecoratorFactory('Edm.GeographyPoint');
/** Edm.GeographyLineString primitive type property decorator */
exports.GeographyLineString = typeDecoratorFactory('Edm.GeographyLineString');
/** Edm.GeographyPolygon primitive type property decorator */
exports.GeographyPolygon = typeDecoratorFactory('Edm.GeographyPolygon');
/** Edm.GeographyMultiPoint primitive type property decorator */
exports.GeographyMultiPoint = typeDecoratorFactory('Edm.GeographyMultiPoint');
/** Edm.GeographyMultiLineString primitive type property decorator */
exports.GeographyMultiLineString = typeDecoratorFactory('Edm.GeographyMultiLineString');
/** Edm.GeographyMultiPolygon primitive type property decorator */
exports.GeographyMultiPolygon = typeDecoratorFactory('Edm.GeographyMultiPolygon');
/** Edm.GeographyCollection primitive type property decorator */
exports.GeographyCollection = (function GeographyCollection() {
    return typeDecoratorFactory('Edm.GeographyCollection');
})();
/** Edm.Geometry primitive type property decorator */
exports.Geometry = (function Geometry() {
    return typeDecoratorFactory('Edm.Geometry');
})();
/** Edm.GeometryPoint primitive type property decorator */
exports.GeometryPoint = (function GeometryPoint() {
    return typeDecoratorFactory('Edm.GeometryPoint');
})();
/** Edm.GeometryLineString primitive type property decorator */
exports.GeometryLineString = (function GeometryLineString() {
    return typeDecoratorFactory('Edm.GeometryLineString');
})();
/** Edm.GeometryPolygon primitive type property decorator */
exports.GeometryPolygon = (function GeometryPolygon() {
    return typeDecoratorFactory('Edm.GeometryPolygon');
})();
/** Edm.GeometryMultiPoint primitive type property decorator */
exports.GeometryMultiPoint = (function GeometryMultiPoint() {
    return typeDecoratorFactory('Edm.GeometryMultiPoint');
})();
/** Edm.GeometryMultiLineString primitive type property decorator */
exports.GeometryMultiLineString = (function GeometryMultiLineString() {
    return typeDecoratorFactory('Edm.GeometryMultiLineString');
})();
/** Edm.GeometryMultiPolygon primitive type property decorator */
exports.GeometryMultiPolygon = (function GeometryMultiPolygon() {
    return typeDecoratorFactory('Edm.GeometryMultiPolygon');
})();
/** Edm.GeometryCollection primitive type property decorator */
exports.GeometryCollection = (function GeometryCollection() {
    return typeDecoratorFactory('Edm.GeometryCollection');
})();
/**
 * decorator wrapper, indicate user inner decorator means return type
 *
 * @param returnType
 */
function ReturnType(returnType) {
    return returnType;
}
exports.ReturnType = ReturnType;
/**
 * decorator wrapper, indicate user inner decorator means parameter type
 *
 * @param returnType
 */
function ParameterType(parameterType) {
    return parameterType;
}
exports.ParameterType = ParameterType;
/** Edm.Collection decorator for describing properties as collections */
function Collection(elementType) {
    return function (target, targetKey, parameterIndex) {
        if (typeof parameterIndex == 'number') {
            const parameterNames = utils_1.getFunctionParameters(target, targetKey);
            const existingParameters = Reflect.getOwnMetadata(EdmParameters, target, targetKey) || [];
            const element = function Collection() { };
            Reflect.decorate([elementType()], element, EdmType);
            let elementTypeName = Reflect.getMetadata(EdmType, element, EdmType);
            if (typeof elementTypeName == 'function') {
                elementTypeName = `${elementTypeName.namespace || target.namespace}.${elementTypeName.name}`;
            }
            const paramName = parameterNames[parameterIndex];
            const param = existingParameters.filter((p) => p.name == paramName)[0];
            if (param) {
                param.type = `Collection(${elementTypeName})`;
            }
            else {
                existingParameters.push({
                    name: paramName,
                    type: `Collection(${elementTypeName})`
                });
            }
            Reflect.defineMetadata(EdmParameters, existingParameters, target, targetKey);
        }
        else {
            if (typeof target == 'function') {
                register(target);
            }
            const baseType = Object.getPrototypeOf(target).constructor;
            if (baseType != Object && getProperties(baseType.prototype).length > 0) {
                EntityType()(baseType.prototype);
                const children = Reflect.getOwnMetadata(EdmChildren, baseType) || [];
                if (children.indexOf(target.constructor) < 0) {
                    children.unshift(target.constructor);
                }
                Reflect.defineMetadata(EdmChildren, children, baseType);
            }
            const desc = Object.getOwnPropertyDescriptor(target, targetKey);
            if ((desc && typeof desc.value != 'function') || (!desc && typeof target[targetKey] != 'function')) {
                const properties = Reflect.getOwnMetadata(EdmProperties, target) || [];
                if (properties.indexOf(targetKey) < 0) {
                    properties.push(targetKey);
                }
                Reflect.defineMetadata(EdmProperties, properties, target);
            }
            const element = function Collection() { };
            try {
                Reflect.decorate([elementType()], element, EdmType);
            }
            catch (err) {
                Reflect.decorate([elementType], element, EdmType);
            }
            let type = Reflect.getMetadata(EdmComplexType, element, EdmType);
            const elementTypeName = Reflect.getMetadata(EdmType, element, EdmType);
            Reflect.defineMetadata(EdmType, 'Collection', target, targetKey);
            Reflect.defineMetadata(EdmElementType, elementTypeName, target, targetKey);
            if (type) {
                Reflect.defineMetadata(EdmComplexType, type, target, targetKey);
            }
            else {
                type = Reflect.getMetadata(EdmEntityType, element, EdmType);
                Reflect.defineMetadata(EdmEntityType, type, target, targetKey);
            }
        }
    };
}
exports.Collection = Collection;
function getTypeName(target, propertyKey, container) {
    let type = Reflect.getMetadata(EdmType, target) || Reflect.getMetadata(EdmType, target.prototype, propertyKey) || Reflect.getMetadata(EdmType, target.prototype);
    let elementType = Reflect.getMetadata(EdmElementType, target) || Reflect.getMetadata(EdmElementType, target.prototype, propertyKey) || Reflect.getMetadata(EdmElementType, target.prototype);
    type = (type && type['@odata.type']) || (type && type.prototype && type.prototype['@odata.type']) || type;
    if (container && container instanceof ContainerBase) {
        let containerType = container.resolve(type);
        if (containerType) {
            const containerPrototype = Object.getPrototypeOf(container);
            let namespace = odata.getNamespace(containerPrototype.constructor, containerType) || (containerPrototype.constructor || target).namespace || 'Default';
            if (containerType.indexOf('.') > 0) {
                namespace = containerType.slice(0, containerType.lastIndexOf('.'));
                containerType = containerType.slice(containerType.lastIndexOf('.') + 1);
            }
            type = `${namespace}.${containerType}`;
        }
    }
    if (typeof type == 'string' && type != 'Collection' && type.indexOf('.') < 0) {
        for (let i = 0; i < EdmContainer.length; i++) {
            const containerType = EdmContainer[i];
            const namespace = containerType.namespace || target.namespace || 'Default';
            const containerTypeName = containerType.name;
            if (containerTypeName == type) {
                type = `${namespace}.${type}`;
                break;
            }
        }
    }
    else if (typeof type == 'function') {
        if (type.__forward__ref__) {
            type = `${type.namespace || target.namespace || 'Default'}.${type().name}`;
        }
        else {
            type = `${type.namespace || target.namespace || 'Default'}.${type.name}`;
        }
    }
    if (typeof elementType == 'string' && elementType != 'Collection' && elementType.indexOf('.') < 0) {
        for (let i = 0; i < EdmContainer.length; i++) {
            const containerType = EdmContainer[i];
            const namespace = containerType.namespace || target.namespace || 'Default';
            const containerTypeName = containerType.name;
            if (containerTypeName == elementType) {
                elementType = `${namespace}.${elementType}`;
                break;
            }
        }
    }
    else if (typeof elementType == 'string' && elementType == 'Collection') {
        // ?
    }
    else if (typeof elementType == 'function') {
        if (elementType.__forward__ref__) {
            elementType = `${elementType.namespace || target.namespace || 'Default'}.${elementType().name}`;
        }
        else {
            elementType = `${elementType.namespace || target.namespace || 'Default'}.${elementType.name}`;
        }
    }
    return elementType ? `${type}(${elementType})` : type;
}
exports.getTypeName = getTypeName;
function getType(target, propertyKey, container) {
    let type = !propertyKey ? Reflect.getMetadata(EdmType, target) : Reflect.getMetadata(EdmType, target.prototype, propertyKey);
    let elementType = !propertyKey ? Reflect.getMetadata(EdmElementType, target) : Reflect.getMetadata(EdmElementType, target.prototype, propertyKey);
    const hasEntityType = isEntityType(target, propertyKey) || isComplexType(target, propertyKey);
    if (!elementType) {
        elementType = type;
    }
    if (elementType && elementType.__forward__ref__) {
        elementType = elementType();
    }
    if (type && type.__forward__ref__) {
        type = type();
    }
    if (hasEntityType) {
        if (typeof elementType == 'string' && elementType.indexOf('.') < 0) {
            elementType = `${target.namespace || 'Default'}.${elementType}`;
        }
        if (typeof type == 'string' && type.indexOf('.') < 0) {
            type = `${target.namespace || 'Default'}.${type}`;
        }
    }
    if (typeof elementType == 'string') {
        if (container && container instanceof ContainerBase) {
            const containerType = container.resolve(type);
            if (containerType) {
                const namespace = containerType.namespace || Object.getPrototypeOf(container).constructor.namespace || target.namespace || 'Default';
                const containerTypeName = containerType.name;
                type = `${namespace}.${containerTypeName}`;
            }
        }
        for (let i = 0; i < EdmContainer.length; i++) {
            const containerType = EdmContainer[i];
            const namespace = containerType.namespace || target.namespace || 'Default';
            const containerTypeName = (namespace ? `${namespace}.` : '') + containerType.name;
            if (containerTypeName == elementType) {
                return containerType;
            }
        }
    }
    return elementType;
}
exports.getType = getType;
/** Returns true if property is a collection (decorated by Edm.Collection) */
function isCollection(target, propertyKey) {
    return Reflect.getMetadata(EdmType, target.prototype, propertyKey) == 'Collection';
}
exports.isCollection = isCollection;
function getProperties(target) {
    try {
        return Reflect.getOwnMetadata(EdmProperties, target) || Reflect.getOwnMetadata(EdmProperties, target.prototype) || [];
    }
    catch (err) {
        return [];
    }
}
exports.getProperties = getProperties;
function getParameters(target, targetKey) {
    const params = [];
    let __proto__ = target.prototype;
    while (__proto__) {
        params.push(...(Reflect.getOwnMetadata(EdmParameters, __proto__, targetKey) || []));
        __proto__ = Object.getPrototypeOf(__proto__);
    }
    return params;
}
exports.getParameters = getParameters;
function getChildren(target) {
    return Reflect.getOwnMetadata(EdmChildren, target) || [];
}
exports.getChildren = getChildren;
/** Edm.Key decorator for describing properties as keys */
exports.Key = (function Key() {
    return function (target, targetKey) {
        if (typeof target == 'function') {
            register(target);
        }
        const properties = Reflect.getOwnMetadata(EdmKeyProperties, target) || [];
        if (properties.indexOf(targetKey) < 0) {
            properties.push(targetKey);
        }
        Reflect.defineMetadata(EdmKeyProperties, properties, target);
        Reflect.defineMetadata(EdmKeyProperty, true, target, targetKey);
    };
})();
/** Returns true if property is a key (decorated by Edm.Key) */
function isKey(target, propertyKey) {
    return Reflect.getMetadata(EdmKeyProperty, target.prototype, propertyKey) || false;
}
exports.isKey = isKey;
/** Returns property names that build up the key (names of properties decorated by Edm.Key) */
function getKeyProperties(target) {
    return Reflect.getOwnMetadata(EdmKeyProperties, target) || Reflect.getOwnMetadata(EdmKeyProperties, target.prototype) || [];
}
exports.getKeyProperties = getKeyProperties;
/**
 * Returns escaped strings according to the OData format
 * Strings are quoted in single quotes therefore single quotes in strings are converted to two singlequotes.
 * Binary values are converted to hexadecimal strings.
 *
 * @param value Input value of any type
 * @param type  OData type of the provided value
 * @return      Escaped string
 */
async function escape(value, type, serializer) {
    if (typeof serializer == 'function') {
        return await serializer(value);
    }
    if (typeof value == 'undefined' || value == null) {
        return value;
    }
    switch (type) {
        case 'Edm.Binary':
            return value.toString('hex');
        case 'Edm.Boolean':
        case 'Edm.Byte':
        case 'Edm.Decimal':
        case 'Edm.Double':
        case 'Edm.Guid':
        case 'Edm.Int16':
        case 'Edm.Int32':
        case 'Edm.Int64':
        case 'Edm.SByte':
        case 'Edm.Single':
            return value.toString();
        case 'Edm.String': return `'${(`${value}`).replace(/'/g, "''")}'`;
        default:
            return `'${value.toString()}'`;
    }
}
exports.escape = escape;
/** Edm.Computed decorator for describing computed properties */
exports.Computed = (function Computed() {
    return function (target, targetKey) {
        if (typeof target == 'function') {
            register(target);
        }
        Reflect.defineMetadata(EdmComputedProperty, true, target, targetKey);
    };
})();
/** Returns true if property is computed (decorated by Edm.Computed) */
function isComputed(target, propertyKey) {
    return Reflect.getMetadata(EdmComputedProperty, target.prototype, propertyKey) || false;
}
exports.isComputed = isComputed;
/** Edm.Nullable decorator for describing nullable properties (which can be missing) */
exports.Nullable = (function Nullable() {
    return function (target, targetKey, parameterIndex) {
        if (typeof parameterIndex == 'number') {
            const parameterNames = utils_1.getFunctionParameters(target, targetKey);
            const existingParameters = Reflect.getOwnMetadata(EdmParameters, target, targetKey) || [];
            const paramName = parameterNames[parameterIndex];
            const param = existingParameters.filter((p) => p.name == paramName)[0];
            if (param) {
                param.nullable = true;
            }
            else {
                existingParameters.push({
                    name: parameterNames[parameterIndex],
                    nullable: true
                });
            }
            Reflect.defineMetadata(EdmParameters, existingParameters, target, targetKey);
        }
        else {
            if (typeof target == 'function') {
                register(target);
            }
            Reflect.defineMetadata(EdmNullableProperty, true, target, targetKey);
        }
    };
})();
/** Returns true if property is nullable (decorated by Edm.Nullable) */
function isNullable(target, propertyKey) {
    return Reflect.getMetadata(EdmNullableProperty, target.prototype, propertyKey);
}
exports.isNullable = isNullable;
/** Edm.Required decorator for describing non-nullable properties that must have value (cannot be missing) */
exports.Required = (function Required() {
    return function (target, targetKey, parameterIndex) {
        if (typeof parameterIndex == 'number') {
            const parameterNames = utils_1.getFunctionParameters(target, targetKey);
            const existingParameters = Reflect.getOwnMetadata(EdmParameters, target, targetKey) || [];
            const paramName = parameterNames[parameterIndex];
            const param = existingParameters.filter((p) => p.name == paramName)[0];
            if (param) {
                param.nullable = false;
            }
            else {
                existingParameters.push({
                    name: parameterNames[parameterIndex],
                    nullable: false
                });
            }
            Reflect.defineMetadata(EdmParameters, existingParameters, target, targetKey);
        }
        else {
            if (typeof target == 'function') {
                register(target);
            }
            Reflect.defineMetadata(EdmNullableProperty, false, target, targetKey);
        }
    };
})();
/** Returns true if property is required (decorated by Edm.Required) */
function isRequired(target, propertyKey) {
    return Reflect.getMetadata(EdmNullableProperty, target.prototype, propertyKey) == false ? true : false;
}
exports.isRequired = isRequired;
/** Edm.MaxLength decorator to set property max length */
function MaxLength(maxLength) {
    return function (target, targetKey, parameterIndex) {
        if (typeof parameterIndex == 'number') {
            const parameterNames = utils_1.getFunctionParameters(target, targetKey);
            const existingParameters = Reflect.getOwnMetadata(EdmParameters, target, targetKey) || [];
            const paramName = parameterNames[parameterIndex];
            const param = existingParameters.filter((p) => p.name == paramName)[0];
            if (param) {
                param.maxLength = maxLength;
            }
            else {
                existingParameters.push({
                    name: parameterNames[parameterIndex],
                    maxLength
                });
            }
            Reflect.defineMetadata(EdmParameters, existingParameters, target, targetKey);
        }
        else {
            if (typeof target == 'function') {
                register(target);
            }
            Reflect.defineMetadata(EdmMaxLength, maxLength, target, targetKey);
        }
    };
}
exports.MaxLength = MaxLength;
/** Returns property max length (decorated by Edm.MaxLength) */
function getMaxLength(target, propertyKey) {
    return Reflect.getMetadata(EdmMaxLength, target.prototype, propertyKey);
}
exports.getMaxLength = getMaxLength;
/** Edm.Precision decorator to set property precision */
function Precision(precision) {
    return function (target, targetKey, parameterIndex) {
        if (typeof parameterIndex == 'number') {
            const parameterNames = utils_1.getFunctionParameters(target, targetKey);
            const existingParameters = Reflect.getOwnMetadata(EdmParameters, target, targetKey) || [];
            const paramName = parameterNames[parameterIndex];
            const param = existingParameters.filter((p) => p.name == paramName)[0];
            if (param) {
                param.precision = precision;
            }
            else {
                existingParameters.push({
                    name: parameterNames[parameterIndex],
                    precision
                });
            }
            Reflect.defineMetadata(EdmParameters, existingParameters, target, targetKey);
        }
        else {
            if (typeof target == 'function') {
                register(target);
            }
            Reflect.defineMetadata(EdmPrecision, precision, target, targetKey);
        }
    };
}
exports.Precision = Precision;
/** Returns property precision (decorated by Edm.Precision) */
function getPrecision(target, propertyKey) {
    return Reflect.getMetadata(EdmPrecision, target.prototype, propertyKey);
}
exports.getPrecision = getPrecision;
/** Edm.Scale decorator to set property scale */
function Scale(scale) {
    return function (target, targetKey, parameterIndex) {
        if (typeof parameterIndex == 'number') {
            const parameterNames = utils_1.getFunctionParameters(target, targetKey);
            const existingParameters = Reflect.getOwnMetadata(EdmParameters, target, targetKey) || [];
            const paramName = parameterNames[parameterIndex];
            const param = existingParameters.filter((p) => p.name == paramName)[0];
            if (param) {
                param.scale = scale;
            }
            else {
                existingParameters.push({
                    name: parameterNames[parameterIndex],
                    scale
                });
            }
            Reflect.defineMetadata(EdmParameters, existingParameters, target, targetKey);
        }
        else {
            if (typeof target == 'function') {
                register(target);
            }
            Reflect.defineMetadata(EdmScale, scale, target, targetKey);
        }
    };
}
exports.Scale = Scale;
/** Returns property scale (decorated by Edm.Scale) */
function getScale(target, propertyKey) {
    return Reflect.getMetadata(EdmScale, target.prototype, propertyKey);
}
exports.getScale = getScale;
/** Edm.Unicode decorator for describing unicode properties */
exports.Unicode = (function Unicode() {
    return function (target, targetKey, parameterIndex) {
        if (typeof parameterIndex == 'number') {
            const parameterNames = utils_1.getFunctionParameters(target, targetKey);
            const existingParameters = Reflect.getOwnMetadata(EdmParameters, target, targetKey) || [];
            const paramName = parameterNames[parameterIndex];
            const param = existingParameters.filter((p) => p.name == paramName)[0];
            if (param) {
                param.unicode = true;
            }
            else {
                existingParameters.push({
                    name: parameterNames[parameterIndex],
                    unicode: true
                });
            }
            Reflect.defineMetadata(EdmParameters, existingParameters, target, targetKey);
        }
        else {
            if (typeof target == 'function') {
                register(target);
            }
            Reflect.defineMetadata(EdmUnicode, true, target, targetKey);
        }
    };
})();
/** Returns true if property is unicode (decorated by Edm.Unicode) */
function isUnicode(target, propertyKey) {
    return Reflect.getMetadata(EdmUnicode, target.prototype, propertyKey);
}
exports.isUnicode = isUnicode;
/** Edm.SRID decorator to set property SRID */
function SRID(srid) {
    return function (target, targetKey, parameterIndex) {
        if (typeof parameterIndex == 'number') {
            const parameterNames = utils_1.getFunctionParameters(target, targetKey);
            const existingParameters = Reflect.getOwnMetadata(EdmParameters, target, targetKey) || [];
            const paramName = parameterNames[parameterIndex];
            const param = existingParameters.filter((p) => p.name == paramName)[0];
            if (param) {
                param.srid = srid;
            }
            else {
                existingParameters.push({
                    name: parameterNames[parameterIndex],
                    SRID: srid
                });
            }
            Reflect.defineMetadata(EdmParameters, existingParameters, target, targetKey);
        }
        else {
            if (typeof target == 'function') {
                register(target);
            }
            Reflect.defineMetadata(EdmSRID, srid, target, targetKey);
        }
    };
}
exports.SRID = SRID;
/** Returns property SRID (decorated by Edm.SRID) */
function getSRID(target, propertyKey) {
    return Reflect.getMetadata(EdmSRID, target.prototype, propertyKey);
}
exports.getSRID = getSRID;
/** Edm.DefaultValue decorator to set property default value */
function DefaultValue(value) {
    return function (target, targetKey, parameterIndex) {
        if (typeof parameterIndex == 'number') {
            const parameterNames = utils_1.getFunctionParameters(target, targetKey);
            const existingParameters = Reflect.getOwnMetadata(EdmParameters, target, targetKey) || [];
            const paramName = parameterNames[parameterIndex];
            const param = existingParameters.filter((p) => p.name == paramName)[0];
            if (param) {
                param.defaultValue = value;
            }
            else {
                existingParameters.push({
                    name: parameterNames[parameterIndex],
                    defaultValue: value
                });
            }
            Reflect.defineMetadata(EdmParameters, existingParameters, target, targetKey);
        }
        else {
            if (typeof target == 'function') {
                register(target);
            }
            Reflect.defineMetadata(EdmDefaultValue, value, target, targetKey);
        }
    };
}
exports.DefaultValue = DefaultValue;
/** Returns property default value (decorated by Edm.DefaultValue) */
function getDefaultValue(target, propertyKey) {
    return Reflect.getMetadata(EdmDefaultValue, target.prototype, propertyKey);
}
exports.getDefaultValue = getDefaultValue;
/** Edm.ConcurrencyMode decorator to set property concurrency mode */
function ConcurrencyMode(mode) {
    return function (target, targetKey) {
        if (typeof target == 'function') {
            register(target);
        }
        Reflect.defineMetadata(EdmConcurrencyMode, mode, target, targetKey);
    };
}
exports.ConcurrencyMode = ConcurrencyMode;
/** Returns property concurrency mode (decorated by Edm.ConcurrencyMode) */
function getConcurrencyMode(target, propertyKey) {
    return Reflect.getMetadata(EdmConcurrencyMode, target.prototype, propertyKey);
}
exports.getConcurrencyMode = getConcurrencyMode;
function operationDecoratorFactory(type, returnType) {
    return function (target, targetKey) {
        const element = function () { };
        element.target = target;
        element.targetKey = targetKey;
        if (typeof returnType == 'function') {
            try {
                Reflect.decorate([returnType()], element.prototype, EdmReturnType);
            }
            catch (err) {
                returnType(element.prototype, EdmReturnType);
            }
        }
        const existingOperations = Reflect.getOwnMetadata(EdmOperations, target) || [];
        existingOperations.push(targetKey);
        Reflect.defineMetadata(EdmOperations, existingOperations, target);
        Reflect.defineMetadata(type, type, target, targetKey);
        Reflect.defineMetadata(EdmReturnType, element, target, targetKey);
    };
}
function ActionImport(target, targetKey) {
    if (arguments.length > 1) {
        return operationDecoratorFactory(EdmAction)(target, targetKey);
    }
    return operationDecoratorFactory(EdmAction, target);
}
exports.ActionImport = ActionImport;
function _Action(target, targetKey) {
    if (arguments.length > 1) {
        return operationDecoratorFactory(EdmAction)(target, targetKey);
    }
    return operationDecoratorFactory(EdmAction, target);
}
exports._Action = _Action;
exports.Action = _Action;
function FunctionImport(target, targetKey) {
    if (arguments.length > 1) {
        return operationDecoratorFactory(EdmFunction)(target, targetKey);
    }
    return operationDecoratorFactory(EdmFunction, target);
}
exports.FunctionImport = FunctionImport;
function _Function(target, targetKey) {
    if (arguments.length > 1) {
        return operationDecoratorFactory(EdmFunction)(target, targetKey);
    }
    return operationDecoratorFactory(EdmFunction, target);
}
exports._Function = _Function;
exports.Function = _Function;
function getOperations(target) {
    return Reflect.getOwnMetadata(EdmOperations, target.prototype) || [];
}
exports.getOperations = getOperations;
function getReturnTypeName(target, propertyKey, container) {
    const returnType = Reflect.getMetadata(EdmReturnType, target.prototype, propertyKey);
    return getTypeName(returnType, EdmReturnType, container) || getTypeName(target, propertyKey, container);
}
exports.getReturnTypeName = getReturnTypeName;
function getReturnType(target, propertyKey, container) {
    const returnType = Reflect.getMetadata(EdmReturnType, target.prototype, propertyKey);
    return getType(returnType, EdmReturnType, container) || getType(target, propertyKey, container);
}
exports.getReturnType = getReturnType;
/** Returns true if property is a statically callable action (decorated by Edm.ActionImport) */
function isActionImport(target, propertyKey) {
    return Reflect.getMetadata(EdmAction, target.prototype, propertyKey) || false;
}
exports.isActionImport = isActionImport;
/** Returns true if property is a statically callable function (decorated by Edm.FunctionImport) */
function isFunctionImport(target, propertyKey) {
    return Reflect.getMetadata(EdmFunction, target.prototype, propertyKey) || false;
}
exports.isFunctionImport = isFunctionImport;
/** Returns true if property is an action (decorated by Edm.Action) */
function isAction(target, propertyKey) {
    return Reflect.getMetadata(EdmAction, target.prototype, propertyKey) || false;
}
exports.isAction = isAction;
/** Returns true if property is an function (decorated by Edm.Function) */
function isFunction(target, propertyKey) {
    return Reflect.getMetadata(EdmFunction, target.prototype, propertyKey) || false;
}
exports.isFunction = isFunction;
/** Edm.ComplexType decorator for describing properties of complex types */
function ComplexType(type) {
    return function (target, targetKey, parameterIndex) {
        if (type && type.__forward__ref__) {
            type = type();
        }
        const baseType = Object.getPrototypeOf(target).constructor;
        if (baseType != Object && getProperties(baseType.prototype).length > 0) {
            ComplexType()(baseType.prototype);
            const children = Reflect.getOwnMetadata(EdmChildren, baseType) || [];
            if (children.indexOf(target.constructor) < 0) {
                children.unshift(target.constructor);
            }
            Reflect.defineMetadata(EdmChildren, children, baseType);
        }
        if (typeof parameterIndex == 'number') {
            const parameterNames = utils_1.getFunctionParameters(target, targetKey);
            const existingParameters = Reflect.getOwnMetadata(EdmParameters, target, targetKey) || [];
            const paramName = parameterNames[parameterIndex];
            let param = existingParameters.filter((p) => p.name == paramName)[0];
            if (param) {
                param.type = type;
            }
            else {
                existingParameters.push(param = {
                    name: paramName,
                    type
                });
            }
            Reflect.defineMetadata(EdmComplexType, true, param.type);
            Reflect.defineMetadata(EdmParameters, existingParameters, target, targetKey);
        }
        else {
            if (typeof target == 'function') {
                register(target);
            }
            const desc = Object.getOwnPropertyDescriptor(target, targetKey);
            if (targetKey && targetKey != EdmType && ((desc && typeof desc.value != 'function') || (!desc && typeof target[targetKey] != 'function'))) {
                const properties = Reflect.getOwnMetadata(EdmProperties, target) || [];
                if (properties.indexOf(targetKey) < 0) {
                    properties.push(targetKey);
                }
                Reflect.defineMetadata(EdmProperties, properties, target);
            }
            if (type) {
                Reflect.defineMetadata(EdmComplexType, true, type);
            }
            Reflect.defineMetadata(EdmComplexType, type || true, target, targetKey);
            Reflect.defineMetadata(EdmType, type, target, targetKey);
        }
    };
}
exports.ComplexType = ComplexType;
/** Returns true if property is a complex type (decorated by Edm.ComplexType) */
function isComplexType(target, propertyKey) {
    return typeof propertyKey == 'string'
        ? Reflect.hasMetadata(EdmComplexType, target.prototype, propertyKey)
        : Reflect.hasMetadata(EdmComplexType, target);
}
exports.isComplexType = isComplexType;
/** Edm.MediaEntity decorator for describing media entity properties */
function MediaEntity(contentType) {
    return Reflect.metadata(EdmMediaEntity, contentType);
}
exports.MediaEntity = MediaEntity;
/** Returns true if property is a media entity (decorated by Edm.MediaEntity) */
function isMediaEntity(target) {
    return Reflect.hasMetadata(EdmMediaEntity, target);
}
exports.isMediaEntity = isMediaEntity;
function getContentType(target, targetKey) {
    return Reflect.getMetadata(EdmMediaEntity, target, targetKey);
}
exports.getContentType = getContentType;
/** Edm.OpenType decorator for describing open type properties */
exports.OpenType = (function OpenType() {
    return Reflect.metadata(EdmOpenType, true);
})();
/** Returns true if property is a open type (decorated by Edm.OpenType) */
function isOpenType(target) {
    return Reflect.hasMetadata(EdmOpenType, target) || false;
}
exports.isOpenType = isOpenType;
/** Edm.EntityType decorator for describing entity types */
function EntityType(type) {
    return function (target, targetKey, parameterIndex) {
        const baseType = Object.getPrototypeOf(target).constructor;
        if (baseType != Object && getProperties(baseType.prototype).length > 0) {
            EntityType()(baseType.prototype);
            const children = Reflect.getOwnMetadata(EdmChildren, baseType) || [];
            if (children.indexOf(target.constructor) < 0) {
                children.unshift(target.constructor);
            }
            Reflect.defineMetadata(EdmChildren, children, baseType);
        }
        if (typeof parameterIndex == 'number') {
            const parameterNames = utils_1.getFunctionParameters(target, targetKey);
            const existingParameters = Reflect.getOwnMetadata(EdmParameters, target, targetKey) || [];
            const paramName = parameterNames[parameterIndex];
            let param = existingParameters.filter((p) => p.name == paramName)[0];
            if (param) {
                param.type = type;
            }
            else {
                existingParameters.push(param = {
                    name: paramName,
                    type
                });
            }
            Reflect.defineMetadata(EdmEntityType, true, param.type);
            Reflect.defineMetadata(EdmParameters, existingParameters, target, targetKey);
        }
        else {
            if (typeof target == 'function') {
                register(target);
            }
            const desc = Object.getOwnPropertyDescriptor(target, targetKey);
            if (targetKey && targetKey != EdmType && ((desc && typeof desc.value != 'function') || (!desc && typeof target[targetKey] != 'function'))) {
                const properties = Reflect.getOwnMetadata(EdmProperties, target) || [];
                if (properties.indexOf(targetKey) < 0) {
                    properties.push(targetKey);
                }
                Reflect.defineMetadata(EdmProperties, properties, target);
            }
            if (type) {
                Reflect.defineMetadata(EdmEntityType, true, type);
            }
            Reflect.defineMetadata(EdmEntityType, type || true, target, targetKey);
            Reflect.defineMetadata(EdmType, type, target, targetKey);
        }
    };
}
exports.EntityType = EntityType;
/** Returns true if property is an EntityType (decorated by Edm.EntityType) */
function isEntityType(target, propertyKey) {
    return typeof propertyKey == 'string'
        ? !Reflect.hasMetadata(EdmComplexType, target.prototype, propertyKey) && Reflect.hasMetadata(EdmEntityType, target.prototype, propertyKey)
        : !Reflect.hasMetadata(EdmComplexType, target) && Reflect.hasMetadata(EdmEntityType, target);
}
exports.isEntityType = isEntityType;
function Flags(target, targetKey) {
    Reflect.defineMetadata(EdmFlags, true, target, targetKey);
}
exports.Flags = Flags;
function isFlags(target, propertyKey) {
    return Reflect.getMetadata(EdmFlags, target.prototype, propertyKey);
}
exports.isFlags = isFlags;
function EnumType(type) {
    return function (target, targetKey, parameterIndex) {
        const baseType = Object.getPrototypeOf(target).constructor;
        if (baseType != Object && getProperties(baseType.prototype).length > 0) {
            EntityType()(baseType.prototype);
            const children = Reflect.getOwnMetadata(EdmChildren, baseType) || [];
            if (children.indexOf(target.constructor) < 0) {
                children.unshift(target.constructor);
            }
            Reflect.defineMetadata(EdmChildren, children, baseType);
        }
        if (typeof parameterIndex == 'number') {
            const parameterNames = utils_1.getFunctionParameters(target, targetKey);
            const existingParameters = Reflect.getOwnMetadata(EdmParameters, target, targetKey) || [];
            const paramName = parameterNames[parameterIndex];
            let param = existingParameters.filter((p) => p.name == paramName)[0];
            if (param) {
                param.type = type;
            }
            else {
                existingParameters.push(param = {
                    name: paramName,
                    type
                });
            }
            Reflect.defineMetadata(EdmEnumType, true, param.type);
            Reflect.defineMetadata(EdmParameters, existingParameters, target, targetKey);
        }
        else {
            if (typeof target == 'function') {
                register(target);
            }
            const desc = Object.getOwnPropertyDescriptor(target, targetKey);
            if (targetKey && targetKey != EdmType && ((desc && typeof desc.value != 'function') || (!desc && typeof target[targetKey] != 'function'))) {
                const properties = Reflect.getOwnMetadata(EdmProperties, target) || [];
                if (properties.indexOf(targetKey) < 0) {
                    properties.push(targetKey);
                }
                Reflect.defineMetadata(EdmProperties, properties, target);
            }
            Reflect.defineMetadata(EdmEnumType, true, target, targetKey);
            Reflect.defineMetadata(EdmType, type, target, targetKey);
        }
    };
}
exports.EnumType = EnumType;
function isEnumType(target, propertyKey) {
    return typeof propertyKey == 'string'
        ? Reflect.hasMetadata(EdmEnumType, target.prototype, propertyKey)
        : Reflect.hasMetadata(EdmEnumType, target);
}
exports.isEnumType = isEnumType;
function TypeDefinition(type) {
    return function (target, targetKey, parameterIndex) {
        const baseType = Object.getPrototypeOf(target).constructor;
        if (baseType != Object && getProperties(baseType.prototype).length > 0) {
            EntityType()(baseType.prototype);
            const children = Reflect.getOwnMetadata(EdmChildren, baseType) || [];
            if (children.indexOf(target.constructor) < 0) {
                children.unshift(target.constructor);
            }
            Reflect.defineMetadata(EdmChildren, children, baseType);
        }
        if (typeof parameterIndex == 'number') {
            const parameterNames = utils_1.getFunctionParameters(target, targetKey);
            const existingParameters = Reflect.getOwnMetadata(EdmParameters, target, targetKey) || [];
            const paramName = parameterNames[parameterIndex];
            let param = existingParameters.filter((p) => p.name == paramName)[0];
            if (param) {
                param.type = type;
            }
            else {
                existingParameters.push(param = {
                    name: paramName,
                    type
                });
            }
            Reflect.defineMetadata(EdmTypeDefinition, true, param.type);
            Reflect.defineMetadata(EdmParameters, existingParameters, target, targetKey);
        }
        else {
            if (typeof target == 'function') {
                register(target);
            }
            const desc = Object.getOwnPropertyDescriptor(target, targetKey);
            if (targetKey && targetKey != EdmType && ((desc && typeof desc.value != 'function') || (!desc && typeof target[targetKey] != 'function'))) {
                const properties = Reflect.getOwnMetadata(EdmProperties, target) || [];
                if (properties.indexOf(targetKey) < 0) {
                    properties.push(targetKey);
                }
                Reflect.defineMetadata(EdmProperties, properties, target);
            }
            Reflect.defineMetadata(EdmTypeDefinition, true, target, targetKey);
            Reflect.defineMetadata(EdmType, type, target, targetKey);
        }
    };
}
exports.TypeDefinition = TypeDefinition;
function isTypeDefinition(target, propertyKey) {
    return typeof propertyKey == 'string'
        ? Reflect.hasMetadata(EdmTypeDefinition, target.prototype, propertyKey)
        : Reflect.hasMetadata(EdmTypeDefinition, target);
}
exports.isTypeDefinition = isTypeDefinition;
function register(type) {
    if (EdmContainer.indexOf(type) < 0) {
        EdmContainer.push(type);
    }
}
exports.register = register;
function Convert(converter) {
    return function (target, targetKey) {
        if (typeof target == 'function') {
            register(target);
        }
        Reflect.defineMetadata(EdmConverter, converter, target, targetKey);
    };
}
exports.Convert = Convert;
function getConverter(target, propertyKey) {
    return Reflect.getMetadata(EdmConverter, target.prototype, propertyKey);
}
exports.getConverter = getConverter;
function Serialize(converter) {
    return function (target, targetKey) {
        if (typeof target == 'function') {
            register(target);
        }
        Reflect.defineMetadata(EdmSerializer, converter, target, targetKey);
    };
}
exports.Serialize = Serialize;
function getSerializer(target, propertyKey, type, container) {
    return Reflect.getMetadata(EdmSerializer, target.prototype, propertyKey) ||
        (type && container && Reflect.getMetadata(EdmSerializer, Object.getPrototypeOf(container), container.resolve(type)));
}
exports.getSerializer = getSerializer;
function Deserialize(converter) {
    return function (target, targetKey) {
        if (typeof target == 'function') {
            register(target);
        }
        Reflect.defineMetadata(EdmDeserializer, converter, target, targetKey);
    };
}
exports.Deserialize = Deserialize;
function getDeserializer(target, propertyKey, type, container) {
    return Reflect.getMetadata(EdmDeserializer, target.prototype, propertyKey) ||
        (type && container && Reflect.getMetadata(EdmDeserializer, Object.getPrototypeOf(container), container.resolve(type)));
}
exports.getDeserializer = getDeserializer;
function URLSerialize(converter) {
    return function (target, targetKey) {
        if (typeof target == 'function') {
            register(target);
        }
        Reflect.defineMetadata(EdmURLSerializer, converter, target, targetKey);
    };
}
exports.URLSerialize = URLSerialize;
function getURLSerializer(target, propertyKey, type, container) {
    return Reflect.getMetadata(EdmURLSerializer, target.prototype, propertyKey) ||
        (type && container && Reflect.getMetadata(EdmURLSerializer, Object.getPrototypeOf(container), container.resolve(type)));
}
exports.getURLSerializer = getURLSerializer;
function URLDeserialize(converter) {
    return function (target, targetKey) {
        if (typeof target == 'function') {
            register(target);
        }
        Reflect.defineMetadata(EdmURLDeserializer, converter, target, targetKey);
    };
}
exports.URLDeserialize = URLDeserialize;
function getURLDeserializer(target, propertyKey, type, container) {
    return Reflect.getMetadata(EdmURLDeserializer, target.prototype, propertyKey) ||
        (type && container && Reflect.getMetadata(EdmURLDeserializer, Object.getPrototypeOf(container), container.resolve(type)));
}
exports.getURLDeserializer = getURLDeserializer;
function Annotate(...annotation) {
    return function (target, targetKey) {
        if (typeof target == 'function') {
            register(target);
        }
        let existingAnnotations = Reflect.getOwnMetadata(EdmAnnotations, target, targetKey) || [];
        existingAnnotations = annotation.concat(existingAnnotations);
        Reflect.defineMetadata(EdmAnnotations, existingAnnotations, target, targetKey);
    };
}
exports.Annotate = Annotate;
function getAnnotations(target, targetKey) {
    try {
        return Reflect.getOwnMetadata(EdmAnnotations, target.prototype, targetKey) || Reflect.getOwnMetadata(EdmAnnotations, target, targetKey) || [];
    }
    catch (_a) {
        return Reflect.getOwnMetadata(EdmAnnotations, target, targetKey) || [];
    }
}
exports.getAnnotations = getAnnotations;
/** Edm.ForeignKey decorator for describing properties as foreign keys */
function ForeignKey(...keys) {
    return function (target, targetKey) {
        if (typeof target == 'function') {
            register(target);
        }
        let existingForeignKeys = Reflect.getOwnMetadata(EdmForeignKeys, target, targetKey) || [];
        existingForeignKeys = keys.concat(existingForeignKeys);
        Reflect.defineMetadata(EdmForeignKeys, existingForeignKeys, target, targetKey);
    };
}
exports.ForeignKey = ForeignKey;
/** Edm.ForeignKey decorator for describing properties as foreign keys */
function getForeignKeys(target, targetKey) {
    return Reflect.getOwnMetadata(EdmForeignKeys, target.prototype, targetKey) || Reflect.getOwnMetadata(EdmForeignKeys, target, targetKey) || [];
}
exports.getForeignKeys = getForeignKeys;
/** Returns property names that are foreign keys (names of properties decorated by Edm.ForeignKey) */
function Partner(property) {
    return Reflect.metadata(EdmPartnerProperty, property);
}
exports.Partner = Partner;
function getPartner(target, targetKey) {
    return Reflect.getMetadata(EdmPartnerProperty, target, targetKey) || Reflect.getMetadata(EdmPartnerProperty, target.prototype, targetKey);
}
exports.getPartner = getPartner;
/** Edm.EntitySet decorator for describing entity sets */
function EntitySet(name) {
    return function (controller) {
        controller.prototype.entitySetName = name;
    };
}
exports.EntitySet = EntitySet;
/** Helper function to use references declared later
 * @param forwardRefFn a function returning the reference
 */
function ForwardRef(forwardRefFn) {
    const fwd = function () {
        return forwardRefFn();
    };
    fwd.__forward__ref__ = true;
    return fwd;
}
exports.ForwardRef = ForwardRef;
function Container(type) {
    return function (server) {
        if (!(type.prototype instanceof ContainerBase)) {
            util.inherits(type, ContainerBase);
        }
        server.container = new type(server);
    };
}
exports.Container = Container;
exports.EdmContainerClass = class {
    constructor(_) { }
    resolve(type) {
        for (const prop in this) {
            if (this[prop] == type) {
                return prop;
            }
        }
        return null;
    }
};
class ContainerBase extends exports.EdmContainerClass {
}
exports.ContainerBase = ContainerBase;
//# sourceMappingURL=edm.js.map