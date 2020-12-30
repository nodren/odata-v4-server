export declare type VisibleKey = 'createForm' | 'updateForm' | 'viewForm';
export declare function createUIAnnotationDecorator<ParamType extends Array<any>>(decoratorName: string): (...args: ParamType) => (...decoratorArgs: any[]) => void;
/**
 * ui metadata decorators
 */
export declare const ui: {
    ReadOnly: (...keys: Array<VisibleKey>) => PropertyDecorator;
    FormField: (...keys: Array<VisibleKey>) => PropertyDecorator;
    Label: (label: string) => PropertyDecorator & ClassDecorator;
    RequirePermission: (...permissions: string[]) => ClassDecorator;
    TableQueryItem: (defaultValue?: any) => PropertyDecorator;
    TableItem: (order?: number) => PropertyDecorator;
    Layout: (order?: number, group?: string) => PropertyDecorator;
};
