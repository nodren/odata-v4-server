"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ui = exports.createUIAnnotationDecorator = void 0;
const edm_1 = require("../../edm");
function createUIAnnotationDecorator(decoratorName) {
    const term = `UI.${decoratorName}`;
    return (...args) => (...decoratorArgs) => {
        for (const arg of args) {
            // @ts-ignore
            edm_1.Annotate({ term, string: arg })(...decoratorArgs);
        }
    };
}
exports.createUIAnnotationDecorator = createUIAnnotationDecorator;
/**
 * indicate item are readonly in some forms
 */
const ReadOnly = createUIAnnotationDecorator('ReadOnly');
/**
 * add item to some forms
 */
const FormField = createUIAnnotationDecorator('FormField');
/**
 * the item UI label
 *
 * @param label the label of the item
 */
const Label = createUIAnnotationDecorator('Label');
/**
 * the item layout in UI
 *
 * @param order the order of the item in UI
 * @param group the group of the item in UI
 */
const Layout = createUIAnnotationDecorator('NotVisible');
/**
 * the model require permission
 *
 */
const RequirePermission = createUIAnnotationDecorator('RequirePermission');
/**
 * the item should be listed in the table filter
 *
 * @param defaultValue default value of filter
 */
const TableQueryItem = createUIAnnotationDecorator('TableQueryItem');
/**
 * the item should be listed in the table
 *
 * @param order order in table
 */
const TableItem = createUIAnnotationDecorator('TableQueryField');
/**
 * ui metadata decorators
 */
exports.ui = {
    ReadOnly,
    FormField,
    Label,
    RequirePermission,
    TableQueryItem,
    TableItem,
    Layout
};
//# sourceMappingURL=ui.js.map