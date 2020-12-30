import { EdmType } from '../../literal';
import { BaseDBHelper, EDatabaseType } from './dbHelper';
export declare class MySqlDBHelper extends BaseDBHelper {
    getDatabaseType(): EDatabaseType;
    createIdentifierBuilder(colNameMapper: Function, tableName?: string, schema?: string): (columnName: string) => string;
    buildFullTableName(tableName: string, schema?: string): string;
    buildQueryStatement(selectedFields: any[], fullTableName: string, sqlQuery: string): string;
    buildCountStatement(countKey: string, fullTableName: string, whereExpr: string): string;
    mapQueryValue(type: EdmType, raw: string): string | number;
}
