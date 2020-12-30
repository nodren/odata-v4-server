"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ODataResult = exports.ODataStream = void 0;
class ODataStream {
    constructor(stream, contentType) {
        if (typeof stream == 'string') {
            this.stream = null;
            this.contentType = stream;
        }
        else {
            this.stream = stream;
            this.contentType = contentType;
        }
        this.contentType = this.contentType || 'application/octet-stream';
    }
    pipe(destination) {
        return new Promise((resolve, reject) => {
            this.stream.on('open', () => {
                if (typeof this.stream.close == 'function') {
                    destination.on('finish', () => {
                        this.stream.close();
                    });
                }
                resolve(this);
            }).on('error', reject);
        });
    }
    write(source) {
        return new Promise((resolve, reject) => {
            this.stream.on('open', () => {
                if (typeof this.stream.close == 'function') {
                    source.on('finish', () => {
                        this.stream.close();
                    });
                }
                source.pipe(this.stream);
            }).on('error', reject);
            source.on('end', () => resolve(this));
        });
    }
}
exports.ODataStream = ODataStream;
class ODataResult {
    constructor(statusCode, contentType, result) {
        this.statusCode = statusCode;
        if (typeof result != 'undefined') {
            this.body = result;
            if (result && result.constructor) {
                this.elementType = result.constructor;
            }
            this.contentType = contentType || 'application/json';
        }
        this._originalResult = result;
    }
    getOriginalResult() {
        return this._originalResult;
    }
}
exports.ODataResult = ODataResult;
ODataResult.Created = async function Created(result, contentType) {
    if (result instanceof Promise) {
        result = await result;
    }
    return Promise.resolve(new ODataResult(201, contentType, result));
};
ODataResult.Ok = async function Ok(result, contentType) {
    let inlinecount;
    if (result instanceof Promise) {
        result = await result;
    }
    if (result && Array.isArray(result)) {
        if (result && typeof result.inlinecount == 'number') {
            inlinecount = result.inlinecount;
            delete result.inlinecount;
        }
        result = { value: result };
        if (typeof inlinecount == 'number') {
            result['@odata.count'] = inlinecount;
        }
    }
    else {
        if (typeof result == 'object' && result && typeof inlinecount == 'number') {
            result['@odata.count'] = inlinecount;
        }
    }
    return Promise.resolve(new ODataResult(200, contentType, result));
};
ODataResult.NoContent = async function NoContent(result, contentType) {
    if (result instanceof Promise) {
        result = await result;
    }
    return Promise.resolve(new ODataResult(204, contentType));
};
//# sourceMappingURL=result.js.map