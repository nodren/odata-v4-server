"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findHooks = exports.getHooks = exports.withHook = exports.afterDelete = exports.afterUpdate = exports.afterCreate = exports.afterLoad = exports.beforeDelete = exports.beforeUpdate = exports.beforeCreate = exports.getHookMetadata = void 0;
const sortBy_1 = require("@newdash/newdash/sortBy");
const hook_type_1 = require("./hook_type");
const processor_1 = require("./processor");
const KEY_WITH_HOOK = 'odata:with_hook';
const KEY_HOOK_META = 'odata:hook';
const createHookDecorator = (hookType) => (entityType, order = 0) => (target) => {
    // TO DO, attach hook to entity
    Reflect.defineMetadata(KEY_HOOK_META, { hookType, entityType, order }, target);
};
exports.getHookMetadata = (target) => Reflect.getMetadata(KEY_HOOK_META, target);
/**
 * before instance create
 */
exports.beforeCreate = createHookDecorator(hook_type_1.HookType.beforeCreate);
/**
 * before instance update
 */
exports.beforeUpdate = createHookDecorator(hook_type_1.HookType.beforeUpdate);
/**
 * before instance delete
 */
exports.beforeDelete = createHookDecorator(hook_type_1.HookType.beforeDelete);
/**
 * before data response, after data load from database
 */
exports.afterLoad = createHookDecorator(hook_type_1.HookType.afterLoad);
exports.afterCreate = createHookDecorator(hook_type_1.HookType.afterCreate);
exports.afterUpdate = createHookDecorator(hook_type_1.HookType.afterUpdate);
exports.afterDelete = createHookDecorator(hook_type_1.HookType.afterDelete);
function withHook(hook) {
    return function (target) {
        const hooks = getHooks(target);
        if (hook instanceof processor_1.BaseHookProcessor) {
            hooks.add(hook);
        }
        else if (hook instanceof processor_1.BaseHookProcessor.constructor) {
            // @ts-ignore
            hooks.add(new hook);
        }
        Reflect.defineMetadata(KEY_WITH_HOOK, hooks, target);
    };
}
exports.withHook = withHook;
function getHooks(target) {
    return Reflect.getMetadata(KEY_WITH_HOOK, target) || new Set();
}
exports.getHooks = getHooks;
/**
 * find hooks by entity type and hook type
 *
 * @param entityType
 * @param hookType
 */
exports.findHooks = (serverType, entityType, hookType) => {
    let rt = [];
    const hooks = getHooks(serverType);
    hooks.forEach((processor) => {
        if (processor.support(entityType, hookType)) {
            rt.push(processor);
        }
        ;
    });
    if (rt.length > 0) {
        rt = sortBy_1.default(rt, (processor) => processor.order());
    }
    return rt;
};
//# sourceMappingURL=hooks.js.map