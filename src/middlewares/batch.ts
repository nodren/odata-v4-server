import { validateBySchema } from '@cypress/schema-tools';
import flatten from '@newdash/newdash/flatten';
import groupBy from '@newdash/newdash/groupBy';
import isArray from '@newdash/newdash/isArray';
import { map } from '@newdash/newdash/map';
import { JsonBatchRequest, JsonBatchRequestBundle, JsonBatchResponse } from '@odata/parser';
import { NextFunction, Request, Response } from 'express';
import { ODataHttpContext, ODataServer } from '..';
import { BadRequestError } from '../error';
import { createLogger } from '../logger';
import { ERROR_BATCH_REQUEST_FAST_FAIL } from '../messages';
import { ODataRequestMethods } from '../processor';
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
        }
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
 * create $batch requests handler
 *
 * @param server
 */
export function withODataBatchRequestHandler(server: typeof ODataServer) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body: JsonBatchRequestBundle = req.body;

      const fastFail = isFastFail(req);

      // validate inbound payload
      const errors = validateRequestBody(body);

      if (isArray(errors)) {
        throw new BadRequestError(errors.join(', '));
      }

      // group by 'atomicityGroup'
      const groups: Record<string, JsonBatchRequest[]> = groupBy(body.requests, (bRequest) => bRequest.atomicityGroup || 'default');

      const collectedResults = await Promise.all(map(groups, async (groupRequests, groupName) => {
        // each atomicityGroup will run in SINGLE transaction
        const groupResults: JsonBatchResponse[] = [];
        const txContext = createTransactionContext();
        // if any item process failed, this value will be true
        let anyItemProcessedFailed = false;

        for (let idx = 0; idx < groupRequests.length; idx++) {

          const batchRequest = groupRequests[idx];

          const batchRequestId = `group('${batchRequest.atomicityGroup}'), requestId('${batchRequest.id}'), url('${batchRequest.url}')`;

          try {

            logger('processing batch request with %s', batchRequestId);

            // if something wrong before, and fast fail switched on, return fast fail result.
            if (anyItemProcessedFailed && fastFail) {
              groupResults.push({
                id: batchRequest.id, status: 500,
                body: { error: { code: 500, message: ERROR_BATCH_REQUEST_FAST_FAIL } }
              });
              continue;
            }

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

            const processor = await server.createProcessor(ctx, { metadata: res['metadata'] });

            const result = await processor.execute(batchRequest.body);

            groupResults.push({
              id: batchRequest.id,
              status: result.statusCode || 200,
              body: result.body
            });

          } catch (err) {

            logger('processing batch request with %s failed, %s', batchRequestId, err);

            anyItemProcessedFailed = true;

            const statusCode = err.statusCode || 500;

            groupResults.push({
              id: batchRequest.id,
              status: statusCode,
              body: {
                error: {
                  code: statusCode,
                  message: err.message
                }
              }
            });

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
