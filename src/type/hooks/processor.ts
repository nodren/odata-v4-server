// @ts-nocheck
import { getHookMetadata, HookContext } from './hooks';
import { HookType } from './hook_type';

/**
 * base class for hook
 */
export abstract class BaseHookProcessor<T = any>  {

  /**
   * the processor order
   */
  order(): number {
    return 0;
  };

  abstract support(entityType?: any, hookType?: HookType): boolean

  abstract async execute(hookContext: HookContext<any>): Promise<void>

}

/**
 * base class for hook class with decorator
 */
export abstract class HookProcessor<T = any> extends BaseHookProcessor<T> {

  private _getMeta() {
    return getHookMetadata(this.constructor);
  }

  order() {
    return this._getMeta().order;
  }

  support(entityType?: T, hookType?: HookType): boolean {
    const meta = this._getMeta();
    return meta.entityType == entityType && meta.hookType == hookType;
  }

}
