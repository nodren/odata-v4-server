"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ODataEntity = exports.ODataEntityBase = exports.ODataBase = exports.parameters = exports.parameter = exports.getTypeParameter = exports.getIdParameter = exports.id = exports.getResultParameter = exports.result = exports.getStreamParameter = exports.stream = exports.getInjectContainerParameter = exports.getTxContextParameter = exports.getContextParameter = exports.getTypedServiceInfo = exports.typedService = exports.injectContainer = exports.txContext = exports.context = exports.getBodyParameter = exports.body = exports.getFilterParameter = exports.filter = exports.getQueryParameter = exports.query = exports.createMethodParameterGetter = exports.createMethodParameterAnnotation = exports.findODataMethod = exports.getLinks = exports.link = exports.getKeys = exports.key = exports.getMethod = exports.method = exports.deleteRef = exports.updateRef = exports.createRef = exports.DELETE = exports.PATCH = exports.PUT = exports.POST = exports.GET = exports.cors = exports.getPublicControllers = exports.controller = exports.error = exports.validation = exports.connector = exports.parser = exports.container = exports.getNamespace = exports.namespace = exports.withController = exports.entitySet = exports.type = exports.ODataMethodType = void 0;
const inject_1 = require("@newdash/inject");
require("reflect-metadata");
const constants_1 = require("./constants");
const edm_1 = require("./edm");
const utils_1 = require("./utils");
class ODataMethodType {
}
exports.ODataMethodType = ODataMethodType;
ODataMethodType.GET = 'GET';
ODataMethodType.POST = 'POST';
ODataMethodType.PUT = 'PUT';
ODataMethodType.PATCH = 'PATCH';
ODataMethodType.DELETE = 'DELETE';
const { ODataEntitySets, ODataMethod, ODataKeyParameters, ODataLinkParameters, ODataQueryParameter, ODataFilterParameter, ODataBodyParameter, ODataContextParameter, ODataStreamParameter, ODataResultParameter, ODataIdParameter, ODataTypeParameter, ODataNamespace, ODataTxContextParameter, ODataInjectContainer, ODataTypedService } = constants_1.InjectKey;
function type(elementType, targetKey, parameterIndex) {
    if (typeof parameterIndex == 'number') {
        const target = elementType;
        const parameterNames = utils_1.getFunctionParameters(target, targetKey);
        const paramName = parameterNames[parameterIndex];
        Reflect.defineMetadata(ODataTypeParameter, paramName, target, targetKey);
        inject_1.inject(ODataTypeParameter)(target, targetKey, parameterIndex);
    }
    else {
        return function (constructor) {
            constructor.prototype.elementType = elementType;
        };
    }
}
exports.type = type;
/**
 * set EntitySet name of a controller
 * @alias Edm.EntitySet
 */
function entitySet(name) {
    return edm_1.EntitySet(name);
}
exports.entitySet = entitySet;
/**
 * @alias odata.controller
 */
exports.withController = controller;
/** Set namespace
 * @param namespace Namespace to be set
 */
function namespace(namespace) {
    return function (target, targetKey) {
        if (targetKey) {
            if (target[targetKey]) {
                target[targetKey].namespace = namespace;
            }
            else {
                Reflect.defineMetadata(ODataNamespace, namespace, target, targetKey);
            }
        }
        else {
            target.namespace = namespace;
        }
    };
}
exports.namespace = namespace;
function getNamespace(target, targetKey) {
    return Reflect.getMetadata(ODataNamespace, target.prototype, targetKey) || (target[targetKey] || target).namespace;
}
exports.getNamespace = getNamespace;
/** Set container
 * @param name  Name of the container
 */
function container(name) {
    return function (target, targetKey) {
        if (targetKey) {
            target[targetKey].containerName = name;
        }
        else {
            target.containerName = name;
        }
    };
}
exports.container = container;
/** Set parser
 * @param parser Parser to use (@odata/parser compatible functional parser)
 */
function parser(parser) {
    return function (target) {
        target.parser = parser;
    };
}
exports.parser = parser;
/** Attach connector
 * @param connector Connector to use
 */
function connector(connector) {
    return function (target) {
        target.connector = connector;
    };
}
exports.connector = connector;
/** Attach validator
 * @param connector Connector to use
 */
function validation(validator, options) {
    return function (target) {
        target.validator = function (odataQuery) {
            return validator.validate(odataQuery, options);
        };
    };
}
exports.validation = validation;
/** Set error handler
 * @param errorHandler Error request handler to use
 */
