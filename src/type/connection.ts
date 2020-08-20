import { createConnection } from 'typeorm';

/**
 *
 * create database connection
 *
 * @alias typeorm createConnection
 */
export const createDBConnection = createConnection;

export { Connection, ConnectionOptions, QueryRunner, Repository } from 'typeorm';

