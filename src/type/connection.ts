import { createConnection } from 'typeorm';

/**
 *
 * create database connection
 *
 * @alias typeorm createConnection
 */
export const createDBConnection = createConnection;

export { ConnectionOptions } from 'typeorm';