function error(errorHandler) {
    return function (target) {
        target.errorHandler = errorHandler;
    };
}
exports.error = error;
/** Class decorator for server that binds the given controller to the server.
 * @param controller    Controller to be bind to the server.
 * @param entitySetName The name of the entity set.
 * @param elementType   Type of the element.
 */
function controller(controller, entitySetName, elementType) {
    return function (server) {
        server.prototype[controller.name] = controller;
        entitySetName = (typeof entitySetName == 'string' ? entitySetName : '') || controller.prototype.entitySetName || (entitySetName === true ? controller.name.replace('Controller', '') : false);
        if (entitySetName) {
            const entitySets = Reflect.getOwnMetadata(ODataEntitySets, server) || {};
            entitySets[entitySetName] = controller;
            Reflect.defineMetadata(ODataEntitySets, entitySets, server);
        }
        else {
            // throw error here
        }
        if (elementType) {
            controller.prototype.elementType = elementType;
        }
        if (!controller.prototype.elementType) {
            controller.prototype.elementType = Object;
        }
        // overwrite entity name with controller name
        edm_1.EntityType(controller.prototype.elementType)(server.prototype, controller.name);
    };
}
exports.controller = controller;
/** Gives the public controllers of the given server
 * @param server
 */
function getPublicControllers(server) {
    return Reflect.getOwnMetadata(ODataEntitySets, server) || {};
}
exports.getPublicControllers = getPublicControllers;
/** Enables CORS on your server
 * @param server The server where you turn the CORS on
 * */
exports.cors = (function cors() {
    return function (server) {
        server.cors = true;
    };
})();
function odataMethodFactory(type, navigationProperty) {
    if (type.indexOf('/') < 0) {
        type = type.toLowerCase();
    }
    const decorator = function (target, targetKey) {
        const existingMethods = Reflect.getMetadata(ODataMethod, target, targetKey) || [];
        existingMethods.unshift(type);
        Reflect.defineMetadata(ODataMethod, existingMethods, target, targetKey);
    };
    const createRefFn = function (navigationProperty) {
        const fn = odataMethodFactory(`${type}/${navigationProperty}`);
        fn.$ref = function (target, targetKey) {
            const existingMethods = Reflect.getMetadata(ODataMethod, target, targetKey) || [];
            existingMethods.unshift(`${type}/${navigationProperty}/$ref`);
            Reflect.defineMetadata(ODataMethod, existingMethods, target, targetKey);
        };
        return fn;
    };
    if (typeof navigationProperty == 'string') {
        return createRefFn(navigationProperty);
    }
    const fn = function (target, targetKey) {
        if (typeof target == 'string') {
            return createRefFn(target);
        }
        if (arguments.length == 0) {
            return fn;
        }
        decorator(target, targetKey);
    };
    fn.$value = function (target, targetKey) {
        const existingMethods = Reflect.getMetadata(ODataMethod, target, targetKey) || [];
        existingMethods.unshift(`${type}/$value`);
        Reflect.defineMetadata(ODataMethod, existingMethods, target, targetKey);
    };
    return fn;
}
/** Annotate function for OData GET operation */
exports.GET = odataMethodFactory('GET');
/** Annotate function for OData POST operation */
exports.POST = odataMethodFactory('POST');
/** Annotate function for OData PUT operation */
exports.PUT = odataMethodFactory('PUT');
/** Annotate function for OData PATCH operation */
exports.PATCH = odataMethodFactory('PATCH');
/** Annotate function for OData DELETE operation */
exports.DELETE = odataMethodFactory('DELETE');
/** Create reference for OData POST operation
 * @param navigationProperty Navigation property name to handle
 */
function createRef(navigationProperty) {
    return exports.POST(navigationProperty).$ref;
}
exports.createRef = createRef;
/** Update reference for OData PUT operation
 * @param navigationProperty Navigation property name to handle
 */
function updateRef(navigationProperty) {
    return exports.PUT(navigationProperty).$ref;
}
exports.updateRef = updateRef;
/** Delete reference for OData DELETE operation
 * @param navigationProperty Navigation property name to handle
 */
function deleteRef(navigationProperty) {
    return exports.DELETE(navigationProperty).$ref;
}
exports.deleteRef = deleteRef;
/** Annotate function for a specified OData method operation */
function method(method, navigationProperty) {
    return odataMethodFactory(method.toUpperCase(), navigationProperty);
}
exports.method = method;
/** get metadata value of ODataMethod on the prototype chain of target or targetKey
 * @param target    The prototype of the class for an instance member
 * @param targetKey The name of the class method
 */
