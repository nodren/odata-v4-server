// @ts-nocheck
import { OData, ODataV4 } from '@odata/client';
import '@odata/client/lib/polyfill';
import { Server } from 'http';
import * as os from 'os';
import * as path from 'path';
import { Connection, ConnectionOptions, createConnection } from 'typeorm';
import { v4 } from 'uuid';
import { createTypedODataServer, TypedODataServer } from '../../src';
import { randomPort } from '../utils/randomPort';
import { ready, shutdown } from '../utils/server';

const createTmpDefaultOption = () => {
  let defaultOpt = undefined;

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

      pool: { requestTimeout: 30 * 1000 }
    };
  }

  return defaultOpt;
};

const createEntityPrefix = (entityPrefix = 'def') => `t_${v4().slice(0, 5)}_${entityPrefix}_`;

export const createTmpMigrateConnOpt = (opt?: Partial<ConnectionOptions>) => {

  let defaultOpt: ConnectionOptions = createTmpDefaultOption();

  if (defaultOpt == undefined) {
    defaultOpt = {
      type : 'sqlite',
      database : tmpdir(`${v4()}.db`)
    };
  }

  const combinedOpt = Object.assign(
    defaultOpt, opt,
    {
      entityPrefix: createEntityPrefix(opt.entityPrefix),
      logging: Boolean(process.env.TEST_DB_LOG)
    }
  );

  return combinedOpt;
};


export const createTmpConnOpt = (opt?: Partial<ConnectionOptions>) => {

  let defaultOpt: ConnectionOptions = createTmpDefaultOption();

  if (defaultOpt == undefined) {
    defaultOpt = { type: 'sqljs' };
  }

  const combinedOpt = Object.assign(
    defaultOpt, opt,
    {
      synchronize: true,
      entityPrefix: createEntityPrefix(opt.entityPrefix),
      logging: Boolean(process.env.TEST_DB_LOG)
    }
  );

  return combinedOpt;
};

export const createTmpConnection = async (opt?: Partial<ConnectionOptions>) => {

  const combinedOpt = createTmpConnOpt(opt);

  return createConnection(combinedOpt);

};

interface R {
  server: Server,
  client: ODataV4,
  odata: typeof TypedODataServer,
  /**
   * shut down server & close db connection
   */
  shutdownServer: () => Promise<void>
}

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
    client,
    shutdownServer: async () => {
      await shutdown(httpServer);
      await s.getConnection().close();
    }
  };

};

export function tmpdir(...parts: Array<string>) {
  return path.join(os.tmpdir(), ...parts);
}
