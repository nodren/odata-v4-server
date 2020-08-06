// @ts-nocheck
import { Connection, ConnectionOptions, createConnection } from 'typeorm';
import { odata } from '..';
import { createLogger } from '../logger';
import { ODataServer } from '../server';
import { withConnection } from './connection';
import { TypedService } from './controller';
import { getODataEntitySetName, withEntityType } from './decorators';
import { BaseHookProcessor, withHook } from './hooks';
import { BaseODataModel } from './model';
import { TypedODataServer, withODataServerType } from './server';

const logger = createLogger('type:service');

type TypedODataItems = typeof BaseODataModel | typeof BaseHookProcessor

export async function createTypedODataServer(connectionOpt: Connection, ...configurations: Array<TypedODataItems>): Promise<typeof ODataServer>;
export async function createTypedODataServer(connectionOpt: ConnectionOptions, ...configurations: Array<TypedODataItems>): Promise<typeof ODataServer>;
export async function createTypedODataServer(connectionName: string, ...configurations: Array<TypedODataItems>): Promise<typeof ODataServer>;
export async function createTypedODataServer(connection: any, ...configurations: Array<TypedODataItems>): Promise<typeof ODataServer> {

  let connName: string = 'default';

  if (connection instanceof Promise) {
    connection = await connection;
  }

  switch (typeof connection) {
    case 'object':

      if (connection instanceof Connection) {
        connName = connection.name;
      } else {
        const conn = await createConnection(connection);
        connName = conn.name;
      }
      break;
    case 'string':
      connName = connection;
      break;
    default:
      throw new Error(`not supported initialized parameter [connection] for create odata server`);
  }

  logger(`create typed odata server with connection name: %s`, connName);

  const serverType = class extends TypedODataServer { };

  Object.defineProperty(serverType, 'name', { value: `TypedServerWithConn_${connName}` });

  configurations.filter((i) => Boolean(i)).forEach((configuration) => {

    withODataServerType(serverType)(configuration);
    withConnection(connName)(configuration);

    if (configuration.prototype instanceof BaseODataModel) {

      const entityType = configuration;

      logger(`load entity %s`, configuration?.name || 'Unknown entity');

      const controllerType = class extends TypedService { };

      const entitySetName = getODataEntitySetName(configuration);

      // define controller name to use decorator
      Object.defineProperty(controllerType, 'name', { value: `${entitySetName}Controller` });

      withODataServerType(serverType)(controllerType);

      withEntityType(entityType)(controllerType);

      // attach connection metadata
      withConnection(connName)(controllerType);

      // default public controller
      odata.withController(controllerType, entitySetName, configuration)(serverType);

    } else if (configuration.prototype instanceof BaseHookProcessor || configuration instanceof BaseHookProcessor) {

      logger(`load hook %s`, configuration?.name || 'Unknown hook');

      withHook(configuration)(serverType);

    }

  });

  return serverType;

}
