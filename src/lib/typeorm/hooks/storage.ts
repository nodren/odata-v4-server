import { sortBy } from '@newdash/newdash/sortBy';
import { BaseODataModel } from '../model';
import { HookType } from './hook_type';
import { BaseHookProcessor } from './processor';

const hooksStorage = new Set<BaseHookProcessor>();

/**
 * clear hooks
 */
export const clearHooks = () => {
  hooksStorage.clear();
};

/**
 * register processor
 *
 * @param processor
 */
export function registerHook(processor: BaseHookProcessor);
export function registerHook(processor: typeof BaseHookProcessor);
export function registerHook(processor: any) {
  if (processor instanceof BaseHookProcessor) {
    hooksStorage.add(processor);
  } else if (processor instanceof BaseHookProcessor.constructor) {
    // @ts-ignore
    hooksStorage.add(new processor);
  }
};

/**
 * find hooks by entity type and hook type
 *
 * @param entityType
 * @param hookType
 */
export const findHooks = <T extends typeof BaseODataModel>(entityType: T, hookType: HookType): Array<BaseHookProcessor<T>> => {

  let rt: Array<BaseHookProcessor> = [];

  hooksStorage.forEach((processor) => {
    if (processor.support(entityType, hookType)) {
      rt.push(processor);
    };
  });

  if (rt.length > 0) {
    rt = sortBy(rt, (processor) => processor.order());
  }

  return rt;

};
