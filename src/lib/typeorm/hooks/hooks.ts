import { BaseEntity } from 'typeorm';
import { HookType } from './hook_type';


export interface HookFunction<T> {
  /**
   * instance data
   */
  (instance: T, type?: HookType): Promise<T> | T | Promise<void> | void
}

const createHookDecorator = (hook: HookType) => (type: BaseEntity) => (target: any, targetKey: any) => {
  Reflect.defineMetadata(hook, { type }, target, targetKey);
};

export const beforeCreate = createHookDecorator(HookType.beforeCreate);
export const beforeUpdate = createHookDecorator(HookType.beforeUpdate);
export const beforeDelete = createHookDecorator(HookType.beforeDelete);
export const afterLoad = createHookDecorator(HookType.afterLoad);
