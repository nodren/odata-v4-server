/// <reference types="node" />
import { InjectContainer } from '@newdash/inject';
import { Transform } from 'stream';
import { ODataResult } from '../result';
import { ODataHttpContext, ODataServer } from '../server';
export declare const ODataRequestMethods: string[];
export declare type GeneratorAction = (value?: any) => any;
export declare type PromiseGeneratorHandler = Promise<any> | void;
export declare namespace ODataGeneratorHandlers {
    function PromiseHandler(request: any, next: GeneratorAction): PromiseGeneratorHandler;
    function StreamHandler(request: any, next: GeneratorAction): PromiseGeneratorHandler;
    function GeneratorHandler(request: any, next: GeneratorAction): PromiseGeneratorHandler;
}
export declare enum ODataMetadataType {
    minimal = 0,
    full = 1,
    none = 2
}
export interface ODataProcessorOptions {
    disableEntityConversion?: boolean;
    metadata?: ODataMetadataType;
    objectMode?: boolean;
}
export declare class ODataProcessor extends Transform {
    private serverType;
    private options;
    private ctrl;
    private prevCtrl;
    private instance;
    private resourcePath;
    private workflow;
    private context;
    private method;
    private url;
    private query;
    private entitySets;
    private odataContext;
    private body;
    private streamStart;
    private streamEnabled;
    private streamObject;
    private streamEnd;
    private streamInlineCount;
    private elementType;
    private resultCount;
    private container;
    constructor(context: ODataHttpContext, server: typeof ODataServer, options?: ODataProcessorOptions, ic?: InjectContainer);
    private _initInjectContainer;
    _transform(chunk: any, _: string, done: Function): any;
    _flush(done?: Function): void;
    private __qualifiedTypeName;
    private __EntityCollectionNavigationProperty;
    private __EntityNavigationProperty;
    private __PrimitiveProperty;
    private __read;
    private __deserialize;
    private __stripOData;
    private __EntitySetName;
    private __actionOrFunctionImport;
    private __actionOrFunction;
    private __appendLinks;
    private __appendODataContext;
    private __resolveAsync;
    private __setODataType;
    private __convertEntity;
    private __include;
    private __enableStreaming;
    /**
     * inject params
     *
     * @param container
     * @param name
     * @param params
     * @param queryString
     * @param result
     * @param include
     */
    private __applyParams;
    execute(body?: any): Promise<ODataResult>;
}
