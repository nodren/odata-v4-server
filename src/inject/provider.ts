
export interface InstanceProvider<T = any> {
  type: any;
  transient?: boolean;
  provide: (...args: any[]) => Promise<T>;
}

export const createInstanceProvider = (type: any, instance: any) => new class implements InstanceProvider {
  transient = false;
  type = type;
  provide = async () => instance
};
