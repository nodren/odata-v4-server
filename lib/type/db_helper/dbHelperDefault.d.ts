import { BaseDBHelper } from './dbHelper';
export declare class DefaultDBHelper extends BaseDBHelper {
    createIdentifierBuilder(colNameMapper: Function, tableName?: string, schema?: string): (columnName: string) => string;
    buildFullTableName(tableName: string, schema?: string): string;
    buildQueryStatement(selectedFields: any[], fullTableName: string, sqlQuery: string): string;
    buildCountStatement(countKey: string, fullTableName: string, whereExpr: string): string;
}
