// @ts-nocheck
import { sleep } from '@newdash/newdash';
import 'colors';
import { Column, ConnectionOptions, createConnection, Entity, PrimaryColumn } from 'typeorm';
import { StartupError } from '../error';
import { createLogger } from '../logger';

const logger = createLogger('migrate');

@Entity()
class DatabaseConfiguration {

  @PrimaryColumn()
  id: string;

  @Column('simple-json')
  value: any;

}

export interface DBConfiguration {
  version: {
    lock: {
      locked: boolean;
      lockedOn: Date;
    },
    versionNumber: number
  }
}

const INIT_DB_CONFIG: DBConfiguration = {
  version: {
    lock: { locked: false, lockedOn: null },
    versionNumber: 0
  }
};

export function buildConnectionConfiguration(connectionOptions: Partial<ConnectionOptions>): ConnectionOptions {
  return {
    ...connectionOptions,
    cache: undefined,
    dropSchema: false,
    synchronize: true,
    entities: [DatabaseConfiguration]
  };
}


export async function getDBConfiguration(connectionOptions: Partial<ConnectionOptions>): Promise<DBConfiguration> {

  const conn = await createConnection(buildConnectionConfiguration(connectionOptions));
  const configRepo = conn.getRepository(DatabaseConfiguration);

  const allConfigList = await configRepo.find();

  const configs = {};

  allConfigList.forEach((config) => { configs[config.id] = config.value; });

  await conn.close();

  if (allConfigList.length == 0) { return INIT_DB_CONFIG; }

  return configs;

}

export async function saveDBConfiguration(connectionOptions: Partial<ConnectionOptions>, configs: DBConfiguration) {

  const conn = await createConnection(buildConnectionConfiguration(connectionOptions));
  const configRepo = conn.getRepository(DatabaseConfiguration);

  await configRepo.save(Object.entries(configs).map((entry) => ({ id: entry[0], value: entry[1] })));
  await conn.close();

}

export async function syncEntities(connectionOptions: Partial<ConnectionOptions>, entities: Array<any>) {
  const conn = await createConnection({ ...connectionOptions, dropSchema: false, synchronize: false, entities });
  await conn.driver.createSchemaBuilder().build();
  await conn.close();
}


export async function migrate(
  connectionOptions: Partial<ConnectionOptions>,
  versionNumber: number = 1
): Promise<boolean> {
  const { entities } = connectionOptions;

  let dbConfigs: DBConfiguration;

  for (let idx = 0; idx < 3; idx++) {
    dbConfigs = await getDBConfiguration(connectionOptions);
    // if remote database schema version is greater than local, no migration perform
    if (dbConfigs.version.versionNumber >= versionNumber) {
      logger('skip migration remote(%s), local(%s)', dbConfigs.version.versionNumber, versionNumber);
      return false;
    }
    if (dbConfigs.version.lock.locked == false) { break; }
    await sleep(60 * 1000);
  }

  const { version } = dbConfigs;
  const { lock } = version;

  if (lock.locked) {
    logger('lock database failed');
    throw new StartupError('Can not lock database.');
  }

  // if provided version is newer that server recorded
  if (versionNumber > version.versionNumber) {
    lock.locked = true;
    lock.lockedOn = new Date();
    // lock
    await saveDBConfiguration(connectionOptions, dbConfigs);
    logger('acquire migration lock');

    try {
      await syncEntities(connectionOptions, entities);
      logger(`migrate database schema from version '${version.versionNumber}' to version '${versionNumber}'`);
      version.versionNumber = versionNumber;
    } finally {
      // release lock
      lock.locked = false;
      lock.lockedOn = null;
      await saveDBConfiguration(connectionOptions, dbConfigs);
      logger('release lock');
    }

    return true;
  }

  return false;
}
