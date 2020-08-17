// @ts-nocheck
import { Connection, ConnectionOptions, createConnection, getConnection } from 'typeorm';
import { odata } from '..';
import { InjectKey } from '../constants';
import { createInstanceProvider } from '../inject';
import { createLogger } from '../logger';
import { ODataServer } from '../server';
import { createDBHelper } from './db_helper';
import { getODataEntitySetName, withConnection, withDBHelper, withEntityType, withODataServerType } from './decorators';
import { BaseODataModel, validateEntityType } from './entity';
import { BaseHookProcessor, withHook } from './hooks';
import { TypedService } from './service';

const logger = createLogger('type:server');

/**
 * typed odata server
 */
export class TypedODataServer extends ODataServer {

  /**
   * get service instance for entity
   *
   * @param entityType entity type of service
   */
  public static async getService<E extends typeof BaseODataModel>(entityType: E): Promise<TypedService<InstanceType<E>>> {
    return this.getControllerInstance(entityType);
  };

}

type TypedODataItems = typeof BaseODataModel | typeof BaseHookProcessor

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

        const dbHelper = createDBHelper(connOpt);

        logger(`create typed odata server with connection name: %s`, connName);

        const serverType = class extends TypedODataServer { };

        const iContainer = serverType.getInjectContainer();

        iContainer.registerProvider(createInstanceProvider(InjectKey.GlobalConnection, connObj));

        Object.defineProperty(serverType, 'name', { value: `TypedServerWithConn_${connName}` });

        configurations.filter((i) => Boolean(i)).forEach((configuration) => {

          withODataServerType(serverType)(configuration);
          withConnection(connName)(configuration);

          if (configuration.prototype instanceof BaseODataModel) {

            const entityType = configuration;

            validateEntityType(entityType);

            logger(`load entity %s`, configuration?.name || 'Unknown entity');

            const controllerType = class extends TypedService { };

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

          } else if (configuration.prototype instanceof BaseHookProcessor || configuration instanceof BaseHookProcessor) {

            logger(`load hook %s`, configuration?.name || 'Unknown hook');

            withHook(configuration)(serverType);

          }

        });

        resolve(serverType);
      } catch (error) {
        reject(error);
      }


    }, 0);

  });


}
