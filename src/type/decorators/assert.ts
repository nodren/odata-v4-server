import { isArray } from '@newdash/newdash';
import { isClass } from '@newdash/newdash/isClass';
import { isPlainObject } from '@newdash/newdash/isPlainObject';
import { ODataMethod } from '@odata/parser';
import BigNumber from 'bignumber.js';
import 'reflect-metadata';
import * as validate from 'validate.js';
import { getEnumValues } from '../utils';
import { EColumnOptions } from './odata';


interface BigNumberValidateOptions {
  integerOnly?: boolean;
  precision?: number;
}

validate.validators.bigNumber = function (value: BigNumber, options: BigNumberValidateOptions, key, attributes) {
  switch (typeof value) {
    case 'string':
      if (NUMERIC_REGEX.test(value)) {
        value = new BigNumber(value);
      } else {
        return 'not valid numeric string';
      }
      break;
    case 'number':
      value = new BigNumber(value);
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

export interface ConstraintOption {
  presence?: { allowEmpty?: boolean, message?: string };
  type?: 'array' | 'integer' | 'number' | 'string' | 'date' | 'boolean';
  /**
   * The inclusion validator is useful for validating input from a dropdown for example.
   * It checks that the given value exists in the list given by the `within` option.
   */
  inclusion?: {
    within: any[],
    message?: string;
  }
  /**
   * The exclusion validator is useful for restriction certain values.
   * It checks that the given value is not in the list given by the within option.
   */
  exclusion?: {
    within: any[],
    message?: string;
  }
  /**
   * The format validator will validate a value against a regular expression of your choosing.
   */
  format?: {
    pattern?: RegExp;
    message?: string;
  };
  length?: {
    minimum?: number;
    maximum?: number;
    is?: number;

    notValid?: string;
    wrongLength?: string;
    tooLong?: string;
    tooShort?: string;
  };
  numericality?: {
    greaterThan?: number;
    greaterThanOrEqualTo?: number;
    lessThan?: number;
    divisibleBy?: number;
    onlyInteger?: boolean;
    strict?: boolean;
    odd?: boolean;
    even?: boolean;

    notValid?: string;
    notInteger?: string;
    notGreaterThan?: string;
    notGreaterThanOrEqualTo?: string;
    notEqualTo?: string;
    notLessThan?: string;
    notLessThanOrEqualTo?: string;
    notDivisibleBy?: string;
    notOdd?: string;
    notEven?: string;
  },
  bigNumber?: BigNumberValidateOptions;
  email?: { message?: string },
  /**
   * This datetime validator can be used to validate dates and times.
   * Since date parsing in javascript is very poor some additional work is required to make this work.
   */
  datetime?: {
    /**
     * The date cannot be before this time.
     * This argument will be parsed using the parse function, just like the value.
     * The default error must be no earlier than %{date}
     */
    earliest?: string;
    latest?: string;
    /**
     * If true, only dates (not datetimes) will be allowed.
     * The default error is must be a valid date
     */
    dateOnly?: boolean;
  }
}

export function Validate(validateOptions: ConstraintOption): PropertyDecorator {
  return function (target, propertyKey) {
    Reflect.defineMetadata(KEY_PROP_CONSTRAINT, validateOptions, target, propertyKey);
  };
}

export function getValidateOptions(target, propertyKey): ConstraintOption {
  if (isClass(target)) {
    return Reflect.getMetadata(KEY_PROP_CONSTRAINT, target.prototype, propertyKey);
  }
  return Reflect.getMetadata(KEY_PROP_CONSTRAINT, target, propertyKey);
}

const NUMERIC_REGEX = /^[+\-]?(?=\.\d|\d)(?:0|[1-9]\d*)?(?:\.\d*)?(?:\d[eE][+\-]?\d+)?$/;
const UUID_REGEX = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
const ISO_DATE_FORMAT = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/;

export function columnToValidateRule(
  options: EColumnOptions,
  method: ODataMethod
): ConstraintOption {

  const cOption: ConstraintOption = {};

  if (options?.nullable == true || options?.default !== undefined || options?.generated) {
    // no required
  }
  else if (ODataMethod.POST == method) {
    cOption.presence = {}; // mandatory
  }

  if (typeof options.enumValues === 'object') {
    let enumValues = options.enumValues;
    if (isPlainObject(enumValues)) {
      enumValues = getEnumValues(enumValues);
    }
    if (isArray(enumValues)) {
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
      if (options?.length) {
        cOption.length = { maximum: options.length as number };
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
    case 'datetime': case 'datetime2': case 'datetimeoffset': case Date:
      cOption.type = 'string';
      cOption.format = {
        pattern: ISO_DATE_FORMAT,
        message: 'invalid datetime string, only support ISO format.'
      };
      break;
    case 'decimal': case 'dec': case 'float': case 'float4': case 'float8':
    case 'int': case 'integer': case 'int2': case 'int4': case 'int8': case 'int64': case 'bigint':
    // @ts-ignore
    case Number: case BigNumber:
      if (options.reflectType === Date) {
        cOption.type = 'string';
        cOption.format = {
          pattern: ISO_DATE_FORMAT,
          message: 'invalid datetime string, only support ISO format.'
        };
      } else if (options.reflectType === BigNumber) {
        cOption.bigNumber = {
          integerOnly: ['int', 'integer', 'int2', 'int4', 'int8', 'int64', 'bigint'].includes(options.type as string),
          precision: options.precision
        };
      } else {
        cOption.type = 'number';
        if (options?.precision) {
          cOption.length = { maximum: options.precision as number };
        }
        cOption.numericality = {
          onlyInteger: true
        };
      }

      break;
    case 'bool': case 'boolean':
      cOption.type = 'boolean';
      break;
    default:
      break;
  }


  return cOption;
}
