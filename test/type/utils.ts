// @ts-nocheck
import { OData, ODataV4 } from '@odata/client';
import '@odata/client/lib/polyfill';
import { Server } from 'http';
import { Connection, ConnectionOptions, createConnection } from 'typeorm';
import { createTypedODataServer, TypedODataServer } from '../../src';
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

      // sap must use the upper case username/schema name
      username: process.env.HANA_USER.toUpperCase(),
      password: process.env.HANA_PASSWORD,
      host: process.env.HANA_HOST || '127.0.0.1',
      schema: (process.env.HANA_DATABASE || process.env.HANA_USER).toUpperCase(),

      port: parseInt(process.env.HANA_PORT),
      encrypt: Boolean(process.env.HANA_CLOUD_VERIFY),
      sslValidateCertificate: Boolean(process.env.HANA_CLOUD_VERIFY),

      // the hana instance for gh test is shared, add prefix to make parallel test correctly
      dropSchema: true,

      pool: {
        requestTimeout: 30 * 1000
      }
    };
  } else {
    defaultOpt = {
      type: 'sqljs'
    };
  }

  return createConnection(Object.assign(
    defaultOpt,
    opt,
    { synchronize: true, entityPrefix: `${process.pid}_${opt.entityPrefix || 'default'}` }
  ));
};

interface R { server: Server, client: ODataV4, odata: typeof TypedODataServer }

export async function createServerAndClient(conn: Partial<ConnectionOptions>, ...items: any[]): Promise<R>
export async function createServerAndClient(conn: Connection, ...items: any[]): Promise<R>
export async function createServerAndClient(conn, ...items: any[]) {

  if (!(conn instanceof Connection)) {
    conn = await createTmpConnection(conn);
  }

  const s = await createTypedODataServer(conn, ...items);
  const httpServer = s.create(randomPort());
  const port = await ready(httpServer);
  const client = OData.New4({ metadataUri: `http://127.0.0.1:${port}/$metadata`, processCsrfToken: false });

  return {
    odata: s,
    server: httpServer,
    client
  };

};
