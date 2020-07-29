// @ts-nocheck

import { ConnectionOptions, createConnection } from 'typeorm';

export const createTmpConnection = (opt?: Partial<ConnectionOptions>) => createConnection({
  type: 'sqljs',
  synchronize: true,
  // logging: true,
  ...opt
});
