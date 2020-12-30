import { LazyRef } from '@newdash/inject';
import 'reflect-metadata';
/**
 * inject odata service of entity type
 *
 * @param entityType entity class or lazy ref
 */
export declare function injectService(entityType: LazyRef): ParameterDecorator;
/**
 * inject request body
 *
 * @param target
 * @param targetKey
 * @param parameterIndex
 */
export declare const injectBody: ParameterDecorator;
/**
 * inject server type
 *
 * @param target
 * @param targetKey
 * @param parameterIndex
 */
export declare const injectServer: ParameterDecorator;
/**
 * inject InjectContainer
 *
 * @param target
 * @param targetKey
 * @param parameterIndex
 */
export declare const injectTheContainer: ParameterDecorator;
export declare const injectGlobalConnection: ParameterDecorator;
export declare const injectTransactionConnection: ParameterDecorator;
/**
 * alias for odata inject
 */
export declare const oInject: {
    server: ParameterDecorator;
    service: typeof injectService;
    body: ParameterDecorator;
    container: ParameterDecorator;
    globalConnection: ParameterDecorator;
    txConnection: ParameterDecorator;
};
