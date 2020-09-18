import { inject, InstanceProvider, provider, transient } from '@newdash/inject';
import { Connection, QueryRunner } from 'typeorm';
import { v4 } from 'uuid';
import { InjectKey } from './constants';
import { createLogger } from './logger';

const logger = createLogger('type:tx');

const transactionStorage = new Map<string, QueryRunner>();

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

export class TransactionQueryRunnerProvider implements InstanceProvider {

  @transient
  @provider(InjectKey.TransactionQueryRunner)
  async provide(@inject(InjectKey.GlobalConnection) conn: Connection, @inject(InjectKey.RequestTransaction) tx: TransactionContext) {
    return await getOrCreateTransaction(conn, tx);
  }
}

export class TransactionConnectionProvider implements InstanceProvider {

  @transient
  @provider(InjectKey.TransactionConnection)
  async provide(@inject(InjectKey.TransactionQueryRunner) qr: QueryRunner) {
    return qr.manager.connection;
  }
}

/**
 * create transaction context
 */
export const createTransactionContext = (): TransactionContext => {
  const tx: TransactionContext = {
    uuid: v4(),
    commit: () => commitTransaction(tx),
    rollback: () => rollbackTransaction(tx)
  };
  return tx;
};

/**
 * get/create transaction for context
 *
 * PLEASE remember to rollback/commit it
 *
 * @param conn
 * @param ctx
 */
export async function getOrCreateTransaction(conn: Connection, ctx: TransactionContext): Promise<QueryRunner> {
  if (ctx == undefined || ctx.uuid == undefined) {
    throw new TypeError(`get/creation transaction failed, must provide 'uuid'`);
  }
  if (!transactionStorage.has(ctx.uuid)) {
    logger(`create transaction: %s`, ctx.uuid);
    const qr = conn.createQueryRunner(); // pool required
    await qr.connect();
    await qr.startTransaction(); // begin transaction
    transactionStorage.set(ctx.uuid, qr);
  }
  return transactionStorage.get(ctx.uuid);
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
export async function rollbackTransaction(ctx: TransactionContext): Promise<void> {
  if (transactionStorage.has(ctx.uuid)) {
    logger(`rollback transaction: %s`, ctx.uuid);
    const tx = transactionStorage.get(ctx.uuid);
    if (!tx.isReleased) {
      await tx.rollbackTransaction();
      await releaseTransaction(tx);
    }
    transactionStorage.delete(ctx.uuid);
  }
}

/**
 * commit transaction if exist
 *
 * @param ctx
 */
export async function commitTransaction(ctx: TransactionContext): Promise<void> {
  if (transactionStorage.has(ctx.uuid)) {
    logger(`commit transaction: %s`, ctx.uuid);
    const tx = transactionStorage.get(ctx.uuid);
    if (!tx.isReleased) {
      await tx.commitTransaction();
      await releaseTransaction(tx);
    }
    transactionStorage.delete(ctx.uuid);
  }
}

