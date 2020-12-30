import 'colors';
import { ConnectionOptions } from 'typeorm';
export interface DBConfiguration {
    version: {
        lock: {
            locked: boolean;
            lockedOn: Date;
        };
        versionNumber: number;
    };
}
export declare function buildConnectionConfiguration(connectionOptions: Partial<ConnectionOptions>): ConnectionOptions;
export declare function getDBConfiguration(connectionOptions: Partial<ConnectionOptions>): Promise<DBConfiguration>;
export declare function saveDBConfiguration(connectionOptions: Partial<ConnectionOptions>, configs: DBConfiguration): Promise<void>;
export declare function syncEntities(connectionOptions: Partial<ConnectionOptions>, entities: Array<any>): Promise<void>;
export declare function migrate(connectionOptions: Partial<ConnectionOptions>, versionNumber?: number): Promise<boolean>;
