import { QueryOptionsNode as ODataQuery, Token } from '@odata/parser';
import { EdmType } from '../literal';
interface ValueMapper {
    (type: EdmType, raw: string): any;
}
/**
 * transformFilterAst to where sql
 *
 * @param node
 */
export declare const transformFilterAst: (node: Token, nameMapper: FieldNameMapper, valueMapper: ValueMapper) => string;
/**
 * OData Field Mapping
 */
export interface FieldNameMapper {
    (field: string): string;
}
export declare const transformQueryAst: (node: ODataQuery, nameMapper: FieldNameMapper, valueMapper: ValueMapper) => {
    sqlQuery: string;
    selectedFields: unknown[];
    count: boolean;
    where: string;
    offset: number;
    limit: number;
};
export {};
