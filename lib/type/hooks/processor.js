"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HookProcessor = exports.BaseHookProcessor = void 0;
// @ts-nocheck
const hooks_1 = require("./hooks");
/**
 * base class for hook
 */
class BaseHookProcessor {
    /**
     * the processor order
     */
    order() {
        return 0;
    }
    ;
}
exports.BaseHookProcessor = BaseHookProcessor;
/**
 * base class for hook class with decorator
 */
class HookProcessor extends BaseHookProcessor {
    _getMeta() {
        return hooks_1.getHookMetadata(this.constructor);
    }
    order() {
        return this._getMeta().order;
    }
    support(entityType, hookType) {
        const meta = this._getMeta();
        return meta.entityType == entityType && meta.hookType == hookType;
    }
}
exports.HookProcessor = HookProcessor;
//# sourceMappingURL=processor.js.map