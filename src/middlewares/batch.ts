import { validateBySchema } from '@cypress/schema-tools';
import flatten from '@newdash/newdash/flatten';
import groupBy from '@newdash/newdash/groupBy';
import isArray from '@newdash/newdash/isArray';
import { isArrayLike } from '@newdash/newdash/isArrayLike';
import { map } from '@newdash/newdash/map';
import { JsonBatchRequest, JsonBatchRequestBundle, JsonBatchResponse, ODataMethod } from '@odata/parser';
import { NextFunction, Request, Response } from 'express';
import { alg, Graph } from 'graphlib';
import { BadRequestError, MethodNotAllowedError } from '../error';
import { createLogger } from '../logger';
import { ERROR_BATCH_REQUEST_FAST_FAIL } from '../messages';
import { ODataRequestMethods } from '../processor';
import { ODataHttpContext, ODataServer } from '../server';
import { commitTransaction, createTransactionContext, rollbackTransaction } from '../transaction';


const logger = createLogger('request:batch');

const validateRequestBody = validateBySchema({
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
          method: { type: 'string', enum: ODataRequestMethods, required: true },
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
const isFastFail = (req: Request) => {
  const h = req.get('continue-on-error');
  if (h && h.trim() == 'false') {
    return true;
  }
  return false;
};

/**
 * check the 'dependsOn' required id is existed
 */
function checkDependsOnIsValid(requests: Array<JsonBatchRequest>) {
  const ids = new Set();
  const deps = new Set();
  for (const req of requests) {
    if (ids.has(req.id)) {
      throw new TypeError(`request id [${req.id}] is duplicate`);
    } else {
      ids.add(req.id);
    }

  }
  for (const req of requests) {
    if (isArrayLike(req.dependsOn)) {
      for (const dep of req.dependsOn) {
        if (!ids.has(dep)) {
          throw new TypeError(`request [${req.id}] dependsOn [${dep}] not existed in atom group [${req.atomicityGroup ?? DEFAULT_ATOM_GROUP}]`);
        }
      }
    }
  }
}


export function groupDependsOn(requests: Array<JsonBatchRequest>): Array<Array<JsonBatchRequest>> {
  const ids = new Set(requests.map((req) => req.id));
  const g = new Graph();
  const reqMap = new Map();
  for (const req of requests) {
    reqMap.set(req.id, req);
    if (req.dependsOn !== undefined) {
      for (const dep of req.dependsOn) {
        g.setEdge(req.id, dep);
      }
    } else {
      g.setNode(req.id);
    }
  }


  // if have edge
  if (g.edgeCount() > 0) {
    const rt = [];
    const cycles = alg.findCycles(g);
    if (cycles.length > 0) {
      throw new TypeError(`found cycle dependsOn in requests [${cycles.map((cycle) => cycle.concat(cycle[0]).join('->')).join(', ')}]`);
    }
    const comps = alg.components(g);
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

const X_HEADER_BATCH_REQUEST_ID = 'x-batch-request-id';
const X_HEADER_BATCH_ATOM_GROUP = 'x-batch-atom-group';
const DEFAULT_ATOM_GROUP = 'default';

/**
 * create `/$batch` requests handler
 *
 * @param server
 */
export function withODataBatchRequestHandler(server: typeof ODataServer) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== ODataMethod.POST) {
      throw new MethodNotAllowedError('only support the "POST" method for $batch operation');
    }
    try {
      const body: JsonBatchRequestBundle = req.body;

      const fastFail = isFastFail(req);

      // validate inbound payload
      const errors = validateRequestBody(body);

      if (isArray(errors)) {
        throw new BadRequestError(errors.join(', '));
      }

      // group by 'atomicityGroup'
      const groups: Record<string, JsonBatchRequest[]> = groupBy(body.requests, (bRequest) => bRequest.atomicityGroup ?? DEFAULT_ATOM_GROUP);

      Object.values(groups).forEach(checkDependsOnIsValid);

      // run parallel in theory
      const collectedResults = await Promise.all(map(groups, async (groupRequests, groupName) => {

        logger(
          'start processing group %s with %o items',
          groupName,
          groupRequests?.length
        );

        // each atomicityGroup will run in SINGLE transaction
        const groupResults: JsonBatchResponse[] = [];
        const txContext = createTransactionContext();
        // if any item process failed, this value will be true
        let anyItemProcessedFailed = false;

        const dependsOnGroups = groupDependsOn(groupRequests);

        // execute each request in same atom group series

        for (const dependsOnGroup of dependsOnGroups) {

          for (const batchRequest of dependsOnGroup) {

            const response: JsonBatchResponse = {
              status: 200,
              id: batchRequest.id,
              headers: {
                [X_HEADER_BATCH_REQUEST_ID]: batchRequest.id,
                [X_HEADER_BATCH_ATOM_GROUP]: groupName
              }
            };

            const batchRequestId = `group [${batchRequest.atomicityGroup}], requestId [${batchRequest.id}], url [${batchRequest.url}]`;

            const ctx: ODataHttpContext = {
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
                response.body = { error: { code: response.status, message: ERROR_BATCH_REQUEST_FAST_FAIL } };
                groupResults.push(response);
                continue;
              }

              const processor = await server.createProcessor(ctx, { metadata: res['metadata'] });

              const result = await processor.execute(batchRequest.body);

              response.status = result.statusCode || 200;
              response.body = result.body;

              groupResults.push(response);

            } catch (err) {

              logger('processing batch request with %s failed, %s', batchRequestId, err);

              anyItemProcessedFailed = true;


              response.status = err.statusCode || 500;
              response.body = { error: { code: response.status, message: err.message } };

              groupResults.push(response);

            }

          }

        }


        if (anyItemProcessedFailed) {
          await rollbackTransaction(txContext);
        } else {
          await commitTransaction(txContext);
        }

        return groupResults;

      }));

      res.json({ responses: flatten(collectedResults) });

    } catch (error) {
      next(error);
    }
  };
}
