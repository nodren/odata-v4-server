// @ts-nocheck
import { OData } from '@odata/client';
import '@odata/client/lib/polyfill';
import { ConnectionOptions, createConnection } from 'typeorm';
import { createTypedODataServer } from '../../src';
import { randomPort } from '../utils/randomPort';
import { ready } from '../utils/server';

export const createTmpConnection = (opt?: Partial<ConnectionOptions>) => {
  let defaultOpt: ConnectionOptions;

  if (process.env.MYSQL_USER) {
    defaultOpt = {
      type: 'mysql',
      username: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      host: process.env.MYSQL_HOST || '127.0.0.1',
      database: process.env.MYSQL_DATABASE || process.env.MYSQL_USER,
      port: parseInt(process.env.MYSQL_PORT),
      charset: 'utf8mb4_unicode_ci'
    };
  } else if (process.env.PG_USER) {
    defaultOpt = {
      type: 'postgres',
      username: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      host: process.env.PG_HOST || '127.0.0.1',
      database: process.env.PG_DATABASE || process.env.PG_USER,
      port: parseInt(process.env.PG_PORT),
      extra: { max: 10 }
    };
  } else if (process.env.HANA_USER) {
    defaultOpt = {
      type: 'sap',
      username: process.env.HANA_USER,
      password: process.env.HANA_PASSWORD,
      host: process.env.HANA_HOST || '127.0.0.1',
      schema: process.env.HANA_DATABASE || process.env.HANA_USER,
      port: parseInt(process.env.HANA_PORT)
    };
  } else {
    defaultOpt = {
      type: 'sqljs'
    };
  }

  return createConnection(Object.assign(defaultOpt, opt, { synchronize: true }));
};

export const createServerAndClient = async (conn, ...items: any[]) => {

  const s = await createTypedODataServer(conn, ...items);
  const httpServer = s.create(randomPort());
  const port = await ready(httpServer);
  const client = OData.New4({ metadataUri: `http://127.0.0.1:${port}/$metadata`, processCsrfToken: false });

  return {
    server: httpServer,
    client
  };

};
