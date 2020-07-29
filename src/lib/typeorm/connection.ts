import { createConnection } from 'typeorm';
import { TypedController } from './controller';

const KEY_CONN_NAME = 'odata:controller:connection';

/**
 * indicate the controller use the connection name
 * if user not use this decorator, or set empty connection name, the controller will use the 'default' connection of typeorm
 *
 * @param connectionName typeorm connection name
 */
export function withConnection(connectionName: string = 'default') {
  return function(controller: typeof TypedController) {
    Reflect.defineMetadata(KEY_CONN_NAME, connectionName, controller);
  };
}

/**
 * getConnectName for typed controller
 * @param target
 */
export function getConnectionName(target: typeof TypedController) {
  return Reflect.getMetadata(KEY_CONN_NAME, target);
}


/**
 *
 * create database connection
 *
 * @alias typeorm createConnection
 */
export const createDBConnection = createConnection;
