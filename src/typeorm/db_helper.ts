import isEmpty from '@newdash/newdash/isEmpty';
import { ConnectionOptions, DatabaseType, ValueTransformer } from 'typeorm';
import { ODataQuery } from '..';
import { ServerInternalError } from '../error';
import { transformQueryAst } from './visitor';

export const DateTimeTransformer: ValueTransformer = {
  from: (databaseColumn: number): Date => {
    if (typeof databaseColumn == 'string') { // fix mysql driver return string for column
      databaseColumn = parseInt(databaseColumn);
    }
    if (databaseColumn) {
      return new Date(databaseColumn);
    }
    return new Date(0);
  },
  to: (date): number => {
    switch (typeof date) {
      case 'string':
        return new Date(date).getTime();
      case 'object':
        if (date instanceof Date) {
          return date.getTime();
        }
        throw new ServerInternalError('not supported property type');
      default: return 0;
    }
  }
};

export interface BuildSQLOption {
  schema?: string;
  tableName: string;
  query: ODataQuery;
  countKey: string;
}

export interface BuildSQLResult {
  queryStatement: string;
  countStatement?: string;
}

export type EDatabaseType = DatabaseType | 'default'

export interface DBHelper {

  getDatabaseType(): EDatabaseType

  buildSQL(opt: BuildSQLOption): BuildSQLResult;

}


class BaseDBHelper implements DBHelper {

  buildSQL({ schema, tableName, query, countKey }) {
    let objName = tableName;

    if (schema) {
      objName = `"${schema}"."${tableName}"`;
    } else {
      objName = `"${tableName}"`;
    }

    const { sqlQuery, count, where, selectedFields } = transformQueryAst(query, (col) => `${objName}."${col}"`);

    const queryStatement = `select ${isEmpty(selectedFields) ? '*' : selectedFields.join(', ')} from ${objName} ${sqlQuery};`;
    let countStatement = undefined;

    if (count) {
      // use the uppercase 'total' field for hana database
      countStatement = `select count(1) as "${countKey}" from ${objName}`;
      if (where) { countStatement += ` where ${where}`; }
    }

    return {
      queryStatement,
      countStatement
    };
  }

  getDatabaseType(): EDatabaseType {
    return 'default';
  }


}

export class DefaultDBHelper extends BaseDBHelper {

}

export class MySqlDBHelper extends BaseDBHelper {

  buildSQL({ schema, tableName, query, countKey }) {
    let objName = tableName;

    if (schema) {
      objName = `${schema}.${tableName}`;
    } else {
      objName = `${tableName}`;
    }

    const { sqlQuery, count, where, selectedFields } = transformQueryAst(query, (col) => `${objName}.${col}`);

    const queryStatement = `select ${isEmpty(selectedFields) ? '*' : selectedFields.join(', ')} from ${objName} ${sqlQuery};`;

    let countStatement = undefined;

    if (count) {
      countStatement = `select count(1) as ${countKey} from ${objName}`;
      if (where) { countStatement += ` where ${where}`; }
    }

    return {
      queryStatement,
      countStatement
    };
  }
}

export const createDBHelper = (options: ConnectionOptions): DBHelper => {
  switch (options.type) {
    case 'mysql':
      return new MySqlDBHelper();
    default:
      return new DefaultDBHelper();
  }
};
