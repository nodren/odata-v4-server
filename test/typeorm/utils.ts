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
      database: process.env.MYSQL_DATABASE,
      port: parseInt(process.env.MYSQL_PORT)
    };
  } else {
    defaultOpt = {
      type: 'sqljs',
      synchronize: true
    };
  }

  return createConnection(Object.assign(defaultOpt, opt));
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
