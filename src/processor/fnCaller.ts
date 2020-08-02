import { getFunctionParameters } from '../utils';

export const fnCaller = function(oThis: any, fn, params) {
  params = params || {};
  const fnParams: any[] = getFunctionParameters(fn);
  for (let i = 0; i < fnParams.length; i++) {
    fnParams[i] = params[fnParams[i]];
  }
  return fn.apply(oThis, fnParams);
};
