/// <reference types="node" />
import { InjectContainer } from '@newdash/inject';
import { Edm as Metadata, ServiceDocument, ServiceMetadata } from '@odata/metadata';
import { Token } from '@odata/parser/lib/lexer';
import * as express from 'express';
import * as http from 'http';
import { Readable, Writable } from 'stream';
import { ServerType } from './constants';
import { ODataController } from './controller';
import { ContainerBase } from './edm';
import * as odata from './odata';
import { IODataConnector } from './odata';
import { ODataProcessor, ODataProcessorOptions } from './processor';
import { ODataResult } from './result';
import { TransactionContext } from './transaction';
/** HTTP context interface when using the server HTTP request handler */
export interface ODataHttpContext {
    url: string;
    method: string;
    protocol: 'http' | 'https';
    host: string;
    base: string;
    request: express.Request & Readable;
    response: express.Response & Writable;
    tx?: TransactionContext;
}
/**
 * ODataServer base class to be extended by concrete OData Server data sources
 **/
export declare class ODataServerBase {
    static variant: ServerType;
    private static _metadataCache;
    static namespace: string;
    static container: ContainerBase;
    static parser: import("@odata/parser/lib/parser").Parser;
    static connector: IODataConnector;
    static validator: (odataQuery: string | Token) => null;
    static errorHandler: express.ErrorRequestHandler;
    static execute<T>(url: string, body?: object): Promise<ODataResult<T>>;
    static execute<T>(url: string, method?: string, body?: object): Promise<ODataResult<T>>;
    static execute<T>(context: object, body?: object): Promise<ODataResult<T>>;
    private static _injectContainer;
    static getInjectContainer(): InjectContainer;
    static createProcessor(context: any, options?: ODataProcessorOptions): Promise<ODataProcessor>;
    static $metadata(): ServiceMetadata;
    static $metadata(metadata: Metadata.Edmx | any): any;
    static document(): ServiceDocument;
    protected static addController(controller: typeof ODataController, isPublic?: boolean): any;
    protected static addController(controller: typeof ODataController, isPublic?: boolean, elementType?: Function): any;
    protected static addController(controller: typeof ODataController, entitySetName?: string, elementType?: Function): any;
    protected static getController(elementType: Function): any;
    static create(): express.Router;
    static create(port: number): http.Server;
    static create(path: string, port: number): http.Server;
    static create(port: number, hostname: string): http.Server;
    static create(path?: string | RegExp | number, port?: number | string, hostname?: string): http.Server;
    protected static getControllerInstance(controllerOrEntityType: any): Promise<ODataController>;
}
declare const ODataServer_base: odata.IODataBase<ODataServerBase, typeof ODataServerBase> & typeof ODataServerBase;
export declare class ODataServer extends ODataServer_base {
}
/**
 * Create Express server for OData Server
 * @param server OData Server instance
 * @return Express Router object
 */
export declare function createODataServer(server: typeof ODataServer): express.Router;
/** Create Express server for OData Server
 * @param server OData Server instance
 * @param port   port number for Express to listen to
 */
export declare function createODataServer(server: typeof ODataServer, port: number): http.Server;
/** Create Express server for OData Server
 * @param server OData Server instance
 * @param path   routing path for Express
 * @param port   port number for Express to listen to
 */
export declare function createODataServer(server: typeof ODataServer, path: string, port: number): http.Server;
/** Create Express server for OData Server
 * @param server   OData Server instance
 * @param port     port number for Express to listen to
 * @param hostname hostname for Express
 */
export declare function createODataServer(server: typeof ODataServer, port: number, hostname: string): http.Server;
export {};
