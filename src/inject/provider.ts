
export enum InstanceScope {
  SINGLETON = 'SINGLETON',
  REQUEST = 'REQUEST',
}

export interface InstanceProvider<T = any> {
  type: any;
  provide: (...args: any[]) => Promise<T>;
}

export const createInstanceProvider = (instanceId: any, instance: any) => new class implements InstanceProvider {
  type = instanceId;
  provide = async () => instance
};
