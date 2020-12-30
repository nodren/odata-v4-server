import { Connection, Repository } from 'typeorm';
import { TransactionContext } from '../transaction';
import { TypedService } from './service';
/**
 * @deprecated DO not use this, it will be removed
 */
export declare class BaseODataModel {
    private _getServerType;
    protected _getService<E extends typeof BaseODataModel = any>(entityType: E): Promise<TypedService<InstanceType<E>>>;
    /**
     * get main connection (without transaction)
     */
    protected _getConnection(): Promise<Connection>;
    /**
     * get transactional connection
     *
     * @param ctx
     */
    protected _getConnection(ctx?: TransactionContext): Promise<Connection>;
    protected _getEntityManager(ctx: TransactionContext): Promise<import("typeorm").EntityManager>;
    protected _getQueryRunner(ctx: TransactionContext): Promise<import("typeorm").QueryRunner>;
    protected _getRepository(ctx: TransactionContext): Promise<Repository<this>>;
    protected _getRepository<M extends typeof BaseODataModel>(ctx: TransactionContext, entity?: M): Promise<Repository<InstanceType<M>>>;
}
export declare function getClassName(type: new () => any): string;
export declare function isEntityHasProperty(entityType: typeof BaseODataModel, propName: string): boolean;
/**
 * validate entity type keys & foreign keys
 *
 * @param entityType
 */
export declare function validateEntityType(entityType: typeof BaseODataModel): void;
