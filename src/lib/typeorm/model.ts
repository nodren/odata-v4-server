import { BaseEntity, getConnection, Repository } from 'typeorm';
import { ODataHttpContext } from '../server';
import { getConnectionName } from './connection';
import { getOrCreateTransaction } from './transaction';

export class BaseODataModel extends BaseEntity {

  protected async _getConnection(ctx: ODataHttpContext) {
    return (await this._getQueryRunner(ctx)).connection;
  }

  protected async _getEntityManager(ctx: ODataHttpContext) {
    return (await this._getQueryRunner(ctx)).manager;
  }

  protected async _getQueryRunner(ctx: ODataHttpContext) {
    // @ts-ignore
    return getOrCreateTransaction(getConnection(getConnectionName(this.constructor)), ctx);
  }

  protected async _getRepository(ctx: ODataHttpContext): Promise<Repository<this>>
  protected async _getRepository<M extends typeof BaseODataModel>(ctx: ODataHttpContext, entity?: M): Promise<Repository<InstanceType<M>>>
  protected async _getRepository(ctx: any, entity?: any) {
    return (await this._getConnection(ctx)).getRepository(entity || this.constructor);
  }

}
