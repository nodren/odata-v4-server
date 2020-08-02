import { BaseEntity, getConnection, Repository } from 'typeorm';
import { getControllerInstance } from '../controller';
import { getPublicControllers } from '../odata';
import { ODataHttpContext } from '../server';
import { getConnectionName } from './connection';
import { TypedService } from './controller';
import { getODataEntitySetName } from './decorators';
import { getODataServerType } from './server';
import { getOrCreateTransaction } from './transaction';

export class BaseODataModel extends BaseEntity {

  protected _gerService<E extends typeof BaseODataModel>(entity: E): TypedService<E> {
    const serverType = getODataServerType(this.constructor);
    const controllers = getPublicControllers(serverType);
    const entitySetName = getODataEntitySetName(entity);
    // @ts-ignore
    return getControllerInstance(controllers[entitySetName]);
  };

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
