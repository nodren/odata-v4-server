import { DBHelper, EDatabaseType } from './dbHelper';
import { DefaultDBHelper } from './dbHelperDefault';
import { MySqlDBHelper } from './dbHelperMySQL';

export * from './transformers';
export { DBHelper, EDatabaseType };

export const createDBHelper = (options: { type: EDatabaseType }): DBHelper => {
  switch (options.type) {
    case 'mysql':
      return new MySqlDBHelper();
    default:
      return new DefaultDBHelper();
  }
};
