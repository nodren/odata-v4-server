import { Connection, QueryRunner } from 'typeorm';
import { ODataHttpContext } from '../server';

const transactionStorage = new WeakMap<ODataHttpContext, QueryRunner>();

/**
 * get/create transaction for context
 *
 * @param conn
 * @param ctx
 */
export async function getOrCreateTransaction(conn: Connection, ctx: ODataHttpContext): Promise<QueryRunner> {

  if (!transactionStorage.has(ctx)) {
    const qr = conn.createQueryRunner(); // pool required
    await qr.connect();
    await qr.startTransaction(); // begin transaction
    transactionStorage.set(ctx, qr);
  }

  return transactionStorage.get(ctx);

}

/**
 * rollback transaction if exist
 *
 * @param ctx
 */
export async function rollbackTransaction(ctx: ODataHttpContext): Promise<void> {
  if (transactionStorage.has(ctx)) {
    await transactionStorage.get(ctx).rollbackTransaction();
  }
}

/**
 * commit transaction if exist
 *
 * @param ctx
 */
export async function commitTransaction(ctx: ODataHttpContext): Promise<void> {
  if (transactionStorage.has(ctx)) {
    await transactionStorage.get(ctx).commitTransaction();
  }
}

