
import debug from 'debug';


export const createLogger = (moduleName: string) => debug(`@odata/server:${moduleName}`);
