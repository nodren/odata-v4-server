import { NextFunction, Request, Response } from 'express';
import { createLogger } from '../logger';
const logger = createLogger('error-handler');

/** Create Express middleware for OData error handling */
export function withODataErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err) {

    logger('processing failed url [%o] with payload %O', req.url, req.body);
    logger(err);

    if (res.headersSent) {
      return next(err);
    }
    const statusCode = err.statusCode || err.status || (res.statusCode < 400 ? 500 : res.statusCode);

    if (!res.statusCode || res.statusCode < 400) {
      res.status(statusCode);
    }

    res.send({
      error: {
        code: statusCode,
        message: err.message
        // stack: process.env.ODATA_V4_ENABLE_STACKTRACE ? undefined : err.stack
      }
    });

  } else {
    next();
  }
}
