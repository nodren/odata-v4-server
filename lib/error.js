"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BadRequestError = exports.UnsupportedMediaTypeError = exports.MethodNotAllowedError = exports.ResourceNotFoundError = exports.NotImplementedError = exports.ServerInternalError = exports.HttpRequestError = exports.ForeignKeyValidationError = exports.PropertyDefinitionError = exports.StartupError = exports.CustomError = void 0;
const utils_1 = require("@newdash/inject/lib/utils");
class CustomError extends Error {
    constructor(message) {
        super(message);
        this.message = message;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, (this === null || this === void 0 ? void 0 : this.constructor) || CustomError);
    }
}
exports.CustomError = CustomError;
class StartupError extends CustomError {
    constructor(message = 'validation failed') {
        super(message);
    }
}
exports.StartupError = StartupError;
class PropertyDefinitionError extends CustomError {
    constructor(message) {
        super(message);
    }
    static wrongDBType(reflectType, databaseType) {
        const reflectTypeName = typeof reflectType === 'string' ? reflectType : utils_1.getClassName(reflectType);
        return new PropertyDefinitionError(`can not use database type '${databaseType}' with js type ${reflectTypeName}.`);
    }
}
exports.PropertyDefinitionError = PropertyDefinitionError;
class ForeignKeyValidationError extends StartupError {
    constructor(message = 'fk validation failed') {
        super(message);
    }
}
exports.ForeignKeyValidationError = ForeignKeyValidationError;
class HttpRequestError extends CustomError {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.innerErrors = [];
    }
    addInnerError(error) {
        this.innerErrors.push(error);
        return this;
    }
    getInnerErrors() {
        return this.innerErrors;
    }
    getStatusCode() {
        return this.statusCode;
    }
}
exports.HttpRequestError = HttpRequestError;
class ServerInternalError extends HttpRequestError {
    constructor(message = 'Server Internal Error') {
        super(500, message);
    }
}
exports.ServerInternalError = ServerInternalError;
class NotImplementedError extends HttpRequestError {
    constructor(message = 'Not implemented.') {
        super(501, message);
    }
}
exports.NotImplementedError = NotImplementedError;
class ResourceNotFoundError extends HttpRequestError {
    constructor(message = 'Resource not found.') {
        super(404, message);
    }
}
exports.ResourceNotFoundError = ResourceNotFoundError;
class MethodNotAllowedError extends HttpRequestError {
    constructor(message = 'Method not allowed.') {
        super(405, message);
    }
}
exports.MethodNotAllowedError = MethodNotAllowedError;
class UnsupportedMediaTypeError extends HttpRequestError {
    constructor(message = 'Unsupported media type.') {
        super(415, message);
    }
}
exports.UnsupportedMediaTypeError = UnsupportedMediaTypeError;
class BadRequestError extends HttpRequestError {
    constructor(message = 'Bad Request') {
        super(400, message);
    }
}
exports.BadRequestError = BadRequestError;
//# sourceMappingURL=error.js.map