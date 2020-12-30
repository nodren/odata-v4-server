import { InstanceProvider } from '@newdash/inject';
import { Connection, QueryRunner } from 'typeorm';
export interface TransactionContext {
    /**
     * the uuid of this transaction
     */
    uuid: string;
    /**
     * commit transaction if existed
     */
    commit: () => Promise<void>;
    /**
     * rollback transaction if existed
     */
    rollback: () => Promise<void>;
}
export declare class TransactionQueryRunnerProvider implements InstanceProvider {
    provide(conn: Connection, tx: TransactionContext): Promise<QueryRunner>;
}
export declare class TransactionConnectionProvider implements InstanceProvider {
    provide(qr: QueryRunner): Promise<Connection>;
}
/**
 * create transaction context
 */
export declare const createTransactionContext: () => TransactionContext;
/**
 * get/create transaction for context
 *
 * PLEASE remember to rollback/commit it
 *
 * @param conn
 * @param ctx
 */
export declare function getOrCreateTransaction(conn: Connection, ctx: TransactionContext): Promise<QueryRunner>;
/**
 * rollback transaction if exist
 *
 * @param ctx
 */
export declare function rollbackTransaction(ctx: TransactionContext): Promise<void>;
/**
 * commit transaction if exist
 *
 * @param ctx
 */
export declare function commitTransaction(ctx: TransactionContext): Promise<void>;
