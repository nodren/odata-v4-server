"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withODataErrorHandler = void 0;
const logger_1 = require("../logger");
const logger = logger_1.createLogger('error-handler');
/** Create Express middleware for OData error handling */
function withODataErrorHandler(err, req, res, next) {
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
    }
    else {
        next();
    }
}
exports.withODataErrorHandler = withODataErrorHandler;
//# sourceMappingURL=error.js.map