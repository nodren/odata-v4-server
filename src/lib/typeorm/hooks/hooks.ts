import { ODataHttpContext } from '../../server';
import { BaseODataModel } from '../model';
import { HookType } from './hook_type';
import { registerHook } from './storage';

export interface HookContext<T = any> {
  context: ODataHttpContext;
  hookType: HookType;
  entityType: typeof BaseODataModel;
  /**
   * data item for read/create/update
   */
  data?: T;
  /**
   * data items for read
   */
  listData?: Array<T>;
  /**
   * key for update/delete/read
   */
  key?: any;
}

const KEY_HOOK_META = 'odata:hook';

const createHookDecorator = <E extends typeof BaseODataModel>(hookType: HookType) => (entityType?: E, order: number = 0) => (target: any) => {
  Reflect.defineMetadata(KEY_HOOK_META, { hookType, entityType, order }, target);
  registerHook(target);
};

interface HookMetadata { entityType: typeof BaseODataModel, hookType: HookType, order: number }

export const getHookMetadata = (target: any): HookMetadata => Reflect.getMetadata(KEY_HOOK_META, target);

/**
 * before instance create
 */
export const beforeCreate = createHookDecorator(HookType.beforeCreate);
/**
 * before instance update
 */
export const beforeUpdate = createHookDecorator(HookType.beforeUpdate);
/**
 * before instance delete
 */
export const beforeDelete = createHookDecorator(HookType.beforeDelete);
/**
 * before data response, after data load from databaes
 */
export const afterLoad = createHookDecorator(HookType.afterLoad);

