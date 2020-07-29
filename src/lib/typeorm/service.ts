import { BaseEntity, Connection, ConnectionOptions, createConnection } from 'typeorm';
import { odata } from '..';
import { ODataServer } from '../server';
import { withConnection } from './connection';
import { TypedController } from './controller';
import { TypedODataServer } from './server';

export async function createTypedODataServer(connectionOpt: ConnectionOptions, ...entities: (typeof BaseEntity)[]): Promise<typeof ODataServer>;
export async function createTypedODataServer(connectionName: string, ...entities: (typeof BaseEntity)[]): Promise<typeof ODataServer>;
export async function createTypedODataServer(connection: any, ...entities: (typeof BaseEntity)[]): Promise<typeof ODataServer> {

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

  entities.forEach((entity) => {
    const ct = class extends TypedController { };
    const entitySet = `${entity.name}s`;
    Object.defineProperty(ct, 'name', { value: `${entitySet}Controller` }); // define controller name to use decorator
    withConnection(connName)(ct);
    odata.withController(ct, entitySet, entity)(server); // default public controller
  });

  return server;

}
