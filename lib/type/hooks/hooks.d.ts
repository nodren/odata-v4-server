import { InjectContainer, InjectWrappedInstance } from '@newdash/inject';
import { TransactionContext } from '../../transaction';
import { BaseODataModel } from '../entity';
import { TypedODataServer } from '../server';
import { TypedService } from '../service';
import { HookType } from './hook_type';
import { BaseHookProcessor } from './processor';
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
    getService: <E extends typeof BaseODataModel>(entity: E) => Promise<InjectWrappedInstance<TypedService<InstanceType<E>>>>;
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
    /**
     * inject container
     */
    ic: InjectContainer;
}
interface HookMetadata {
    entityType: typeof BaseODataModel;
    hookType: HookType;
    order: number;
}
export declare const getHookMetadata: (target: any) => HookMetadata;
/**
 * before instance create
 */
export declare const beforeCreate: (entityType?: typeof BaseODataModel, order?: number) => (target: any) => void;
/**
 * before instance update
 */
export declare const beforeUpdate: (entityType?: typeof BaseODataModel, order?: number) => (target: any) => void;
/**
 * before instance delete
 */
export declare const beforeDelete: (entityType?: typeof BaseODataModel, order?: number) => (target: any) => void;
/**
 * before data response, after data load from database
 */
export declare const afterLoad: (entityType?: typeof BaseODataModel, order?: number) => (target: any) => void;
export declare const afterCreate: (entityType?: typeof BaseODataModel, order?: number) => (target: any) => void;
export declare const afterUpdate: (entityType?: typeof BaseODataModel, order?: number) => (target: any) => void;
export declare const afterDelete: (entityType?: typeof BaseODataModel, order?: number) => (target: any) => void;
export declare function withHook(hook: typeof BaseHookProcessor | BaseHookProcessor): (target: typeof TypedODataServer) => void;
export declare function getHooks(target: typeof TypedODataServer): Set<BaseHookProcessor>;
/**
 * find hooks by entity type and hook type
 *
 * @param entityType
 * @param hookType
 */
export declare const findHooks: <T extends typeof BaseODataModel>(serverType: typeof TypedODataServer, entityType: T, hookType: HookType) => BaseHookProcessor<T>[];
export {};
