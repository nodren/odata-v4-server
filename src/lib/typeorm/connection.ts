import { createConnection } from 'typeorm';
import { TypedService } from './controller';
import { BaseODataModel } from './model';

const KEY_CONN_NAME = 'odata:controller:connection';

/**
 * indicate the controller use the connection name
 * if user not use this decorator, or set empty connection name, the controller will use the 'default' connection of typeorm
 *
 * @param connectionName typeorm connection name
 */
export function withConnection(connectionName: string = 'default') {
  return function(controller: typeof TypedService) {
    Reflect.defineMetadata(KEY_CONN_NAME, connectionName, controller);
  };
}

/**
 * getConnectName for typed controller
 * @param target
 */
export function getConnectionName(target: typeof TypedService | typeof BaseODataModel) {
  return Reflect.getMetadata(KEY_CONN_NAME, target);
}


/**
 *
 * create database connection
 *
 * @alias typeorm createConnection
 */
export const createDBConnection = createConnection;
