import { ODataServer } from '../server';


export class TypedODataServer extends ODataServer {

}

const KEY_WITH_ODATA_SERVER = 'odata:with_server';

export function withODataServerType(serverType: typeof TypedODataServer) {
  return function (target: any) {
    Reflect.defineMetadata(KEY_WITH_ODATA_SERVER, serverType, target);
  };
}

export function getODataServerType(target: any): typeof ODataServer {
  return Reflect.getMetadata(KEY_WITH_ODATA_SERVER, target);
}