function getMethod(target, targetKey) {
    return Reflect.getMetadata(ODataMethod, target.prototype, targetKey);
}
exports.getMethod = getMethod;
/** Gives the entity key
 * @param target            The prototype of the class for an instance member
 * @param targetKey         The name of the class method
 * @param parameterIndex    The ordinal index of the parameter in the function’s parameter list
 */
function key(target, targetKey, parameterIndex) {
    let name;
    const decorator = function (target, targetKey, parameterIndex) {
        const parameterNames = utils_1.getFunctionParameters(target, targetKey);
        const existingParameters = Reflect.getOwnMetadata(ODataKeyParameters, target, targetKey) || [];
        const paramName = parameterNames[parameterIndex];
        existingParameters.push({
            from: name || paramName,
            to: paramName
        });
        Reflect.defineMetadata(ODataKeyParameters, existingParameters, target, targetKey);
        inject_1.inject(ODataKeyParameters)(target, targetKey, parameterIndex);
    };
    if (typeof target == 'string' || typeof target == 'undefined' || !target) {
        name = target;
        return decorator;
    }
    return decorator(target, targetKey, parameterIndex);
}
exports.key = key;
/**
 * Gives the decorated key parameter.
 * @param target    The prototype of the class for an instance member
 * @param targetKey The name of the class method
 */
function getKeys(target, targetKey) {
    return Reflect.getMetadata(ODataKeyParameters, target.prototype, targetKey) || [];
}
exports.getKeys = getKeys;
/** Gives the identifier of the referenced entity.
 * @param target            The prototype of the class for an instance member
 * @param targetKey         The name of the class method
 * @param parameterIndex    The ordinal index of the parameter in the function’s parameter list
 */
function link(target, targetKey, parameterIndex) {
    let name;
    const decorator = function (target, targetKey, parameterIndex) {
        const parameterNames = utils_1.getFunctionParameters(target, targetKey);
        const existingParameters = Reflect.getOwnMetadata(ODataLinkParameters, target, targetKey) || [];
        const paramName = parameterNames[parameterIndex];
        existingParameters.push({
            from: name || paramName,
            to: paramName
        });
        Reflect.defineMetadata(ODataLinkParameters, existingParameters, target, targetKey);
        inject_1.inject(ODataLinkParameters)(target, targetKey, parameterIndex);
    };
    if (typeof target == 'string' || typeof target == 'undefined' || !target) {
        name = target;
        return decorator;
    }
    return decorator(target, targetKey, parameterIndex);
}
exports.link = link;
/** Gives the decorated link parameter.
 * @param target    The prototype of the class for an instance member
 * @param targetKey The name of the class method
 */
function getLinks(target, targetKey) {
    return Reflect.getMetadata(ODataLinkParameters, target.prototype, targetKey) || [];
}
exports.getLinks = getLinks;
/**
 * Finds the given OData method
 * return metadata of this method
 *
 * @param {any} target
 * @param {any} method
 * @param {any} keys
 */
function findODataMethod(target, method, keys) {
    keys = keys || [];
    const propNames = utils_1.getAllPropertyNames(target.prototype);
    for (const prop of propNames) {
        if (getMethod(target, prop) && getMethod(target, prop).indexOf(method) >= 0) {
            const fnKeys = getKeys(target, prop);
            if (keys.length == fnKeys.length) {
                return {
                    call: prop,
                    key: fnKeys,
                    link: getLinks(target, prop)
                };
            }
        }
    }
    for (const prop of propNames) {
        if (prop == method.toLowerCase()) {
            const fnKeys = getKeys(target, prop);
            if (keys.length == fnKeys.length) {
                return {
                    call: prop,
                    key: fnKeys,
                    link: getLinks(target, prop)
                };
            }
        }
    }
    for (const prop of propNames) {
        if (getMethod(target, prop) && getMethod(target, prop).indexOf(method) >= 0) {
            return {
                call: prop,
                key: [],
                link: getLinks(target, prop)
            };
        }
    }
    for (const prop of propNames) {
        if (prop == method.toLowerCase()) {
            return {
                call: prop,
                key: [],
                link: getLinks(target, prop)
            };
        }
    }
    return null;
}
exports.findODataMethod = findODataMethod;
/**
 * method parameter annotation creator
 *
 * @private
 * @ignore
 * @internal
 * @param key the metadata key
 */
