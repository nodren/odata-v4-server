import { HookContext } from './hooks';
import { BaseODataModel } from '../model';
import { HookType } from './hook_type';

export abstract class HookProcessor<T extends typeof BaseODataModel = any> {

  abstract support(type: T, hook: HookType): boolean

  abstract async execute(ctx: HookContext<InstanceType<T>>): Promise<void>

}
