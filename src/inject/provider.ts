
export enum InstanceScope {
  SINGLETON = 'SINGLETON',
  REQUEST = 'REQUEST',
}

export interface ClassProvider<T extends new (...args: any) => any = any> {
  type: T;
  provide: (...args: any[]) => Promise<InstanceType<T>>;
}

export interface InstanceProvider<T = any> {
  type: string;
  provide: (...args: any[]) => Promise<T>;
}


export const createInstanceProvider = (instanceId: string, instance: any) => new class implements InstanceProvider {
  type = instanceId;
  provide = async () => instance
};
