"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureODataHeaders = exports.ensureODataContentType = exports.ensureODataMetadataType = exports.withODataVersionVerify = exports.withODataHeader = void 0;
const isArray_1 = require("@newdash/newdash/isArray");
const toNumber_1 = require("@newdash/newdash/toNumber");
const constants_1 = require("../constants");
const error_1 = require("../error");
const processor_1 = require("../processor");
/**
 *
 * with (and verify 'Accept') odata header
 *
 * @param req
 * @param res
 * @param next
 */
function withODataHeader(req, res, next) {
    res.setHeader(constants_1.HttpHeaderConstants.HttpHeaderODataVersion, constants_1.HttpHeaderConstants.ODataValueVersion40);
    if (req.headers.accept &&
        req.headers.accept.indexOf('application/json') < 0 &&
        req.headers.accept.indexOf('text/html') < 0 &&
        req.headers.accept.indexOf('*/*') < 0 &&
        req.headers.accept.indexOf('xml') < 0) {
        next(new error_1.UnsupportedMediaTypeError());
    }
    else {
        next();
    }
}
exports.withODataHeader = withODataHeader;
/**
 * validation odata version
 *
 * @param req
 */
function withODataVersionVerify(req) {
    req.url = req.url.replace(/[\/]+/g, '/').replace(':/', '://');
    if (req.headers[constants_1.HttpHeaderConstants.ODataValueMaxVersion]
        && toNumber_1.toNumber(req.headers[constants_1.HttpHeaderConstants.ODataValueMaxVersion]) < 4) {
        return req.next(new error_1.ServerInternalError('Only OData version 4.0 supported'));
    }
    req.next();
}
exports.withODataVersionVerify = withODataVersionVerify;
function ensureODataMetadataType(req, res) {
    let metadata = processor_1.ODataMetadataType.minimal;
    if (req.headers && req.headers.accept && req.headers.accept.indexOf('odata.metadata=') >= 0) {
        if (req.headers.accept.indexOf('odata.metadata=full') >= 0) {
            metadata = processor_1.ODataMetadataType.full;
        }
        else if (req.headers.accept.indexOf('odata.metadata=none') >= 0) {
            metadata = processor_1.ODataMetadataType.none;
        }
    }
    res['metadata'] = metadata;
}
exports.ensureODataMetadataType = ensureODataMetadataType;
function ensureODataContentType(req, res, contentType) {
    contentType = contentType || constants_1.HttpHeaderConstants.HttpContentTypeJson;
    if (contentType.indexOf('odata.metadata=') < 0) {
        contentType += `;odata.metadata=${processor_1.ODataMetadataType[res['metadata']]}`;
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
exports.ensureODataContentType = ensureODataContentType;
function ensureODataHeaders(req, res, next) {
    res.setHeader(constants_1.HttpHeaderConstants.HttpHeaderODataVersion, constants_1.HttpHeaderConstants.ODataValueVersion40);
    ensureODataMetadataType(req, res);
    let charset = req.headers[constants_1.HttpHeaderConstants.HttpHeaderAcceptCharset] || constants_1.HttpHeaderConstants.HttpCharsetUTF8;
    if (isArray_1.isArray(charset)) {
        charset = charset[0];
    }
    res.locals['charset'] = charset;
    ensureODataContentType(req, res);
    if ((req.headers.accept && req.headers.accept.indexOf('charset') < 0)
        || req.headers[constants_1.HttpHeaderConstants.HttpHeaderAcceptCharset]) {
        const bufferEncoding = {
            'utf-8': 'utf8',
            'utf-16': 'utf16le'
        };
        const originalSend = res.send;
        res.send = ((data) => {
            if (typeof data == 'object') {
                data = JSON.stringify(data);
            }
            originalSend.call(res, Buffer.from(data, bufferEncoding[charset]));
        });
    }
    if (typeof next == 'function') {
        next();
    }
}
exports.ensureODataHeaders = ensureODataHeaders;
//# sourceMappingURL=headers.js.map