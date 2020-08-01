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

async function releaseTransaction(qr: QueryRunner): Promise<void> {
  if (!qr.isReleased) {
    await qr.release();
  }
}

/**
 * rollback transaction if exist
 *
 * @param ctx
 */
export async function rollbackTransaction(ctx: ODataHttpContext): Promise<void> {
  if (transactionStorage.has(ctx)) {
    const tx = transactionStorage.get(ctx);
    await tx.rollbackTransaction();
    await releaseTransaction(tx);
    transactionStorage.delete(ctx);
  }
}

/**
 * commit transaction if exist
 *
 * @param ctx
 */
export async function commitTransaction(ctx: ODataHttpContext): Promise<void> {
  if (transactionStorage.has(ctx)) {
    const tx = transactionStorage.get(ctx);
    await tx.commitTransaction();
    await releaseTransaction(tx);
    transactionStorage.delete(ctx);
  }
}

