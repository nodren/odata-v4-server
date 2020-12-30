"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyValidate = void 0;
const utils_1 = require("@newdash/inject/lib/utils");
const NodeCache = require("node-cache");
const validateJs = require("validate.js");
const Edm = require("../edm");
const decorators_1 = require("./decorators");
const rulesCache = new NodeCache({ stdTTL: 3600 });
function applyValidate(entityType, input, method) {
    const className = utils_1.getClassName(entityType);
    const key = `${className}-${method}`;
    if (!rulesCache.has(key)) {
        const columnRules = createColumnValidationRules(entityType, method);
        const customRules = createCustomValidationRules(entityType);
        rulesCache.set(key, { columnRules, customRules });
    }
    const { columnRules, customRules } = rulesCache.get(key);
    const msgs = [];
    if (columnRules) {
        const errors = validateJs.validate(input, columnRules);
        if (errors != undefined) {
            Object.entries(errors).forEach(([key, value]) => {
                msgs.push(`property '${key}' ${value}`);
            });
        }
    }
    if (customRules) {
        const errors = validateJs.validate(input, customRules);
        if (errors != undefined) {
            Object.entries(errors).forEach(([key, value]) => {
                msgs.push(`property '${key}' ${value}`);
            });
        }
    }
    return msgs;
}
exports.applyValidate = applyValidate;
function createColumnValidationRules(entityType, method) {
    const entityProps = Edm.getProperties(entityType);
    const columnMetaValidationRules = entityProps.reduce((allRules, entityProp) => {
        const columnMeta = decorators_1.getPropertyOptions(entityType, entityProp);
        // navigation will not have column metadata
        if (columnMeta != undefined) {
            const columnValidateOpt = decorators_1.columnToValidateRule(columnMeta, method);
            if (columnValidateOpt !== undefined) {
                allRules[entityProp] = columnValidateOpt;
            }
        }
        return allRules;
    }, {});
    return columnMetaValidationRules;
}
function createCustomValidationRules(entityType) {
    const entityProps = Edm.getProperties(entityType);
    const customValidationRules = entityProps.reduce((allRules, entityProp) => {
        const columnMeta = decorators_1.getPropertyOptions(entityType, entityProp);
        // navigation will not have column metadata
        if (columnMeta !== undefined) {
            const customValidateOpt = decorators_1.getValidateOptions(entityType, entityProp);
            if (customValidateOpt != undefined) {
                allRules[entityProp] = customValidateOpt;
            }
        }
        return allRules;
    }, {});
    return customValidationRules;
}
//# sourceMappingURL=validate.js.map