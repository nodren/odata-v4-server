import { InjectWrappedInstance } from '@newdash/inject';
import { TypedService } from './service';
export declare type Class<T = any> = new (...args: any[]) => T;
export { QueryOptionsNode as ODataQuery } from '@odata/parser';
export declare type InjectedTypedService<T = any> = InjectWrappedInstance<TypedService<T>>;
