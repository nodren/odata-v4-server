import { ODataHttpContext } from '../server';

export const getODataRoot = function(context: ODataHttpContext) {
  return `${context.protocol || 'http'}://${context.host || 'localhost'}${context.base || ''}`;
};
