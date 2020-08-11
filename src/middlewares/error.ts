import { createLogger } from '../logger';

const logger = createLogger('error-handler');

/** Create Express middleware for OData error handling */
export function withODataErrorHandler(err, _, res, next) {
  if (err) {
    if (res.headersSent) {
      return next(err);
    }
    const statusCode = err.statusCode || err.status || (res.statusCode < 400 ? 500 : res.statusCode);
    if (!res.statusCode || res.statusCode < 400) {
      res.status(statusCode);
    }

    logger(err.stack);

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
