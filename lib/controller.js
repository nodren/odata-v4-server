"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ODataController = exports.ODataControllerBase = void 0;
const tslib_1 = require("tslib");
const inject_1 = require("@newdash/inject");
const odata = require("./odata");
const utils_1 = require("./utils");
const { ODataBase } = odata;
class ODataControllerBase {
    static on(method, fn, ...keys) {
        const fnName = (fn.name || fn);
        odata.method(method)(this.prototype, fnName);
        if (keys && keys.length > 0) {
            fn = this.prototype[fnName];
            const parameterNames = utils_1.getFunctionParameters(fn);
            keys.forEach((key) => {
                odata.key(this.prototype, fnName, parameterNames.indexOf(key));
            });
        }
    }
    /** Enables the filtering
     * @param fn
     * @param param
     */
    static enableFilter(fn, param) {
        const fnName = (fn.name || fn);
        fn = this.prototype[fnName];
        const parameterNames = utils_1.getFunctionParameters(fn);
        odata.filter(this.prototype, fnName, parameterNames.indexOf(param || parameterNames[0]));
    }
}
tslib_1.__decorate([
    inject_1.noWrap,
    tslib_1.__metadata("design:type", Object)
], ODataControllerBase.prototype, "elementType", void 0);
exports.ODataControllerBase = ODataControllerBase;
class ODataController extends ODataBase(ODataControllerBase) {
}
exports.ODataController = ODataController;
//# sourceMappingURL=controller.js.map