import { isEmpty } from '@newdash/newdash';
import { EdmType } from '../../literal';
import { BaseDBHelper, EDatabaseType } from './dbHelper';


const buildNameWithBackQuote = (...names: string[]): string => names.filter(Boolean).map((name) => `\`${name}\``).join('.');


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
    return `SELECT ${sSelects} FROM ${fullTableName} ${sqlQuery};`;
  }

  buildCountStatement(countKey: string, fullTableName: string, whereExpr: string): string {
    let countStatement = `SELECT count(1) AS ${countKey} FROM ${fullTableName}`;
    if (whereExpr) { countStatement += ` WHERE ${whereExpr}`; }
    return countStatement;
  }

  mapQueryValue(type: EdmType, raw: string) {
    switch (type) {
      case EdmType.DateTimeOffset:
        return new Date(raw).getTime();
      case EdmType.Guid:
        // single quote for mysql
        return `'${raw}'`;
      default:
        return raw;
    }
  }

}
