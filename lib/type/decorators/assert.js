"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.columnToValidateRule = exports.getValidateOptions = exports.Validate = void 0;
const newdash_1 = require("@newdash/newdash");
const isClass_1 = require("@newdash/newdash/isClass");
const isPlainObject_1 = require("@newdash/newdash/isPlainObject");
const parser_1 = require("@odata/parser");
const bignumber_js_1 = require("bignumber.js");
require("reflect-metadata");
const validate = require("validate.js");
const utils_1 = require("../utils");
validate.validators.bigNumber = function (value, options, key, attributes) {
    switch (typeof value) {
        case 'string':
            if (NUMERIC_REGEX.test(value)) {
                value = new bignumber_js_1.default(value);
            }
            else {
                return 'not valid numeric string';
            }
            break;
        case 'number':
            value = new bignumber_js_1.default(value);
            break;
    }
    if (value !== null && value !== undefined) {
        if (options.integerOnly && !value.isInteger()) {
            return 'is not integer';
        }
        if (options.precision !== undefined && options.precision > 0 && value.precision() > options.precision) {
            return 'precision exceed';
        }
    }
    return null;
};
const KEY_PROP_CONSTRAINT = 'entity:constraint_information';
function Validate(validateOptions) {
    return function (target, propertyKey) {
        Reflect.defineMetadata(KEY_PROP_CONSTRAINT, validateOptions, target, propertyKey);
    };
}
exports.Validate = Validate;
function getValidateOptions(target, propertyKey) {
    if (isClass_1.isClass(target)) {
        return Reflect.getMetadata(KEY_PROP_CONSTRAINT, target.prototype, propertyKey);
    }
    return Reflect.getMetadata(KEY_PROP_CONSTRAINT, target, propertyKey);
}
exports.getValidateOptions = getValidateOptions;
const NUMERIC_REGEX = /^[+\-]?(?=\.\d|\d)(?:0|[1-9]\d*)?(?:\.\d*)?(?:\d[eE][+\-]?\d+)?$/;
const UUID_REGEX = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
const ISO_DATE_FORMAT = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/;
function columnToValidateRule(options, method) {
    const cOption = {};
    if ((options === null || options === void 0 ? void 0 : options.nullable) == true || (options === null || options === void 0 ? void 0 : options.default) !== undefined || (options === null || options === void 0 ? void 0 : options.generated)) {
        // no required
    }
    else if (parser_1.ODataMethod.POST == method) {
        cOption.presence = {}; // mandatory
    }
    if (typeof options.enumValues === 'object') {
        let enumValues = options.enumValues;
        if (isPlainObject_1.isPlainObject(enumValues)) {
            enumValues = utils_1.getEnumValues(enumValues);
        }
        if (newdash_1.isArray(enumValues)) {
            cOption.inclusion = {
                within: enumValues,
                message: '^value \'%{value}\' is not in enum values'
            };
        }
    }
    switch (options.type) {
        case 'date':
        case 'nvarchar':
        case 'nvarchar2':
        case 'varchar':
        case 'varchar2':
        case 'char':
        case 'text':
        case String:
            cOption.type = 'string';
            if (options === null || options === void 0 ? void 0 : options.length) {
                cOption.length = { maximum: options.length };
            }
            if (options.generated === 'uuid') {
                cOption.type = 'string';
                cOption.format = {
                    pattern: UUID_REGEX,
                    message: 'invalid uuid string.'
                };
            }
            break;
        case 'uuid':
            cOption.type = 'string';
            cOption.format = {
                pattern: UUID_REGEX,
                message: 'invalid uuid string.'
            };
            break;
        case 'datetime':
        case 'datetime2':
        case 'datetimeoffset':
        case Date:
            cOption.type = 'string';
            cOption.format = {
                pattern: ISO_DATE_FORMAT,
                message: 'invalid datetime string, only support ISO format.'
            };
            break;
        case 'decimal':
        case 'dec':
        case 'float':
        case 'float4':
        case 'float8':
        case 'int':
        case 'integer':
        case 'int2':
        case 'int4':
        case 'int8':
        case 'int64':
        case 'bigint':
        // @ts-ignore
        case Number:
        case bignumber_js_1.default:
            if (options.reflectType === Date) {
                cOption.type = 'string';
                cOption.format = {
                    pattern: ISO_DATE_FORMAT,
                    message: 'invalid datetime string, only support ISO format.'
                };
            }
            else if (options.reflectType === bignumber_js_1.default) {
                cOption.bigNumber = {
                    integerOnly: ['int', 'integer', 'int2', 'int4', 'int8', 'int64', 'bigint'].includes(options.type),
                    precision: options.precision
                };
            }
            else {
                cOption.type = 'number';
                if (options === null || options === void 0 ? void 0 : options.precision) {
                    cOption.length = { maximum: options.precision };
                }
                cOption.numericality = {
                    onlyInteger: true
                };
            }
            break;
        case 'bool':
        case 'boolean':
            cOption.type = 'boolean';
            break;
        default:
            break;
    }
    return cOption;
}
exports.columnToValidateRule = columnToValidateRule;
//# sourceMappingURL=assert.js.map