import { NextFunction, Request, Response } from 'express';
/**
 *
 * with (and verify 'Accept') odata header
 *
 * @param req
 * @param res
 * @param next
 */
export declare function withODataHeader(req: Request, res: Response, next: NextFunction): void;
/**
 * validation odata version
 *
 * @param req
 */
export declare function withODataVersionVerify(req: Request): void;
export declare function ensureODataMetadataType(req: Request, res: Response): void;
export declare function ensureODataContentType(req: Request, res: Response, contentType?: string): void;
export declare function ensureODataHeaders(req: Request, res: Response, next?: NextFunction): void;
