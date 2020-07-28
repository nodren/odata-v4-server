import { NextFunction, Request, Response } from 'express';
import { v4 } from 'uuid';
import { HttpRequestError, UnsupportedMediaTypeError } from './error';

/**
 * with request id in `res.locals.id`
 *
 * @param req request object
 */
export function withRequestId(req: Request) {
  req.res.locals['id'] = v4();
  req.next();
}

/**
 *
 * with (and verify 'Accept') odata header
 *
 * @param req
 * @param res
 * @param next
 */
export function withODataHeader(req: Request, res: Response, next: NextFunction) {
  res.setHeader('OData-Version', '4.0');
  if (req.headers.accept &&
    req.headers.accept.indexOf('application/json') < 0 &&
    req.headers.accept.indexOf('text/html') < 0 &&
    req.headers.accept.indexOf('*/*') < 0 &&
    req.headers.accept.indexOf('xml') < 0) {
    next(new UnsupportedMediaTypeError());
  } else {
    next();
  }
}

/**
 * validation odata version
 *
 * @param req
 */
export function withODataVersionVerify(req: Request) {
  req.url = req.url.replace(/[\/]+/g, '/').replace(':/', '://');
  if (req.headers['odata-maxversion'] && req.headers['odata-maxversion'] < '4.0') {
    return req.next(new HttpRequestError(500, 'Only OData version 4.0 supported'));
  }
  req.next();
}
