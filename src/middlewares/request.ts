import { NextFunction, Request, Response } from 'express';
import { ODataHttpContext, ODataServer } from '..';
import { createLogger } from '../logger';
import { ODataProcessorOptions } from '../processor';
import { commitTransaction, createTransactionContext, rollbackTransaction } from '../transaction';
import { ensureODataContentType, ensureODataHeaders } from './headers';

const logger = createLogger('request:simple');

/**
 * create simple simple request handler
 *
 * @param server
 */
export function withODataRequestHandler(server: typeof ODataServer) {


  return async (req: Request, res: Response, next: NextFunction) => {

    // new transaction for request
    const txContext = createTransactionContext();

    const ctx: ODataHttpContext = {
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

      ensureODataHeaders(req, res);

      const processor = await server.createProcessor(ctx, <ODataProcessorOptions>{
        metadata: res['metadata']
      });

      processor.on('header', (headers) => {
        for (const prop in headers) {
          if (prop.toLowerCase() == 'content-type') {
            ensureODataContentType(req, res, headers[prop]);
          } else {
            res.setHeader(prop, headers[prop]);
          }
        }
      });

      processor.on('data', (chunk, encoding, done) => {
        if (!hasError) { res.write(chunk, encoding, done); }
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
          ensureODataContentType(req, res, result.contentType || 'text/plain');
        }
        if (typeof result.body != 'undefined') {
          if (typeof result.body != 'object') {
            res.send(`${result.body}`);
          } else if (!res.headersSent) {
            res.send(result.body);
          }
        }
      }

      await commitTransaction(txContext);

      res.end();

    } catch (err) {

      await rollbackTransaction(txContext);

      hasError = true;

      next(err);

    }
  };
};
