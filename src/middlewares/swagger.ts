import { ServiceMetadata } from '@odata/metadata';
import { NextFunction, Request, Response } from 'express';
import { convert, parse } from 'odata2openapi';
import { dirname } from 'path';


export function withSwaggerDocument(sm: ServiceMetadata) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {

      const metadata = sm.document('xml');
      const service = await parse(metadata);

      const swaggerDoc = convert(service.entitySets, {
        host: `${req.get('host')}`,
        basePath: `${dirname(req.baseUrl)}`
      }, service.version);

      req['swaggerDoc'] = swaggerDoc;
      // res.json(swaggerDoc);
      next();
    } catch (error) {
      next(error);
    }
  };
}
