// @ts-nocheck
import { createInstanceProvider, InjectWrappedInstance } from '@newdash/inject';
import { concat } from '@newdash/newdash';
import { uniq } from '@newdash/newdash/uniq';
import { Connection, ConnectionOptions, createConnection, getConnection } from 'typeorm';
import { odata } from '..';
import { InjectKey, ServerType } from '../constants';
import { createLogger } from '../logger';
import { ODataServer } from '../server';
import { createTransactionContext, TransactionContext } from '../transaction';
import { createDBHelper } from './db_helper';
import { getODataEntitySetName, isODataEntityType, withConnection, withDBHelper, withEntityType, withODataServerType } from './decorators';
import { BaseODataModel, validateEntityType } from './entity';
import { BaseHookProcessor, withHook } from './hooks';
import { TypedService } from './service';
import { Class } from './types';

const logger = createLogger('type:server');

type InstanceType<T> = T extends new (...args: any) => infer R ? R : any;
type TypedODataItems = typeof BaseODataModel | typeof BaseHookProcessor | any

/**
 * typed odata server
 */
export abstract class TypedODataServer extends ODataServer {

  public static variant = ServerType.typed

  /**
   * get service instance for entity
   *
   * @internal
   * @param entityType entity type of service
   */
  public static async getService<E extends Class>(entityType: E): Promise<TypedService<InstanceType<E>>> {
    return this.getControllerInstance(entityType);
  };

  public static async getServicesWithContext<T extends Array<any> = any[]>(tx: TransactionContext, ...entityTypes: T): Promise<{
    [K in keyof T]: InjectWrappedInstance<TypedService<InstanceType<T[K]>>>
  }> {
    const ic = await this.getInjectContainer().createSubContainer();
    ic.registerInstance(InjectKey.ODataTxContextParameter, tx);
    const services = await Promise.all(entityTypes.map(async (entityType) => {
      const innerContainer = await ic.createSubContainer();
      innerContainer.registerInstance(InjectKey.ODataTypeParameter, entityType, true);
      return innerContainer.wrap(await this.getControllerInstance(entityType));
    }));
    return services;
  };


  /**
   * get service instance with transaction context for specific entity
   *
   * @external
   * @param entityTypes entity types
   */
  public static async getServicesWithNewContext<T extends Array<new (...args: any[]) => any> = any[]>(...entityTypes: T): Promise<{
    tx: TransactionContext,
    services: { [K in keyof T]: InjectWrappedInstance<TypedService<InstanceType<T[K]>>> }
  }> {
    const tx = createTransactionContext();
    const services = await this.getServicesWithContext(tx, ...entityTypes);
    return { services, tx };
  };

  /**
   * get server owned connection
   */
  static abstract getConnection(): Connection;

}


export async function createTypedODataServer(connectionOpt: Connection, ...configurations: Array<TypedODataItems>): Promise<typeof TypedODataServer>;
export async function createTypedODataServer(connectionOpt: ConnectionOptions, ...configurations: Array<TypedODataItems>): Promise<typeof TypedODataServer>;
export async function createTypedODataServer(connectionName: string, ...configurations: Array<TypedODataItems>): Promise<typeof TypedODataServer>;
export async function createTypedODataServer(connection: any, ...configurations: Array<TypedODataItems>): Promise<typeof TypedODataServer> {

  return new Promise((resolve, reject) => {

    // run in next loop, wait all module load finished
    // to allow cycle reference on 'entity types' works fine
    setTimeout(async () => {

      try {

        let connName: string = 'default';
        let connOpt: ConnectionOptions = undefined;
        let connObj: Connection = undefined;

        if (connection instanceof Promise) {
          connection = await connection;
        }

        switch (typeof connection) {
          case 'object':
            if (connection instanceof Connection) {
              connObj = connection;
            } else {
              connObj = await createConnection(connection);
            }
            break;
          case 'string':
            connObj = getConnection(connection);
            break;
          default:
            throw new Error(`not supported initialized parameter [connection] for create odata server`);
        }

        connName = connObj.name;
        connOpt = connObj.driver.options;

        configurations = uniq(concat(configurations, connOpt.entities));

        const dbHelper = createDBHelper(connOpt);

        logger(`create typed odata server with connection name: %s`, connName);

        const serverType = class extends TypedODataServer {
          static getConnection() { return connObj; }
        };

        const iContainer = serverType.getInjectContainer();

        iContainer.registerProvider(createInstanceProvider(InjectKey.GlobalConnection, connObj));
        iContainer.registerProvider(createInstanceProvider(InjectKey.DatabaseHelper, dbHelper));

        Object.defineProperty(serverType, 'name', { value: `TypedServerWithConn_${connName}` });

        configurations.filter((i) => Boolean(i)).forEach((configuration) => {

          withODataServerType(serverType)(configuration);
          withConnection(connName)(configuration);

          if (configuration.prototype instanceof BaseHookProcessor || configuration instanceof BaseHookProcessor) {

            logger(`load hook %s`, configuration?.name || 'Unknown hook');

            withHook(configuration)(serverType);

          } else if (isODataEntityType(configuration)) {

            const entityType = configuration;

            validateEntityType(entityType);

            logger(`load entity %s`, configuration?.name || 'Unknown entity');

            const controllerType = class extends TypedService {
              elementType = entityType
            };

            const entitySetName = getODataEntitySetName(configuration);

            // define controller name to use decorator
            Object.defineProperty(controllerType, 'name', { value: `${entitySetName}Service` });

            withODataServerType(serverType)(controllerType);

            withEntityType(entityType)(controllerType);

            withDBHelper(dbHelper)(controllerType);

            // attach connection metadata
            withConnection(connName)(controllerType);

            // default public controller
            odata.withController(controllerType, entitySetName, configuration)(serverType);

          }


        });

        resolve(serverType);
      } catch (error) {
        reject(error);
      }


    }, 0);

  });


}
