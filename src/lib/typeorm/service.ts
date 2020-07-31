// @ts-nocheck
import { BaseEntity, Connection, ConnectionOptions, createConnection } from 'typeorm';
import { odata } from '..';
import { ODataServer } from '../server';
import { withConnection } from './connection';
import { registerController, TypedService } from './controller';
import { getODataEntitySetName } from './decorators';
import { BaseHookProcessor, registerHook } from './hooks';
import { BaseODataModel } from './model';
import { TypedODataServer } from './server';

type TypedODataItems = typeof BaseEntity | typeof BaseHookProcessor

export async function createTypedODataServer(connectionOpt: Connection, ...configurations: Array<TypedODataItems>): Promise<typeof ODataServer>;
export async function createTypedODataServer(connectionOpt: ConnectionOptions, ...configurations: Array<TypedODataItems>): Promise<typeof ODataServer>;
export async function createTypedODataServer(connectionName: string, ...configurations: Array<TypedODataItems>): Promise<typeof ODataServer>;
export async function createTypedODataServer(connection: any, ...configurations: Array<TypedODataItems>): Promise<typeof ODataServer> {

  let connName: string = 'default';

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

  const server = class extends TypedODataServer { };

  configurations.forEach((configuration) => {

    if (configuration.prototype instanceof BaseODataModel || configuration.prototype instanceof BaseEntity) {

      const ct = class extends TypedService { };
      const entitySetName = getODataEntitySetName(configuration) || `${configuration.name}s`;

      // define controller name to use decorator
      Object.defineProperty(ct, 'name', { value: `${entitySetName}Controller` });

      // attach connection metadata
      withConnection(connName)(configuration);
      withConnection(connName)(ct);

      // default public controller
      odata.withController(ct, entitySetName, configuration)(server);
      registerController(configuration, ct);

    } else if (configuration.prototype instanceof BaseHookProcessor || configuration instanceof BaseHookProcessor) {

      registerHook(configuration);

    }

  });

  return server;

}
