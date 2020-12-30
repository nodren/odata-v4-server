import { Token } from '@odata/parser/lib/lexer';
import * as odata from './odata';
export declare class ODataControllerBase {
    entitySetName: string;
    elementType: any;
    static containerName: string;
    static validator: (odataQuery: string | Token) => null;
    static on(method: string, fn: Function | string, ...keys: string[]): void;
    /** Enables the filtering
     * @param fn
     * @param param
     */
    static enableFilter(fn: Function | string, param?: string): void;
}
declare const ODataController_base: odata.IODataBase<ODataControllerBase, typeof ODataControllerBase> & typeof ODataControllerBase;
export declare class ODataController extends ODataController_base {
}
export {};
