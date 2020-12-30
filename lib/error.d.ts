import { Class } from './type/types';
export declare class CustomError extends Error {
    constructor(message?: string);
}
export declare class StartupError extends CustomError {
    constructor(message?: string);
}
export declare class PropertyDefinitionError extends CustomError {
    constructor(message: string);
    static wrongDBType(reflectType: Class | string, databaseType: string): PropertyDefinitionError;
}
export declare class ForeignKeyValidationError extends StartupError {
    constructor(message?: string);
}
export declare class HttpRequestError extends CustomError {
    statusCode: number;
    innerErrors: Array<CustomError>;
    constructor(statusCode: number, message: string);
    addInnerError(error: CustomError): this;
    getInnerErrors(): CustomError[];
    getStatusCode(): number;
}
export declare class ServerInternalError extends HttpRequestError {
    constructor(message?: string);
}
export declare class NotImplementedError extends HttpRequestError {
    constructor(message?: string);
}
export declare class ResourceNotFoundError extends HttpRequestError {
    constructor(message?: string);
}
export declare class MethodNotAllowedError extends HttpRequestError {
    constructor(message?: string);
}
export declare class UnsupportedMediaTypeError extends HttpRequestError {
    constructor(message?: string);
}
export declare class BadRequestError extends HttpRequestError {
    constructor(message?: string);
}
