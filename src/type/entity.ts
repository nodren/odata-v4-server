import forEach from '@newdash/newdash/forEach';
import { isFunction } from '@newdash/newdash/isFunction';
import isUndefined from '@newdash/newdash/isUndefined';
import { Connection, getConnection, Repository } from 'typeorm';
import { getKeyProperties, getProperties } from '..';
import { ForeignKeyValidationError, StartupError } from '../error';
import { getConnectionName, getODataEntityNavigations, getODataServerType } from './decorators';
import { TypedODataServer } from './server';
import { TypedService } from './service';
import { getOrCreateTransaction, TransactionContext } from './transaction';


export class BaseODataModel {

  private _getServerType(): typeof TypedODataServer {
    // @ts-ignore
    return getODataServerType(this.constructor);
  }

  protected async _gerService<E extends typeof BaseODataModel>(entity: E): Promise<TypedService<E>> {
    return this._getServerType().getService(entity);
  };
  /**
   * get main connection (without transaction)
   */
  protected async _getConnection(): Promise<Connection>;
  /**
   * get transactional connection
   *
   * @param ctx
   */
  protected async _getConnection(ctx?: TransactionContext): Promise<Connection>;
  protected async _getConnection(ctx?: TransactionContext) {
    return (await this._getQueryRunner(ctx)).manager.connection;
  }

  protected async _getEntityManager(ctx: TransactionContext) {
    return (await this._getQueryRunner(ctx)).manager;
  }

  protected async _getQueryRunner(ctx: TransactionContext) {
    // @ts-ignore
    return getOrCreateTransaction(getConnection(getConnectionName(this.constructor)), ctx);
  }

  protected async _getRepository(ctx: TransactionContext): Promise<Repository<this>>
  protected async _getRepository<M extends typeof BaseODataModel>(ctx: TransactionContext, entity?: M): Promise<Repository<InstanceType<M>>>
  protected async _getRepository(ctx: any, entity?: any) {
    return (await this._getConnection(ctx)).getRepository(entity || this.constructor);
  }

}

export function getClassName(type: new () => any) {
  return type.name;
}


export function isEntityHasProperty(entityType: typeof BaseODataModel, propName: string) {
  const properties = getProperties(entityType);
  return properties.includes(propName);
}

/**
 * validate entity type keys & foreign keys
 *
 * @param entityType
 */
export function validateEntityType(entityType: typeof BaseODataModel) {
  const entityName = getClassName(entityType);
  const keyNames = getKeyProperties(entityType);

  if (keyNames?.length != 1) {
    throw new StartupError(`${entityName} must have one and only one key property.`);
  }

  const navigations = getODataEntityNavigations(entityType);

  forEach(navigations, (navOption, navPropName) => {

    const targetEntityType = isFunction(navOption.entity) && navOption?.entity();

    if (isUndefined(targetEntityType)) {
      throw new ForeignKeyValidationError(`entity '${entityName}' navigation '${navPropName}' lost the target entity type.`);
    }

    if ('foreignKey' in navOption) {
      if (!isEntityHasProperty(entityType, navOption.foreignKey)) {
        throw new ForeignKeyValidationError(`entity '${entityName}' navigation '${navPropName}' has foreign key '${navOption.foreignKey}, but it not exist on this entity type.'`);
      }
    }

    if ('targetForeignKey' in navOption) {
      if (!isEntityHasProperty(targetEntityType, navOption.targetForeignKey as string)) {
        const targetEntityTypeName = getClassName(targetEntityType);
        throw new ForeignKeyValidationError(`entity '${entityName}' navigation '${navPropName}' has a ref foreign key '${navOption.targetForeignKey as string}' on entity ${targetEntityTypeName}, but it not exist on that entity type.'`);
      }
    }


  });

}
