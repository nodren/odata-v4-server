import { NextFunction, Request, Response } from 'express';
import { ODataServer } from '..';
/**
 * create simple simple request handler
 *
 * @param server
 */
export declare function withODataRequestHandler(server: typeof ODataServer): (req: Request, res: Response, next: NextFunction) => Promise<void>;
