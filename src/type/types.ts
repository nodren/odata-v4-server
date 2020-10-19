import { InjectWrappedInstance } from '@newdash/inject';
import { TypedService } from './service';

export type Class<T = any> = new (...args: any[]) => T;
export { QueryOptionsNode as ODataQuery } from '@odata/parser';
export type InjectedTypedService<T = any> = InjectWrappedInstance<TypedService<T>>
