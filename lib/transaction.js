"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commitTransaction = exports.rollbackTransaction = exports.getOrCreateTransaction = exports.createTransactionContext = exports.TransactionConnectionProvider = exports.TransactionQueryRunnerProvider = void 0;
const tslib_1 = require("tslib");
const inject_1 = require("@newdash/inject");
const typeorm_1 = require("typeorm");
const uuid_1 = require("uuid");
const constants_1 = require("./constants");
const logger_1 = require("./logger");
const logger = logger_1.createLogger('type:tx');
const transactionStorage = new Map();
class TransactionQueryRunnerProvider {
    async provide(conn, tx) {
        return await getOrCreateTransaction(conn, tx);
    }
}
tslib_1.__decorate([
    inject_1.transient,
    inject_1.provider(constants_1.InjectKey.TransactionQueryRunner),
    inject_1.noWrap,
    tslib_1.__param(0, inject_1.inject(constants_1.InjectKey.GlobalConnection)), tslib_1.__param(1, inject_1.inject(constants_1.InjectKey.RequestTransaction)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeorm_1.Connection, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], TransactionQueryRunnerProvider.prototype, "provide", null);
exports.TransactionQueryRunnerProvider = TransactionQueryRunnerProvider;
class TransactionConnectionProvider {
    async provide(qr) {
        return qr.manager.connection;
    }
}
tslib_1.__decorate([
    inject_1.transient,
    inject_1.provider(constants_1.InjectKey.TransactionConnection),
    inject_1.noWrap,
    tslib_1.__param(0, inject_1.inject(constants_1.InjectKey.TransactionQueryRunner)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], TransactionConnectionProvider.prototype, "provide", null);
exports.TransactionConnectionProvider = TransactionConnectionProvider;
/**
 * create transaction context
 */
exports.createTransactionContext = () => {
    const tx = {
        uuid: uuid_1.v4(),
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
async function getOrCreateTransaction(conn, ctx) {
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
exports.getOrCreateTransaction = getOrCreateTransaction;
async function releaseTransaction(qr) {
    if (!qr.isReleased) {
        await qr.release();
    }
}
/**
 * rollback transaction if exist
 *
 * @param ctx
 */
async function rollbackTransaction(ctx) {
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
exports.rollbackTransaction = rollbackTransaction;
/**
 * commit transaction if exist
 *
 * @param ctx
 */
async function commitTransaction(ctx) {
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
exports.commitTransaction = commitTransaction;
//# sourceMappingURL=transaction.js.map