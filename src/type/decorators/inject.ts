import { inject, InjectContainer, LazyRef } from '@newdash/inject';
import 'reflect-metadata';
import { InjectKey } from '../../constants';
import { StartupError } from '../../error';


/**
 * inject odata service of entity type
 *
 * @param entityType entity class or lazy ref
 */
export function injectService(entityType: LazyRef): ParameterDecorator {
  if (!(entityType instanceof LazyRef)) {
    throw new StartupError(`must provide a lazy ref to avoid undefined issue for cycle reference.`);
  }
  return function (target, targetKey, parameterIndex) {
    inject.param(InjectKey.ODataTypedService, entityType)(target, targetKey, parameterIndex);
    inject(InjectKey.InjectODataService)(target, targetKey, parameterIndex);
  };
}

/**
 * inject request body
 *
 * @param target
 * @param targetKey
 * @param parameterIndex
 */
export const injectBody: ParameterDecorator = (target, targetKey, parameterIndex) => {
  inject(InjectKey.RequestBody)(target, targetKey, parameterIndex);
};

/**
 * inject server type
 *
 * @param target
 * @param targetKey
 * @param parameterIndex
 */
export const injectServer: ParameterDecorator = (target, targetKey, parameterIndex) => {
  inject(InjectKey.ServerType)(target, targetKey, parameterIndex);
};

/**
 * inject InjectContainer
 *
 * @param target
 * @param targetKey
 * @param parameterIndex
 */
export const injectTheContainer: ParameterDecorator = (target, targetKey, parameterIndex) => {
  inject(InjectContainer)(target, targetKey, parameterIndex);
};

export const injectGlobalConnection: ParameterDecorator = (target, targetKey, parameterIndex) => {
  inject(InjectKey.GlobalConnection)(target, targetKey, parameterIndex);
};

export const injectTransactionConnection: ParameterDecorator = (target, targetKey, parameterIndex) => {
  inject(InjectKey.TransactionConnection)(target, targetKey, parameterIndex);
};


/**
 * alias for odata inject
 */
export const oInject = {
  server: injectServer,
  service: injectService,
  body: injectBody,
  container: injectTheContainer,
  globalConnection: injectGlobalConnection,
  txConnection: injectTransactionConnection
};
