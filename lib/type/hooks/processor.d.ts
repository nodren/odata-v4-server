import { HookType } from './hook_type';
/**
 * base class for hook
 */
export declare abstract class BaseHookProcessor<T = any> {
    /**
     * the processor order
     */
    order(): number;
    abstract support(entityType?: any, hookType?: HookType): boolean;
    abstract execute(...args: any[]): Promise<void>;
}
/**
 * base class for hook class with decorator
 */
export declare abstract class HookProcessor<T = any> extends BaseHookProcessor<T> {
    private _getMeta;
    order(): number;
    support(entityType?: T, hookType?: HookType): boolean;
}
