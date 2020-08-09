import flatten from '@newdash/newdash/flatten';
import groupBy from '@newdash/newdash/groupBy';
import { map } from '@newdash/newdash/map';
import { JsonBatchBundle, JsonBatchRequest } from '@odata/parser';
import { NextFunction, Request, Response } from 'express';
import { ODataHttpContext, ODataServer } from '..';
import { createLogger } from '../logger';
import { commitTransaction, createTransactionContext, rollbackTransaction } from '../typeorm';

const logger = createLogger('request:batch');

/**
 * create $batch requests handler
 *
 * @param server
 */
export function withODataBatchRequestHandler(server: typeof ODataServer) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body: JsonBatchBundle = req.body;
      // TO DO validation here
      const groups: Record<string, JsonBatchRequest[]> = groupBy(body.requests, (bRequest) => bRequest.atomicityGroup || 'default');

      const collectedResults = await Promise.all(map(groups, async (groupRequests, groupName) => {
        // each atom group will run in SINGLE transaction
        const groupResults = [];
        const txContext = createTransactionContext();

        // if any item process failed, this value will be true
        let anyThingWrong = false;

        for (let idx = 0; idx < groupRequests.length; idx++) {
          const batchRequest = groupRequests[idx];

          try {

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

            const processor = server.createProcessor(ctx, { metadata: res['metadata'] });

            const result = await processor.execute(batchRequest.body);

            groupResults.push({
              id: batchRequest.id,
              status: result.statusCode || 200,
              body: result.body
            });

          } catch (err) {

            anyThingWrong = true;
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

        if (anyThingWrong) {
          await rollbackTransaction(txContext);
        } else {
          await commitTransaction(txContext);
        }

        return groupResults;

      }));

      res.json({
        responses: flatten(collectedResults)
      });

    } catch (error) {
      next(error);
    }
  };
}
