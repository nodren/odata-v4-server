export class CustomError extends Error {
  constructor(message?: string) {
    super(message);
    this.message = message;
    this.name = (this as any).constructor.name;
    Error.captureStackTrace(this, this?.constructor || CustomError);
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
