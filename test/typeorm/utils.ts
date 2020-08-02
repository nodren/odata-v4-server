// @ts-nocheck
import { OData } from '@odata/client';
import '@odata/client/lib/polyfill';
import { ConnectionOptions, createConnection } from 'typeorm';
import { createTypedODataServer } from '../../src';
import { randomPort } from '../utils/randomPort';
import { ready } from '../utils/server';

export const createTmpConnection = (opt?: Partial<ConnectionOptions>) => createConnection({
  type: 'sqljs',
  synchronize: true,
  // logging: true,
  ...opt
});

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