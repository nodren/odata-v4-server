import { NextFunction, Request, Response } from 'express';
/** Create Express middleware for OData error handling */
export declare function withODataErrorHandler(err: any, req: Request, res: Response, next: NextFunction): void;
