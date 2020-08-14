import { getClassConstructorParams, getClassInjectionInformation, getClassMethodParams, LazyRef } from './decorators';
import { ClassProvider, InstanceProvider } from './provider';


export class InjectContainer {

  private _store: Map<any, any>

  private _providers: Map<any, ClassProvider | InstanceProvider>

  constructor() {
    this._providers = new Map();
    this._store = new Map();
  }

  registerProvider(provider: InstanceProvider | ClassProvider) {
    this._providers.set(provider.type, provider);
  }

  async getInstance<T extends new (...args: any[]) => any>(type: LazyRef<T>): Promise<InstanceType<T>>;
  async getInstance<T extends new (...args: any[]) => any>(type: T): Promise<InstanceType<T>>;
  async getInstance(type: string): Promise<any>;
  async getInstance(type) {

    if (type instanceof LazyRef) {
      type = type.getRef();
    }

    if (this._providers.has(type)) {

      const provider = this._providers.get(type);

      if (!this._store.has(type)) {

        const inst = await this.injectExecute(provider, provider.provide);
        this._store.set(type, inst);

      }

      return this._store.get(type);

    }

    if (typeof type != 'string') {
      return await this._DefaultClassInstanceProvider(type);
    }

    throw new TypeError(`Not found type: '${type}' provider`);

  }

  async injectExecute(instance, method: Function) {
    const methodName = method.name;
    const type = instance.constructor;
    const paramsInfo = getClassMethodParams(type, methodName);
    const params = [];

    if (paramsInfo.length > 0) {

      for (let idx = 0; idx < paramsInfo.length; idx++) {
        const paramInfo = paramsInfo[idx];
        params[paramInfo.parameterIndex] = await this.getInstance(paramInfo.type);
      }

    }

    return method.apply(instance, params);
  }

  async _DefaultClassInstanceProvider<T extends new (...args: any[]) => any>(type: T): Promise<InstanceType<T>> {

    if (!this._store.has(type)) {
      const info = getClassInjectionInformation(type);
      const constructParametersInfo = getClassConstructorParams(type);
      const constructParams = [];

      if (constructParametersInfo.length > 0) {
        for (let idx = 0; idx < constructParametersInfo.length; idx++) {
          const paramInfo = constructParametersInfo[idx];
          constructParams[paramInfo.parameterIndex] = await this.getInstance(paramInfo.type);
        }
      }

      const inst = new type(...constructParams);
      this._store.set(type, inst);

      if (info.size > 0) {
        const keys = info.keys();
        for (const key of keys) {
          const prop = info.get(key);
          if (prop.injectType == 'classProperty') {
            inst[key] = await this.getInstance(prop.type);
          }
        }
      }

    }

    return this._store.get(type);

  }


}