exports.createMethodParameterAnnotation = (key) => function (target, targetKey, parameterIndex) {
    const parameterNames = utils_1.getFunctionParameters(target, targetKey);
    const paramName = parameterNames[parameterIndex];
    Reflect.defineMetadata(key, paramName, target, targetKey);
    inject_1.inject(key)(target, targetKey, parameterIndex);
};
/**
 * method parameter getter creator
 *
 * @private
 * @ignore
 * @internal
 * @param key the metadata key
 */
exports.createMethodParameterGetter = (key) => (target, targetKey) => Reflect.getMetadata(key, target.prototype, targetKey);
/** Provides access to all OData query options.
 * @param target            The prototype of the class for an instance member
 * @param targetKey         The name of the class method
 * @param parameterIndex    The ordinal index of the parameter in the function’s parameter list
 */
exports.query = exports.createMethodParameterAnnotation(ODataQueryParameter);
/** Gives the decorated query parameter.
 * @param target    The prototype of the class for an instance member
 * @param targetKey The name of the class method
 */
exports.getQueryParameter = exports.createMethodParameterGetter(ODataQueryParameter);
/** Gives filter information and provides the AST tree of the OData $filter.
 * @param target            The prototype of the class for an instance member
 * @param targetKey         The name of the class method
 * @param parameterIndex    The ordinal index of the parameter in the function’s parameter list
 */
exports.filter = exports.createMethodParameterAnnotation(ODataFilterParameter);
/** Gives the decorated filter parameter.
 * @param target    The prototype of the class for an instance member
 * @param targetKey The name of the class method
 */
exports.getFilterParameter = exports.createMethodParameterGetter(ODataFilterParameter);
/** Gives the body of the OData request.
 * @param target            The prototype of the class for an instance member
 * @param targetKey         The name of the class method
 * @param parameterIndex    The ordinal index of the parameter in the function’s parameter list
 */
exports.body = exports.createMethodParameterAnnotation(ODataBodyParameter);
/** Gives the decorated body parameter.
 * @param target    The prototype of the class for an instance member
 * @param targetKey The name of the class method
 */
exports.getBodyParameter = exports.createMethodParameterGetter(ODataBodyParameter);
/** Gives the current execution context.
 * @param target            The prototype of the class for an instance member
 * @param targetKey         The name of the class method
 * @param parameterIndex    The ordinal index of the parameter in the function’s parameter list
 */
exports.context = exports.createMethodParameterAnnotation(ODataContextParameter);
/**
 *
 * Gives the current transaction context.
 *
 * @param target            The prototype of the class for an instance member
 * @param targetKey         The name of the class method
 * @param parameterIndex    The ordinal index of the parameter in the function’s parameter list
 */
exports.txContext = exports.createMethodParameterAnnotation(ODataTxContextParameter);
/**
 *
 * Gives the current transaction context.
 *
 * @param target            The prototype of the class for an instance member
 * @param targetKey         The name of the class method
 * @param parameterIndex    The ordinal index of the parameter in the function’s parameter list
 */
exports.injectContainer = exports.createMethodParameterAnnotation(ODataInjectContainer);
function typedService(serviceType) {
    return function (target, targetKey, parameterIndex) {
        const parameterNames = utils_1.getFunctionParameters(target, targetKey);
        const paramName = parameterNames[parameterIndex];
        const info = {
            serviceType,
            paramName
        };
        Reflect.defineMetadata(ODataTypedService, paramName, target, targetKey);
    };
}
exports.typedService = typedService;
function getTypedServiceInfo(target, targetKey) {
    return Reflect.getMetadata(ODataTypedService, target.prototype, targetKey);
}
exports.getTypedServiceInfo = getTypedServiceInfo;
/** Gives the decorated context parameter.
 * @param target    The prototype of the class for an instance member
 * @param targetKey The name of the class method
 */
exports.getContextParameter = exports.createMethodParameterGetter(ODataContextParameter);
/**
 * Gives the decorated tx context parameter.
 * @param target    The prototype of the class for an instance member
 * @param targetKey The name of the class method
 */
exports.getTxContextParameter = exports.createMethodParameterGetter(ODataTxContextParameter);
/**
 * Gives the decorated inject container parameter
 *
 * @param target    The prototype of the class for an instance member
 * @param targetKey The name of the class method
 */
exports.getInjectContainerParameter = exports.createMethodParameterGetter(ODataInjectContainer);
/** Gives a writable stream that will perform OData result transformation on the result and then sends it forward to your response stream.
 * @param target            The prototype of the class for an instance member
 * @param targetKey         The name of the class method
 * @param parameterIndex    The ordinal index of the parameter in the function’s parameter list
 */
