import { isArray } from '@newdash/newdash/isArray';
import { toNumber } from '@newdash/newdash/toNumber';
import { NextFunction, Request, Response } from 'express';
import { HttpHeaderConstants } from '../constants';
import { ServerInternalError, UnsupportedMediaTypeError } from '../error';
import { ODataMetadataType } from '../processor';


/**
 *
 * with (and verify 'Accept') odata header
 *
 * @param req
 * @param res
 * @param next
 */
export function withODataHeader(req: Request, res: Response, next: NextFunction) {
  res.setHeader(HttpHeaderConstants.HttpHeaderODataVersion, HttpHeaderConstants.ODataValueVersion40);
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
  if (
    req.headers[HttpHeaderConstants.ODataValueMaxVersion]
    && toNumber(req.headers[HttpHeaderConstants.ODataValueMaxVersion]) < 4
  ) {
    return req.next(new ServerInternalError('Only OData version 4.0 supported'));
  }
  req.next();
}


export function ensureODataMetadataType(req: Request, res: Response) {
  let metadata: ODataMetadataType = ODataMetadataType.minimal;
  if (req.headers && req.headers.accept && req.headers.accept.indexOf('odata.metadata=') >= 0) {
    if (req.headers.accept.indexOf('odata.metadata=full') >= 0) {
      metadata = ODataMetadataType.full;
    } else if (req.headers.accept.indexOf('odata.metadata=none') >= 0) {
      metadata = ODataMetadataType.none;
    }
  }

  res['metadata'] = metadata;
}

export function ensureODataContentType(req: Request, res: Response, contentType?: string) {
  contentType = contentType || HttpHeaderConstants.HttpContentTypeJson;
  if (contentType.indexOf('odata.metadata=') < 0) {
    contentType += `;odata.metadata=${ODataMetadataType[res['metadata']]}`;
  }
  if (contentType.indexOf('odata.streaming=') < 0) {
    contentType += ';odata.streaming=true';
  }
  if (contentType.indexOf('IEEE754Compatible=') < 0) {
    contentType += ';IEEE754Compatible=false';
  }
  if (req.headers.accept && req.headers.accept.indexOf('charset') > 0) {
    contentType += `;charset=${res.locals['charset']}`;
  }
  res.contentType(contentType);
}

export function ensureODataHeaders(req: Request, res: Response, next?: NextFunction) {
  res.setHeader(HttpHeaderConstants.HttpHeaderODataVersion, HttpHeaderConstants.ODataValueVersion40);

  ensureODataMetadataType(req, res);

  let charset = req.headers[HttpHeaderConstants.HttpHeaderAcceptCharset] || HttpHeaderConstants.HttpCharsetUTF8;
  if (isArray(charset)) {
    charset = charset[0];
  }
  res.locals['charset'] = charset;

  ensureODataContentType(req, res);

  if (
    (req.headers.accept && req.headers.accept.indexOf('charset') < 0)
    || req.headers[HttpHeaderConstants.HttpHeaderAcceptCharset]
  ) {
    const bufferEncoding = {
      'utf-8': 'utf8',
      'utf-16': 'utf16le'
    };
    const originalSend = res.send;
    res.send = <any>((data) => {
      if (typeof data == 'object') {
        data = JSON.stringify(data);
      }
      originalSend.call(res, Buffer.from(data, bufferEncoding[charset as string]));
    });
  }

  if (typeof next == 'function') {
    next();
  }
}
