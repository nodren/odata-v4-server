import 'reflect-metadata';
import { ODataController } from './controller';
import { Connection } from 'typeorm';

const METADATA_KEY_TYPEORM_WITH_CONNECTION = 'typeorm:with-connection';

export interface ConnectionProvider {
  (): Promise<Connection>
}

/**
 * indicate the connection provider of this controller
 *
 * @param connProvider
 */
export function withConnection(connProvider: ConnectionProvider) {

  return function(target: typeof ORMController) {
    Reflect.defineMetadata(METADATA_KEY_TYPEORM_WITH_CONNECTION, { connProvider }, target);
  };

}

/**
 * Typeorm Controller
 */
export class ORMController<T = any> extends ODataController {

}
