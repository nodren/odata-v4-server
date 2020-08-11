import sortBy from '@newdash/newdash/sortBy';
import { BaseODataModel } from '../entity';
import { TypedODataServer } from '../server';
import { TypedService } from '../service';
import { TransactionContext } from '../transaction';
import { HookType } from './hook_type';
import { BaseHookProcessor } from './processor';

const KEY_WITH_HOOK = 'odata:with_hook';
const KEY_HOOK_META = 'odata:hook';

export interface HookContext<T = any> {


  /**
   * hook type
   */
  hookType: HookType;

  /**
   * entity type (constructor)
   */
  entityType: typeof BaseODataModel;

  /**
   * get service instance for entity
   */
  getService: <E extends typeof BaseODataModel>(entity: E) => TypedService<E>;

  /**
   * transaction released id
   *
   * 'afterXXX' events not have this property
   */
  txContext?: TransactionContext;

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


const createHookDecorator = <E extends typeof BaseODataModel>(hookType: HookType) => (entityType?: E, order: number = 0) => (target: any) => {
  Reflect.defineMetadata(KEY_HOOK_META, { hookType, entityType, order }, target);
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
 * before data response, after data load from database
 */
export const afterLoad = createHookDecorator(HookType.afterLoad);

export const afterCreate = createHookDecorator(HookType.afterCreate);
export const afterUpdate = createHookDecorator(HookType.afterUpdate);
export const afterDelete = createHookDecorator(HookType.afterDelete);


export function withHook(hook: typeof BaseHookProcessor | BaseHookProcessor) {
  return function (target: typeof TypedODataServer) {
    const hooks = getHooks(target);
    if (hook instanceof BaseHookProcessor) {
      hooks.add(hook);
    } else if (hook instanceof BaseHookProcessor.constructor) {
      // @ts-ignore
      hooks.add(new hook);
    }
    Reflect.defineMetadata(KEY_WITH_HOOK, hooks, target);
  };
}

export function getHooks(target: typeof TypedODataServer): Set<BaseHookProcessor> {
  return Reflect.getMetadata(KEY_WITH_HOOK, target) || new Set();
}


/**
 * find hooks by entity type and hook type
 *
 * @param entityType
 * @param hookType
 */
export const findHooks = <T extends typeof BaseODataModel>(serverType: typeof TypedODataServer, entityType: T, hookType: HookType): Array<BaseHookProcessor<T>> => {

  let rt: Array<BaseHookProcessor> = [];
  const hooks = getHooks(serverType);

  hooks.forEach((processor) => {
    if (processor.support(entityType, hookType)) {
      rt.push(processor);
    };
  });

  if (rt.length > 0) {
    rt = sortBy(rt, (processor) => processor.order());
  }

  return rt;

};
