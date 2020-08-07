import isEmpty from '@newdash/newdash/isEmpty';
import { ConnectionOptions, DatabaseType } from 'typeorm';
import { ODataQuery } from '..';
import { transformQueryAst } from './visitor';


export interface BuildSQLOption {
  schema?: string;
  tableName: string;
  query: ODataQuery;
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

  buildSQL({ schema, tableName, query }) {
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
      countStatement = `select count(1) as TOTAL from ${objName}`;
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

  buildSQL({ schema, tableName, query }) {
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
      countStatement = `select count(1) as total from ${objName}`;
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
