import isEmpty from '@newdash/newdash/isEmpty';
import { ConnectionOptions, DatabaseType, ValueTransformer } from 'typeorm';
import { ODataQuery } from '..';
import { ServerInternalError } from '../error';
import { transformQueryAst } from './visitor';

export const DecimalTransformer: ValueTransformer = {
  from: (databaseColumn: string): string => {
    if (typeof databaseColumn == 'number') {
      return String(databaseColumn);
    }
    return databaseColumn;
  },
  to: (jsColumn): string => {
    if (typeof jsColumn == 'number') {
      return String(jsColumn);
    }
    return jsColumn;
  }
};

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
  countKey?: string;
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

const buildNameWithBackQuote = (...names: string[]): string => names.filter(Boolean).map((name) => `\`${name}\``).join('.');

const DEFAULT_COUNT_TOTAL_KEY = 'TOTAL';

export abstract class BaseDBHelper implements DBHelper {

  getDatabaseType(): EDatabaseType {
    return 'default';
  }

  buildSQL({ schema, tableName, query, countKey = DEFAULT_COUNT_TOTAL_KEY, colNameMapper = (v: string) => v }) {

    const fullTableName = this.buildFullTableName(tableName, schema);

    const nameMapper = this.createIdentifierBuilder(colNameMapper, tableName, schema);

    const astResult = transformQueryAst(query, nameMapper);

    const { sqlQuery, count, where, selectedFields } = astResult;

    const queryStatement = this.buildQueryStatement(selectedFields, fullTableName, sqlQuery);

    let countStatement = undefined;

    if (count) {
      countStatement = this.buildCountStatement(countKey, fullTableName, where);
    }

    return {
      queryStatement,
      countStatement
    };
  }

  abstract createIdentifierBuilder(colNameMapper: Function, tableName?: string, schema?: string): (columnName: string) => string;

  abstract buildFullTableName(tableName: string, schema?: string): string;

  abstract buildQueryStatement(selectedFields: any[], fullTableName: string, sqlQuery: string): string;

  abstract buildCountStatement(countKey: string, fullTableName: string, whereExpr: string): string;


}

export class DefaultDBHelper extends BaseDBHelper {

  createIdentifierBuilder(colNameMapper: Function, tableName?: string, schema?: string): (columnName: string) => string {
    return (columnName: string) => buildNameWithQuote(schema, tableName, colNameMapper(columnName));
  }

  buildFullTableName(tableName: string, schema?: string): string {
    return buildNameWithQuote(schema, tableName);
  }

  buildQueryStatement(selectedFields: any[], fullTableName: string, sqlQuery: string): string {
    const sSelects = isEmpty(selectedFields) ? '*' : selectedFields.join(', ');
    return `SELECT ${sSelects} FROM ${fullTableName} ${sqlQuery};`;
  }

  buildCountStatement(countKey: string, fullTableName: string, whereExpr: string): string {
    let countStatement = `SELECT count(1) AS "${countKey}" FROM ${fullTableName}`;
    if (whereExpr) { countStatement += ` WHERE ${whereExpr}`; }
    return countStatement;
  }

}

export class MySqlDBHelper extends BaseDBHelper {

  getDatabaseType(): EDatabaseType {
    return 'mysql';
  }

  createIdentifierBuilder(colNameMapper: Function, tableName?: string, schema?: string): (columnName: string) => string {
    return (columnName: string) => buildNameWithBackQuote(schema, tableName, colNameMapper(columnName));
  }

  buildFullTableName(tableName: string, schema?: string): string {
    return buildNameWithBackQuote(schema, tableName);
  }

  buildQueryStatement(selectedFields: any[], fullTableName: string, sqlQuery: string): string {
    const sSelects = isEmpty(selectedFields) ? '*' : selectedFields.join(', ');
    return `select ${sSelects} from ${fullTableName} ${sqlQuery};`;
  }

  buildCountStatement(countKey: string, fullTableName: string, whereExpr: string): string {
    let countStatement = `select count(1) as ${countKey} from ${fullTableName}`;
    if (whereExpr) { countStatement += ` where ${whereExpr}`; }
    return countStatement;
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
