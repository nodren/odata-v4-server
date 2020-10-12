import { getClassName } from '@newdash/inject/lib/utils';
import { Class } from './type/types';

export class CustomError extends Error {
  constructor(message?: string) {
    super(message);
    this.message = message;
    this.name = (this as any).constructor.name;
    Error.captureStackTrace(this, this?.constructor || CustomError);
  }
}

export class StartupError extends CustomError {

  constructor(message = 'validation failed') {
    super(message);
  }

}


export class PropertyDefinitionError extends CustomError {
  constructor(message: string) {
    super(message);
  }

  static wrongDBType(reflectType: Class | string, databaseType: string) {
    const reflectTypeName = typeof reflectType === 'string' ? reflectType : getClassName(reflectType);
    return new PropertyDefinitionError(`can not use database type '${databaseType}' with js type ${reflectTypeName}.`);
  }
}

export class ForeignKeyValidationError extends StartupError {

  constructor(message = 'fk validation failed') {
    super(message);
  }

}


export class HttpRequestError extends CustomError {
  statusCode: number
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class ServerInternalError extends HttpRequestError {
  constructor(message = 'Server Internal Error') {
    super(500, message);
  }
}

export class NotImplementedError extends HttpRequestError {
  constructor(message: string = 'Not implemented.') {
    super(501, message);
  }
}

export class ResourceNotFoundError extends HttpRequestError {
  constructor(message = 'Resource not found.') {
    super(404, message);
  }
}

export class MethodNotAllowedError extends HttpRequestError {
  constructor(message = 'Method not allowed.') {
    super(405, message);
  }
}

export class UnsupportedMediaTypeError extends HttpRequestError {
  constructor(message = 'Unsupported media type.') {
    super(415, message);
  }
}

export class BadRequestError extends HttpRequestError {
  constructor(message = 'Bad Request') {
    super(400, message);
  }
}
