"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withODataBatchRequestHandler = exports.groupDependsOn = void 0;
const schema_tools_1 = require("@cypress/schema-tools");
const flatten_1 = require("@newdash/newdash/flatten");
const groupBy_1 = require("@newdash/newdash/groupBy");
const isArray_1 = require("@newdash/newdash/isArray");
const isArrayLike_1 = require("@newdash/newdash/isArrayLike");
const map_1 = require("@newdash/newdash/map");
const parser_1 = require("@odata/parser");
const graphlib_1 = require("graphlib");
const error_1 = require("../error");
const logger_1 = require("../logger");
const messages_1 = require("../messages");
const processor_1 = require("../processor");
const transaction_1 = require("../transaction");
const logger = logger_1.createLogger('request:batch');
const validateRequestBody = schema_tools_1.validateBySchema({
    title: 'batch-request',
    type: 'object',
    properties: {
        requests: {
            type: 'array',
            required: true,
            minItems: 1,
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', required: true },
                    method: { type: 'string', enum: processor_1.ODataRequestMethods, required: true },
                    url: { type: 'string', required: true },
                    atomicityGroup: { type: 'string' },
                    dependsOn: { type: 'array', items: { type: 'string' } },
                    headers: { type: 'object' },
                    body: { type: 'object' }
                },
                additionalProperties: false
            }
        }
    },
    additionalProperties: false
});
/**
 * check if request required the 'fast fail' processing
 *
 * @param req
 */
const isFastFail = (req) => {
    const h = req.get('continue-on-error');
    if (h && h.trim() == 'false') {
        return true;
    }
    return false;
};
/**
 * check the 'dependsOn' required id is existed
 */
function checkDependsOnIsValid(requests) {
    var _a;
    const ids = new Set();
    const deps = new Set();
    for (const req of requests) {
        if (ids.has(req.id)) {
            throw new TypeError(`request id [${req.id}] is duplicate`);
        }
        else {
            ids.add(req.id);
        }
    }
    for (const req of requests) {
        if (isArrayLike_1.isArrayLike(req.dependsOn)) {
            for (const dep of req.dependsOn) {
                if (!ids.has(dep)) {
                    throw new TypeError(`request [${req.id}] dependsOn [${dep}] not existed in atom group [${(_a = req.atomicityGroup) !== null && _a !== void 0 ? _a : DEFAULT_ATOM_GROUP}]`);
                }
            }
        }
    }
}
function groupDependsOn(requests) {
    const ids = new Set(requests.map((req) => req.id));
    const g = new graphlib_1.Graph();
    const reqMap = new Map();
    for (const req of requests) {
        reqMap.set(req.id, req);
        if (req.dependsOn !== undefined) {
            for (const dep of req.dependsOn) {
                g.setEdge(req.id, dep);
            }
        }
        else {
            g.setNode(req.id);
        }
    }
    // if have edge
    if (g.edgeCount() > 0) {
        const rt = [];
        const cycles = graphlib_1.alg.findCycles(g);
        if (cycles.length > 0) {
            throw new TypeError(`found cycle dependsOn in requests [${cycles.map((cycle) => cycle.concat(cycle[0]).join('->')).join(', ')}]`);
        }
        const comps = graphlib_1.alg.components(g);
        for (const comp of comps) {
            const group = [];
            for (const reqId of comp) {
                group.push(reqMap.get(reqId));
            }
            rt.push(group);
        }
        return rt;
    }
    return requests.map((req) => [req]);
}
exports.groupDependsOn = groupDependsOn;
const X_HEADER_BATCH_REQUEST_ID = 'x-batch-request-id';
const X_HEADER_BATCH_ATOM_GROUP = 'x-batch-atom-group';
const DEFAULT_ATOM_GROUP = 'default';
/**
 * create `/$batch` requests handler
 *
 * @param server
 */
function withODataBatchRequestHandler(server) {
    return async (req, res, next) => {
        if (req.method !== parser_1.ODataMethod.POST) {
            throw new error_1.MethodNotAllowedError('only support the "POST" method for $batch operation');
        }
        try {
            const body = req.body;
            const fastFail = isFastFail(req);
            // validate inbound payload
            const errors = validateRequestBody(body);
            if (isArray_1.default(errors)) {
                throw new error_1.BadRequestError(errors.join(', '));
            }
            // group by 'atomicityGroup'
            const groups = groupBy_1.default(body.requests, (bRequest) => { var _a; return (_a = bRequest.atomicityGroup) !== null && _a !== void 0 ? _a : DEFAULT_ATOM_GROUP; });
            Object.values(groups).forEach(checkDependsOnIsValid);
            // run parallel in theory
            const collectedResults = await Promise.all(map_1.map(groups, async (groupRequests, groupName) => {
                logger('start processing group %s with %o items', groupName, groupRequests === null || groupRequests === void 0 ? void 0 : groupRequests.length);
                // each atomicityGroup will run in SINGLE transaction
                const groupResults = [];
                const txContext = transaction_1.createTransactionContext();
                // if any item process failed, this value will be true
                let anyItemProcessedFailed = false;
                const dependsOnGroups = groupDependsOn(groupRequests);
                // execute each request in same atom group series
                for (const dependsOnGroup of dependsOnGroups) {
                    for (const batchRequest of dependsOnGroup) {
                        const response = {
                            status: 200,
                            id: batchRequest.id,
                            headers: {
                                [X_HEADER_BATCH_REQUEST_ID]: batchRequest.id,
                                [X_HEADER_BATCH_ATOM_GROUP]: groupName
                            }
                        };
                        const batchRequestId = `group [${batchRequest.atomicityGroup}], requestId [${batchRequest.id}], url [${batchRequest.url}]`;
                        const ctx = {
                            url: batchRequest.url,
                            method: batchRequest.method,
                            protocol: req.secure ? 'https' : 'http',
                            host: req.headers.host,
                            base: req.baseUrl,
                            request: req,
                            response: res,
                            tx: txContext
                        };
                        try {
                            logger('processing batch request with %s', batchRequestId);
                            // if something wrong before, and fast fail switched on, return fast fail result.
                            if (anyItemProcessedFailed && fastFail) {
                                response.status = 500;
                                response.body = { error: { code: response.status, message: messages_1.ERROR_BATCH_REQUEST_FAST_FAIL } };
                                groupResults.push(response);
                                continue;
                            }
                            const processor = await server.createProcessor(ctx, { metadata: res['metadata'] });
                            const result = await processor.execute(batchRequest.body);
                            response.status = result.statusCode || 200;
                            response.body = result.body;
                            groupResults.push(response);
                        }
                        catch (err) {
                            logger('processing batch request with %s failed, %s', batchRequestId, err);
                            anyItemProcessedFailed = true;
                            response.status = err.statusCode || 500;
                            response.body = { error: { code: response.status, message: err.message } };
                            groupResults.push(response);
                        }
                    }
                }
                if (anyItemProcessedFailed) {
                    await transaction_1.rollbackTransaction(txContext);
                }
                else {
                    await transaction_1.commitTransaction(txContext);
                }
                return groupResults;
            }));
            res.json({ responses: flatten_1.default(collectedResults) });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.withODataBatchRequestHandler = withODataBatchRequestHandler;
//# sourceMappingURL=batch.js.map