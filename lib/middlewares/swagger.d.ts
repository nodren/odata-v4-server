import { ServiceMetadata } from '@odata/metadata';
import { NextFunction, Request, Response } from 'express';
export declare function withSwaggerDocument(sm: ServiceMetadata): (req: Request, res: Response, next: NextFunction) => Promise<void>;
