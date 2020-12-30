"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HookEvents = exports.HookType = void 0;
var HookType;
(function (HookType) {
    HookType["beforeCreate"] = "odata.hook:beforeCreate";
    HookType["beforeUpdate"] = "odata.hook:beforeUpdate";
    HookType["beforeDelete"] = "odata.hook:beforeDelete";
    HookType["afterLoad"] = "odata.hook:afterLoad";
    HookType["afterCreate"] = "odata.event:afterCreate";
    HookType["afterUpdate"] = "odata.event:afterUpdate";
    HookType["afterDelete"] = "odata.event:afterDelete";
})(HookType = exports.HookType || (exports.HookType = {}));
/**
 * events type hook
 */
exports.HookEvents = [HookType.afterCreate, HookType.afterUpdate, HookType.afterDelete];
//# sourceMappingURL=hook_type.js.map