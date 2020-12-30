import { InjectWrappedInstance } from '@newdash/inject';
import { Connection, ConnectionOptions } from 'typeorm';
import { ServerType } from '../constants';
import { ODataServer } from '../server';
import { TransactionContext } from '../transaction';
import { BaseODataModel } from './entity';
import { BaseHookProcessor } from './hooks';
import { TypedService } from './service';
import { Class } from './types';
declare type InstanceType<T> = T extends new (...args: any) => infer R ? R : any;
declare type TypedODataItems = typeof BaseODataModel | typeof BaseHookProcessor | any;
/**
 * typed odata server
 */
export declare class TypedODataServer extends ODataServer {
    static variant: ServerType;
    /**
     * get service instance for entity
     *
     * @internal
     * @param entityType entity type of service
     */
    static getService<E extends Class>(entityType: E): Promise<TypedService<InstanceType<E>>>;
    static getServicesWithContext<T extends Array<any> = any[]>(tx: TransactionContext, ...entityTypes: T): Promise<{
        [K in keyof T]: InjectWrappedInstance<TypedService<InstanceType<T[K]>>>;
    }>;
    /**
     * get service instance with transaction context for specific entity
     *
     * @external
     * @param entityTypes entity types
     */
    static getServicesWithNewContext<T extends Array<new (...args: any[]) => any> = any[]>(...entityTypes: T): Promise<{
        tx: TransactionContext;
        services: {
            [K in keyof T]: InjectWrappedInstance<TypedService<InstanceType<T[K]>>>;
        };
    }>;
    /**
     * get server owned connection
     */
    static getConnection(): Connection;
}
export declare function createTypedODataServer(connectionOpt: Connection, ...configurations: Array<TypedODataItems>): Promise<typeof TypedODataServer>;
export declare function createTypedODataServer(connectionOpt: ConnectionOptions, ...configurations: Array<TypedODataItems>): Promise<typeof TypedODataServer>;
export declare function createTypedODataServer(connectionName: string, ...configurations: Array<TypedODataItems>): Promise<typeof TypedODataServer>;
export {};
