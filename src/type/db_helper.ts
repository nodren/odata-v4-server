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
  colNameMapper?: (columnName: string) => string
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

const buildName = (...names: string[]): string => names.filter(Boolean).join('.');

const buildNameWithQuote = (...names: string[]): string => names.filter(Boolean).map((name) => `"${name}"`).join('.');

class BaseDBHelper implements DBHelper {

  getDatabaseType(): EDatabaseType {
    return 'default';
  }

  buildSQL({ schema, tableName, query, countKey, colNameMapper }) {

    if (colNameMapper == undefined) {
      colNameMapper = (v) => v;
    }

    const fullTableName = buildNameWithQuote(schema, tableName);

    const { sqlQuery, count, where, selectedFields } = transformQueryAst(
      query,
      (col) => buildNameWithQuote(schema, tableName, colNameMapper(col))
    );

    const queryStatement = `SELECT ${isEmpty(selectedFields) ? '*' : selectedFields.join(', ')} FROM ${fullTableName} ${sqlQuery};`;
    let countStatement = undefined;

    if (count) {
      // use the uppercase 'total' field for hana database
      countStatement = `SELECT count(1) as "${countKey}" FROM ${fullTableName}`;
      if (where) { countStatement += ` where ${where}`; }
    }

    return {
      queryStatement,
      countStatement
    };
  }


}

export class DefaultDBHelper extends BaseDBHelper {

}

export class MySqlDBHelper extends BaseDBHelper {

  getDatabaseType(): EDatabaseType {
    return 'mysql';
  }

  buildSQL({ schema, tableName, query, countKey, colNameMapper }) {

    if (colNameMapper == undefined) {
      colNameMapper = (v) => v;
    }

    const fullTableName = buildName(schema, tableName);

    const { sqlQuery, count, where, selectedFields } = transformQueryAst(
      query,
      (col) => buildName(schema, tableName, colNameMapper(col))
    );

    const queryStatement = `select ${isEmpty(selectedFields) ? '*' : selectedFields.join(', ')} from ${fullTableName} ${sqlQuery};`;

    let countStatement = undefined;

    if (count) {
      countStatement = `select count(1) as ${countKey} from ${fullTableName}`;
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
