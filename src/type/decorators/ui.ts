import { Annotate } from '../../edm';

export type VisibleKey = 'createForm' | 'updateForm' | 'viewForm'

export function createUIAnnotationDecorator<ParamType extends Array<any>>(decoratorName: string) {
  const term = `UI.${decoratorName}`;
  return (...args: ParamType) => (...decoratorArgs: any[]) => {
    for (const arg of args) {
      // @ts-ignore
      Annotate({ term, string: arg })(...decoratorArgs);
    }
  };
}

/**
 * indicate item are readonly in some forms
 */
const ReadOnly: (...keys: Array<VisibleKey>) => PropertyDecorator = createUIAnnotationDecorator<Array<VisibleKey>>('ReadOnly');

/**
 * add item to some forms
 */
const FormField: (...keys: Array<VisibleKey>) => PropertyDecorator = createUIAnnotationDecorator<Array<VisibleKey>>('FormField');

/**
 * the item UI label
 *
 * @param label the label of the item
 */
const Label: (label: string) => PropertyDecorator & ClassDecorator = createUIAnnotationDecorator<[string]>('Label');

/**
 * the item layout in UI
 *
 * @param order the order of the item in UI
 * @param group the group of the item in UI
 */
const Layout: (order?: number, group?: string) => PropertyDecorator = createUIAnnotationDecorator<[number, string]>('NotVisible');

/**
 * the model require permission
 *
 */
const RequirePermission: (...permissions: string[]) => ClassDecorator = createUIAnnotationDecorator<Array<string>>('RequirePermission');

/**
 * the item should be listed in the table filter
 *
 * @param defaultValue default value of filter
 */
const TableQueryItem: (defaultValue?: any) => PropertyDecorator = createUIAnnotationDecorator<[any]>('TableQueryItem');

/**
 * the item should be listed in the table
 *
 * @param order order in table
 */
const TableItem: (order?: number) => PropertyDecorator = createUIAnnotationDecorator<[number]>('TableQueryField');

/**
 * ui metadata decorators
 */
export const ui = {
  ReadOnly,
  FormField,
  Label,
  RequirePermission,
  TableQueryItem,
  TableItem,
  Layout
};
