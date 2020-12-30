import { QueryOptionsNode as ODataQuery } from '@odata/parser';
import { DatabaseType } from 'typeorm';
import { EdmType } from '../../literal';
export interface BuildSQLOption {
    schema?: string;
    tableName: string;
    query: ODataQuery;
    countKey?: string;
    colNameMapper?: (columnName: string) => string;
}
export interface BuildSQLResult {
    queryStatement: string;
    countStatement?: string;
}
export declare type EDatabaseType = DatabaseType | 'default';
export interface DBHelper {
    getDatabaseType(): EDatabaseType;
    buildSQL(opt: BuildSQLOption): BuildSQLResult;
    /**
     * map raw value from query string to db accepted format
     * @param type
     * @param raw
     */
    mapQueryValue(type: EdmType, raw: string): any;
}
export declare abstract class BaseDBHelper implements DBHelper {
    getDatabaseType(): EDatabaseType;
    buildSQL({ schema, tableName, query, countKey, colNameMapper }: {
        schema: any;
        tableName: any;
        query: any;
        countKey?: string;
        colNameMapper?: (v: string) => string;
    }): {
        queryStatement: string;
        countStatement: any;
    };
    mapQueryValue(type: EdmType, raw: string): string | number;
    abstract createIdentifierBuilder(colNameMapper: Function, tableName?: string, schema?: string): (columnName: string) => string;
    abstract buildFullTableName(tableName: string, schema?: string): string;
    abstract buildQueryStatement(selectedFields: any[], fullTableName: string, sqlQuery: string): string;
    abstract buildCountStatement(countKey: string, fullTableName: string, whereExpr: string): string;
}
