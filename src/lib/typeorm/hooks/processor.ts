import { BaseODataModel } from '../model';
import { getHookMetadata, HookContext } from './hooks';
import { HookType } from './hook_type';

/**
 * base class for hook
 */
export abstract class BaseHookProcessor<T extends typeof BaseODataModel = any>  {

  /**
   * the processor order
   */
  order(): number {
    return 0;
  };

  abstract support(entityType?: T, hookType?: HookType): boolean

  abstract async execute(ctx: HookContext<T>): Promise<void>

}

/**
 * base class for hook class with decorator
 */
export abstract class HookProcessor<T extends typeof BaseODataModel = any> extends BaseHookProcessor<T> {

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

interface HookHandler<T extends typeof BaseODataModel = any> {
  (ctx: HookContext<T>): Promise<void>
}

export function createHookProcessor<T extends typeof BaseODataModel = any>(handler: HookHandler<T>, eType?: T, hType?: HookType, iOrder = 0): BaseHookProcessor<T> {
  return new class extends BaseHookProcessor<T> {

    order() {
      return iOrder;
    }

    support(type: T, hookType: HookType): boolean {
      let rt = true;
      if (eType != undefined && eType !== type) {
        rt = false;
      }
      if (hType != undefined && hType !== hookType) {
        rt = false;
      }
      return rt;
    }

    execute(ctx: HookContext<T>): Promise<void> {
      return handler(ctx);
    }

  };
};
