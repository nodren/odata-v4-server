import { JsonBatchRequest } from '@odata/parser';
import { NextFunction, Request, Response } from 'express';
import { ODataServer } from '../server';
export declare function groupDependsOn(requests: Array<JsonBatchRequest>): Array<Array<JsonBatchRequest>>;
/**
 * create `/$batch` requests handler
 *
 * @param server
 */
export declare function withODataBatchRequestHandler(server: typeof ODataServer): (req: Request, res: Response, next: NextFunction) => Promise<void>;
