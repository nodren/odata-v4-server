"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.oInject = exports.injectTransactionConnection = exports.injectGlobalConnection = exports.injectTheContainer = exports.injectServer = exports.injectBody = exports.injectService = void 0;
const inject_1 = require("@newdash/inject");
require("reflect-metadata");
const constants_1 = require("../../constants");
const error_1 = require("../../error");
/**
 * inject odata service of entity type
 *
 * @param entityType entity class or lazy ref
 */
function injectService(entityType) {
    if (!(entityType instanceof inject_1.LazyRef)) {
        throw new error_1.StartupError(`must provide a lazy ref to avoid undefined issue for cycle reference.`);
    }
    return function (target, targetKey, parameterIndex) {
        inject_1.inject.param(constants_1.InjectKey.ODataTypedService, entityType)(target, targetKey, parameterIndex);
        inject_1.inject(constants_1.InjectKey.InjectODataService)(target, targetKey, parameterIndex);
    };
}
exports.injectService = injectService;
/**
 * inject request body
 *
 * @param target
 * @param targetKey
 * @param parameterIndex
 */
exports.injectBody = (target, targetKey, parameterIndex) => {
    inject_1.inject(constants_1.InjectKey.RequestBody)(target, targetKey, parameterIndex);
};
/**
 * inject server type
 *
 * @param target
 * @param targetKey
 * @param parameterIndex
 */
exports.injectServer = (target, targetKey, parameterIndex) => {
    inject_1.inject(constants_1.InjectKey.ServerType)(target, targetKey, parameterIndex);
};
/**
 * inject InjectContainer
 *
 * @param target
 * @param targetKey
 * @param parameterIndex
 */
exports.injectTheContainer = (target, targetKey, parameterIndex) => {
    inject_1.inject(inject_1.InjectContainer)(target, targetKey, parameterIndex);
};
exports.injectGlobalConnection = (target, targetKey, parameterIndex) => {
    inject_1.inject(constants_1.InjectKey.GlobalConnection)(target, targetKey, parameterIndex);
};
exports.injectTransactionConnection = (target, targetKey, parameterIndex) => {
    inject_1.inject(constants_1.InjectKey.TransactionConnection)(target, targetKey, parameterIndex);
};
/**
 * alias for odata inject
 */
exports.oInject = {
    server: exports.injectServer,
    service: injectService,
    body: exports.injectBody,
    container: exports.injectTheContainer,
    globalConnection: exports.injectGlobalConnection,
    txConnection: exports.injectTransactionConnection
};
//# sourceMappingURL=inject.js.map