exports.stream = exports.createMethodParameterAnnotation(ODataStreamParameter);
/** Gives the decorated stream parameter.
 * @param target    The prototype of the class for an instance member
 * @param targetKey The name of the class method
 */
function getStreamParameter(target, targetKey) {
    return Reflect.getMetadata(ODataStreamParameter, target.prototype, targetKey);
}
exports.getStreamParameter = getStreamParameter;
/** Gives the result from the last part from the resource path of the OData URL. This ensures the access to an entity in context of your action or function.
 * @param target            The prototype of the class for an instance member
 * @param targetKey         The name of the class method
 * @param parameterIndex    The ordinal index of the parameter in the function’s parameter list
 */
exports.result = exports.createMethodParameterAnnotation(ODataResultParameter);
/** Gives the decorated result parameter.
 * @param target    The prototype of the class for an instance member
 * @param targetKey The name of the class method
 */
exports.getResultParameter = exports.createMethodParameterGetter(ODataResultParameter);
/** Gives the url that was provided either in request body as @odata.id or in query parameters as $id.
 * @param target            The prototype of the class for an instance member
 * @param targetKey         The name of the class method
 * @param parameterIndex    The ordinal index of the parameter in the function’s parameter list
 */
exports.id = exports.createMethodParameterAnnotation(ODataIdParameter);
/** Gives the decorated id parameter.
 * @param target    The prototype of the class for an instance member
 * @param targetKey The name of the class method
 */
exports.getIdParameter = exports.createMethodParameterGetter(ODataIdParameter);
/** Gives the decorated type parameter.
 * @param target    The prototype of the class for an instance member
 * @param targetKey The name of the class method
 */
exports.getTypeParameter = exports.createMethodParameterGetter(ODataTypeParameter);
/**
 * Sets a parameter decorator for the given parameter.
 * @param name The name of the parameter.
 * @param type OData decorator type.
 */
function parameter(name, type) {
    return function (target, targetKey) {
        const parameterNames = utils_1.getFunctionParameters(target, targetKey);
        const parameterIndex = parameterNames.indexOf(name);
        if (parameterIndex >= 0) {
            type(target, targetKey, parameterIndex);
        }
    };
}
exports.parameter = parameter;
/**
 * Sets parameter decorators for the given parameters.
 * @param parameters Object that contains the name of the parameter as key and the type of the parameter as value.
 */
function parameters(parameters) {
    return function (target, targetKey) {
        for (const prop in parameters) {
            parameter(prop, parameters[prop])(target, targetKey);
        }
    };
}
exports.parameters = parameters;
function ODataBase(Base) {
    class ODataBaseClass extends Base {
        /** Define class, properties and parameters with decorators */
        static define(...decorators) {
            decorators.forEach((decorator) => {
                if (typeof decorator == 'function') {
                    decorator(this);
                }
                else if (typeof decorator == 'object') {
                    const props = Object.keys(decorator);
                    props.forEach((prop) => {
                        let propDecorators = decorator[prop];
                        if (!Array.isArray(propDecorators)) {
                            propDecorators = [propDecorators];
                        }
                        propDecorators.forEach((propDecorator) => {
                            if (typeof propDecorator == 'function') {
                                propDecorator(this.prototype, prop);
                            }
                            else if (typeof propDecorator == 'object') {
                                const params = Object.keys(propDecorator);
                                const parameterNames = utils_1.getFunctionParameters(this.prototype[prop]);
                                params.forEach((param) => {
                                    let paramDecorators = propDecorator[param];
                                    if (!Array.isArray(paramDecorators)) {
                                        paramDecorators = [paramDecorators];
                                    }
                                    paramDecorators.forEach((paramDecorator) => {
                                        if (typeof paramDecorator == 'function') {
                                            paramDecorator(this.prototype, prop, parameterNames.indexOf(param));
                                        }
                                        else {
                                            throw new Error(`Unsupported parameter decorator on ${this.name || this} at ${prop}.${param} using ${paramDecorator}`);
                                        }
                                    });
                                });
                            }
                            else {
                                throw new Error(`Unsupported member decorator on ${this.name || this} at ${prop} using ${propDecorator}`);
                            }
                        });
                    });
                }
                else {
                    throw new Error(`Unsupported decorator on ${this.name || this} using ${decorator}`);
                }
            });
            return this;
        }
    }
    return ODataBaseClass;
}
exports.ODataBase = ODataBase;
class ODataEntityBase {
}
exports.ODataEntityBase = ODataEntityBase;
class ODataEntity extends ODataBase(ODataEntityBase) {
}
exports.ODataEntity = ODataEntity;
//# sourceMappingURL=odata.js.map