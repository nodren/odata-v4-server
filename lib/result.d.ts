/// <reference types="node" />
import { Readable, Writable } from 'stream';
export declare class ODataStream {
    stream: any;
    contentType: string;
    constructor(contentType: string);
    constructor(stream: any, contentType?: string);
    pipe(destination: Writable): Promise<Readable | ODataStream>;
    write(source: Readable): Promise<Writable | ODataStream>;
}
export interface IODataResult<T = {}> {
    '@odata.context'?: string;
    '@odata.count'?: number;
    value?: T[];
    [x: string]: any;
}
export declare class ODataResult<T = {}> {
    statusCode: number;
    body: IODataResult<T> & T;
    elementType: Function;
    contentType: string;
    stream?: any;
    private _originalResult?;
    constructor(statusCode: number, contentType?: string, result?: any);
    getOriginalResult(): any;
    static Created: (result: any, contentType?: string) => Promise<ODataResult>;
    static Ok: (result: any, contentType?: string) => Promise<ODataResult>;
    static NoContent: (result?: any, contentType?: string) => Promise<ODataResult>;
}
