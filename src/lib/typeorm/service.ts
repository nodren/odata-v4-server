import { BaseEntity } from 'typeorm';
import { odata } from '..';
import { ODataServer } from '../server';
import { TypedController, withConnection } from './controller';
import { TypedODataServer } from './server';

export function createTypedODataServer(connectionName: string = 'default', ...entities: (typeof BaseEntity)[]): typeof ODataServer {

  const server = class extends TypedODataServer { };

  entities.forEach((entity) => {
    const ct = class extends TypedController { };
    const entitySet = `${entity.name}s`;
    Object.defineProperty(ct, 'name', { value: `${entitySet}Controller` }); // define controller name to use decorator
    withConnection(connectionName)(ct);
    odata.withController(ct, entitySet, entity)(server); // default public controller
  });

  return server;

}
