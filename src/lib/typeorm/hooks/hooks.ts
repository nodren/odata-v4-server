import { ODataHttpContext } from '../../server';
import { BaseODataModel } from '../model';
import { HookType } from './hook_type';
import { registerHooks } from './storage';

export interface HookContext<T extends typeof BaseODataModel = any> {
  context: ODataHttpContext
  hookType: HookType
  entityType: T
  /**
   * data item for read/create/update
   */
  data?: InstanceType<T>
  /**
   * data items for read
   */
  listData?: Array<InstanceType<T>>
  /**
   * key for update/delete/read
   */
  key?: any
}

const KEY_HOOK_META = 'odata:hook';

const createHookDecorator = <E extends typeof BaseODataModel>(hookType: HookType) => (entityType?: E, order: number = 0) => (target: any) => {
  Reflect.defineMetadata(KEY_HOOK_META, { hookType, entityType, order }, target);
  registerHooks(target);
};

interface HookMetadata { entityType: typeof BaseODataModel, hookType: HookType, order: number }

export const getHookMetadata = (target: any): HookMetadata => Reflect.getMetadata(KEY_HOOK_META, target);

export const beforeCreate = createHookDecorator(HookType.beforeCreate);
export const beforeUpdate = createHookDecorator(HookType.beforeUpdate);
export const beforeDelete = createHookDecorator(HookType.beforeDelete);
export const afterLoad = createHookDecorator(HookType.afterLoad);

