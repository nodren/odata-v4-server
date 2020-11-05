import { getClassName } from '@newdash/inject/lib/utils';
import { Class } from '@newdash/newdash/types';
import { ODataMethod } from '@odata/parser';
import * as NodeCache from 'node-cache';
import * as validateJs from 'validate.js';
import * as Edm from '../edm';
import { columnToValidateRule, getPropertyOptions, getValidateOptions } from './decorators';

const rulesCache = new NodeCache({ stdTTL: 3600 });

export function applyValidate(entityType: Class, input: any, method: ODataMethod): string[] {
  const className = getClassName(entityType);
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

/**
 * generate validation from column metadata
 *
 * @param entityType
 * @param method
 */
function createColumnValidationRules(entityType: Class, method: ODataMethod) {
  const entityProps = Edm.getProperties(entityType);
  const columnMetaValidationRules = entityProps.reduce((allRules, entityProp) => {
    const columnMeta = getPropertyOptions(entityType, entityProp);
    // navigation will not have column metadata
    if (columnMeta != undefined) {
      const columnValidateOpt = columnToValidateRule(columnMeta, method);
      if (columnValidateOpt !== undefined) {
        allRules[entityProp] = columnValidateOpt;
      }
    }
    return allRules;
  }, {});
  return columnMetaValidationRules;
}

/**
 * generate validation from decorators
 *
 * @param entityType
 */
function createCustomValidationRules(entityType: Class) {

  const entityProps = Edm.getProperties(entityType);

  const customValidationRules = entityProps.reduce((allRules, entityProp) => {
    const columnMeta = getPropertyOptions(entityType, entityProp);
    // navigation will not have column metadata
    if (columnMeta !== undefined) {
      const customValidateOpt = getValidateOptions(entityType, entityProp);
      if (customValidateOpt != undefined) {
        allRules[entityProp] = customValidateOpt;
      }
    }
    return allRules;
  }, {});
  return customValidationRules;
}
