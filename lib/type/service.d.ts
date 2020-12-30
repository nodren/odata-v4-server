import { InjectContainer } from '@newdash/inject';
import { ODataFilter, ODataQueryParam, QueryOptionsNode as ODataQuery } from '@odata/parser';
import 'reflect-metadata';
import { Connection, DeepPartial, QueryRunner, Repository } from 'typeorm';
import { ODataController } from '../controller';
import { TransactionContext } from '../transaction';
import { BaseODataModel } from './entity';
import { HookType } from './hooks';
import { TypedODataServer } from './server';
/**
 * Typeorm Service (Controller)
 */
export declare class TypedService<T = any> extends ODataController {
    constructor();
    /**
     * get main connection (without transaction)
     */
    protected _getConnection(): Promise<Connection>;
    protected _getEntityManager(qr?: QueryRunner): Promise<import("typeorm").EntityManager>;
    protected _getRepository(entityType?: any): Promise<Repository<T>>;
    protected _getService<E extends typeof BaseODataModel = any>(entityType: E, ic: InjectContainer, serverType: typeof TypedODataServer): Promise<TypedService<InstanceType<E>>>;
    protected _getEntityType(): any;
    protected executeHooks(hookType: HookType, data?: any, key?: any, ic?: InjectContainer, tx?: TransactionContext): Promise<void>;
    /**
     * transform inbound payload
     *
     * please AVOID run this method for single body multi times
     */
    private _transformInboundPayload;
    /**
     * apply typeorm transformers, for read only
     *
     * (because the SQL query can not be processed in typeorm lifecycle)
     *
     * @private
     * @internal
     * @ignore
     *
     * @param body
     */
    private _applyTransforms;
    findOne(key: any): Promise<T>;
    private _columnNameMappingStore;
    private createColumnMapper;
    find(queryString: string): Promise<Array<T>>;
    find(queryAst: ODataQuery): Promise<Array<T>>;
    find(queryObject: ODataQueryParam): Promise<Array<T>>;
    find(filter: ODataFilter): Promise<Array<T>>;
    find(filterOrQueryStringOrQueryAst?: any): Promise<Array<T>>;
    /**
     * deep insert
     *
     * @private
     * @ignore
     * @internal
     * @param parentBody
     * @param ctx
     *
     * @returns require the parent object re-save again
     */
    _deepInsert(parentBody: any): Promise<T>;
    /**
     * deep merge
     * @param parentBody
     * @param entityType
     */
    _deepMerge(parentBody: any): Promise<boolean>;
    create(body: DeepPartial<T>): Promise<T>;
    private _validate;
    save(key: any, body: DeepPartial<T>): Promise<void | T>;
    update(key: any, body: DeepPartial<T>): Promise<void>;
    delete(key: any): Promise<void>;
}
/**
 * provide odata service instance by entity
 */
export declare class ODataServiceProvider {
    provide(entityType: any, server: typeof TypedODataServer, tx: TransactionContext): Promise<import("@newdash/inject").InjectWrappedInstance<TypedService<any>>>;
}
/**
 * Typeorm Service for view
 */
export declare class TypedViewService<T = any> extends TypedService<T> {
    delete(key: any): Promise<void>;
    update(key: any, body: DeepPartial<T>): Promise<void>;
    create(body: DeepPartial<T>): Promise<T>;
    findOne(key: any): Promise<T>;
}
