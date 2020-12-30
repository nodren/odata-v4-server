"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withODataRequestHandler = void 0;
const logger_1 = require("../logger");
const transaction_1 = require("../transaction");
const headers_1 = require("./headers");
const logger = logger_1.createLogger('request:simple');
/**
 * create simple simple request handler
 *
 * @param server
 */
function withODataRequestHandler(server) {
    return async (req, res, next) => {
        // new transaction for request
        const txContext = transaction_1.createTransactionContext();
        const ctx = {
            url: req.url,
            method: req.method,
            protocol: req.secure ? 'https' : 'http',
            host: req.headers.host,
            base: req.baseUrl,
            request: req,
            response: res,
            tx: txContext
        };
        let hasError = false;
        try {
            headers_1.ensureODataHeaders(req, res);
            const processor = await server.createProcessor(ctx, {
                metadata: res['metadata']
            });
            processor.on('header', (headers) => {
                for (const prop in headers) {
                    if (prop.toLowerCase() == 'content-type') {
                        headers_1.ensureODataContentType(req, res, headers[prop]);
                    }
                    else {
                        res.setHeader(prop, headers[prop]);
                    }
                }
            });
            processor.on('data', (chunk, encoding, done) => {
                if (!hasError) {
                    res.write(chunk, encoding, done);
                }
            });
            let body = req.body;
            // if chunked upload, will use request stream as body
            if (req.headers['transfer-encoding'] == 'chunked') {
                body = req;
            }
            const origStatus = res.statusCode;
            const result = await processor.execute(body);
            if (result) {
                res.status((origStatus != res.statusCode && res.statusCode) || result.statusCode || 200);
                if (!res.headersSent) {
                    headers_1.ensureODataContentType(req, res, result.contentType || 'text/plain');
                }
                switch (typeof result.body) {
                    case 'object':
                        res.json(result.body);
                        break;
                    case 'string':
                    case 'number':
                        res.send(String(result.body));
                    default:
                        break;
                }
            }
            await transaction_1.commitTransaction(txContext);
            res.end();
        }
        catch (err) {
            await transaction_1.rollbackTransaction(txContext);
            hasError = true;
            next(err);
        }
    };
}
exports.withODataRequestHandler = withODataRequestHandler;
;
//# sourceMappingURL=request.js.map