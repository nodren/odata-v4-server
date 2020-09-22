import { DatabaseType } from 'typeorm';
import { ODataQuery } from '../..';
import { EdmType } from '../../literal';
import { transformQueryAst } from '../visitor';

const DEFAULT_COUNT_TOTAL_KEY = 'TOTAL';


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

  /**
   * map raw value from query string to db accepted format
   * @param type
   * @param raw
   */
  mapQueryValue(type: EdmType, raw: string): any;

}


export abstract class BaseDBHelper implements DBHelper {


  getDatabaseType(): EDatabaseType {
    return 'default';
  }

  buildSQL({ schema, tableName, query, countKey = DEFAULT_COUNT_TOTAL_KEY, colNameMapper = (v: string) => v }) {

    const fullTableName = this.buildFullTableName(tableName, schema);

    const nameMapper = this.createIdentifierBuilder(colNameMapper, tableName, schema);

    const astResult = transformQueryAst(query, nameMapper, this.mapQueryValue.bind(this));

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


  mapQueryValue(type: EdmType, raw: string) {
    switch (type) {
      case EdmType.DateTimeOffset:
        return new Date(raw).getTime();
      case EdmType.Guid:
        return `'${raw}'`;
      default:
        return raw;
    }
  }

  abstract createIdentifierBuilder(colNameMapper: Function, tableName?: string, schema?: string): (columnName: string) => string;

  abstract buildFullTableName(tableName: string, schema?: string): string;

  abstract buildQueryStatement(selectedFields: any[], fullTableName: string, sqlQuery: string): string;

  abstract buildCountStatement(countKey: string, fullTableName: string, whereExpr: string): string;


}

