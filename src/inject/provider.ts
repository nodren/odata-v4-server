
export enum InstanceScope {
  SINGLETON = 'SINGLETON',
  REQUEST = 'REQUEST',
}

export interface InstanceProvider<T = any> {
  type: string;
  provide: (...args: any[]) => Promise<T>;
}

export const createInstanceProvider = (instanceId: string, instance: any) => new class implements InstanceProvider {
  type = instanceId;
  provide = async () => instance
};
