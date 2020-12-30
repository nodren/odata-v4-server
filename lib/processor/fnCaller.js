"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fnCaller = void 0;
const utils_1 = require("../utils");
exports.fnCaller = function (oThis, fn, params) {
    params = params || {};
    const fnParams = utils_1.getFunctionParameters(fn);
    for (let i = 0; i < fnParams.length; i++) {
        fnParams[i] = params[fnParams[i]];
    }
    return fn.apply(oThis, fnParams);
};
exports.fnCaller['getFnParam'] = function (fn, params) {
    const fnParams = utils_1.getFunctionParameters(fn);
    for (let i = 0; i < fnParams.length; i++) {
        fnParams[i] = params[fnParams[i]];
    }
    return fnParams;
};
//# sourceMappingURL=fnCaller.js.map