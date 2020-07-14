import { HookProcessor } from './processor';
import { BaseODataModel } from '../model';
import { HookType } from './hook_type';

const hooksStorage = new Set<HookProcessor>();

export const registerHooks = (processor: HookProcessor) => {
  hooksStorage.add(processor);
};

export const findHooks = <T extends typeof BaseODataModel>(type: T, hookType: HookType): Array<HookProcessor<T>> => {
  const rt = [];
  hooksStorage.forEach((processor) => {
    if (processor.support(type, hookType)) {
      rt.push(processor);
    };
  });
  return rt;
};
