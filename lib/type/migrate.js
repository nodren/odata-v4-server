"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrate = exports.syncEntities = exports.saveDBConfiguration = exports.getDBConfiguration = exports.buildConnectionConfiguration = void 0;
const tslib_1 = require("tslib");
// @ts-nocheck
const newdash_1 = require("@newdash/newdash");
require("colors");
const typeorm_1 = require("typeorm");
const error_1 = require("../error");
const logger_1 = require("../logger");
const logger = logger_1.createLogger('migrate');
let DatabaseConfiguration = class DatabaseConfiguration {
};
tslib_1.__decorate([
    typeorm_1.PrimaryColumn(),
    tslib_1.__metadata("design:type", String)
], DatabaseConfiguration.prototype, "id", void 0);
tslib_1.__decorate([
    typeorm_1.Column('simple-json'),
    tslib_1.__metadata("design:type", Object)
], DatabaseConfiguration.prototype, "value", void 0);
DatabaseConfiguration = tslib_1.__decorate([
    typeorm_1.Entity()
], DatabaseConfiguration);
const INIT_DB_CONFIG = {
    version: {
        lock: { locked: false, lockedOn: null },
        versionNumber: 0
    }
};
function buildConnectionConfiguration(connectionOptions) {
    return {
        ...connectionOptions,
        cache: undefined,
        dropSchema: false,
        synchronize: true,
        entities: [DatabaseConfiguration]
    };
}
exports.buildConnectionConfiguration = buildConnectionConfiguration;
async function getDBConfiguration(connectionOptions) {
    const conn = await typeorm_1.createConnection(buildConnectionConfiguration(connectionOptions));
    const configRepo = conn.getRepository(DatabaseConfiguration);
    const allConfigList = await configRepo.find();
    const configs = {};
    allConfigList.forEach((config) => { configs[config.id] = config.value; });
    await conn.close();
    if (allConfigList.length == 0) {
        return INIT_DB_CONFIG;
    }
    return configs;
}
exports.getDBConfiguration = getDBConfiguration;
async function saveDBConfiguration(connectionOptions, configs) {
    const conn = await typeorm_1.createConnection(buildConnectionConfiguration(connectionOptions));
    const configRepo = conn.getRepository(DatabaseConfiguration);
    await configRepo.save(Object.entries(configs).map((entry) => ({ id: entry[0], value: entry[1] })));
    await conn.close();
}
exports.saveDBConfiguration = saveDBConfiguration;
async function syncEntities(connectionOptions, entities) {
    const conn = await typeorm_1.createConnection({ ...connectionOptions, dropSchema: false, synchronize: false, entities });
    await conn.driver.createSchemaBuilder().build();
    await conn.close();
}
exports.syncEntities = syncEntities;
async function migrate(connectionOptions, versionNumber = 1) {
    const { entities } = connectionOptions;
    let dbConfigs;
    for (let idx = 0; idx < 3; idx++) {
        dbConfigs = await getDBConfiguration(connectionOptions);
        // if remote database schema version is greater than local, no migration perform
        if (dbConfigs.version.versionNumber >= versionNumber) {
            logger('skip migration remote(%s), local(%s)', dbConfigs.version.versionNumber, versionNumber);
            return false;
        }
        if (dbConfigs.version.lock.locked == false) {
            break;
        }
        await newdash_1.sleep(60 * 1000);
    }
    const { version } = dbConfigs;
    const { lock } = version;
    if (lock.locked) {
        logger('lock database failed');
        throw new error_1.StartupError('Can not lock database.');
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
        }
        finally {
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
exports.migrate = migrate;
//# sourceMappingURL=migrate.js.map