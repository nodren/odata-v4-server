import { BaseEntity } from 'typeorm';
import { HookType } from './hook_type';
import { ODataHttpContext } from '../../server';

export interface HookContext<T = any> {
  context: ODataHttpContext
  type: HookType
  instance: T
}

export interface HookFunction<T> {
  /**
   * instance data
   */
  (ctx: HookContext<T>): Promise<T> | T | Promise<void> | void
}

const createHookDecorator = (hook: HookType) => (type?: typeof BaseEntity) => (target: any, targetKey: any) => {
  // if type not exist, use 'target' as type, but please check the entity is annotated with 'ODataModel'
  Reflect.defineMetadata(hook, { type: type || target }, target, targetKey);
};

export const beforeCreate = createHookDecorator(HookType.beforeCreate);
export const beforeUpdate = createHookDecorator(HookType.beforeUpdate);
export const beforeDelete = createHookDecorator(HookType.beforeDelete);
export const afterLoad = createHookDecorator(HookType.afterLoad);

