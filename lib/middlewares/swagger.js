"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withSwaggerDocument = void 0;
const odata2openapi_1 = require("odata2openapi");
const path_1 = require("path");
function withSwaggerDocument(sm) {
    return async (req, res, next) => {
        try {
            const metadata = sm.document('xml');
            const service = await odata2openapi_1.parse(metadata);
            const swaggerDoc = odata2openapi_1.convert(service.entitySets, {
                host: `${req.get('host')}`,
                basePath: `${path_1.dirname(req.baseUrl)}`
            }, service.version);
            req['swaggerDoc'] = swaggerDoc;
            // res.json(swaggerDoc);
            next();
        }
        catch (error) {
            next(error);
        }
    };
}
exports.withSwaggerDocument = withSwaggerDocument;
//# sourceMappingURL=swagger.js.map