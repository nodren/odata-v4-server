import { isEmpty } from '@newdash/newdash';
import { BaseDBHelper } from './dbHelper';


const buildNameWithQuote = (...names: string[]): string => names.filter(Boolean).map((name) => `"${name}"`).join('.');

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
