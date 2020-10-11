import { identity } from '@newdash/newdash/.internal/identity';
import { Token, traverseAst, traverseAstDeepFirst, Traverser } from '@odata/parser';
import { ODataQuery } from '..';
import { NotImplementedError } from '../error';
import { EdmType } from '../literal';

interface ValueMapper {
  (type: EdmType, raw: string): any
}

/**
 * transformFilterAst to where sql
 *
 * @param node
 */
export const transformFilterAst = (node: Token, nameMapper: FieldNameMapper = identity, valueMapper: ValueMapper): string => {

  // maybe the hidden 'sql' property will pollute the object,
  // but deep copy object will consume too much resource

  const traverser: Traverser = {
    EqualsExpression: (node) => {
      node['sql'] = `${nameMapper(node.value.left.raw)} = ${valueMapper(node.value.right.value, node.value.right.raw)}`;
    },
    NotEqualsExpression: (node) => {
      node['sql'] = `${nameMapper(node.value.left.raw)} != ${valueMapper(node.value.right.value, node.value.right.raw)}`;
    },
    GreaterOrEqualsExpression: (node) => {
      node['sql'] = `${nameMapper(node.value.left.raw)} >= ${valueMapper(node.value.right.value, node.value.right.raw)}`;
    },
    GreaterThanExpression: (node) => {
      node['sql'] = `${nameMapper(node.value.left.raw)} > ${valueMapper(node.value.right.value, node.value.right.raw)}`;
    },
    LesserOrEqualsExpression: (node) => {
      node['sql'] = `${nameMapper(node.value.left.raw)} <= ${valueMapper(node.value.right.value, node.value.right.raw)}`;
    },
    LesserThanExpression: (node) => {
      node['sql'] = `${nameMapper(node.value.left.raw)} < ${valueMapper(node.value.right.value, node.value.right.raw)}`;
    },
    OrExpression: (node) => {
      const { value: { left, right } } = node;
      node['sql'] = `${left['sql']} OR ${right['sql']}`;
    },
    AndExpression: (node) => {
      const { value: { left, right } } = node;
      node['sql'] = `${left['sql']} AND ${right['sql']}`;
    },
    BoolParenExpression: (node) => {
      const { value } = node;
      node['sql'] = `(${value['sql']})`;
    },
    Filter: (node) => {
      node['sql'] = node.value?.sql;
    }
  };

  traverseAstDeepFirst(traverser, node);

  return node['sql'];

};

/**
 * OData Field Mapping
 */
export interface FieldNameMapper {
  (field: string): string
}

export const transformQueryAst = (node: ODataQuery, nameMapper: FieldNameMapper = identity, valueMapper: ValueMapper) => {

  let offset = 0;
  let limit = 0;
  let where = '';
  let inlineCount = false;

  const orderBy = [];
  const selects = [];

  const traverser: Traverser = {
    Top: (node) => {
      limit = parseInt(node?.value?.raw);
    },
    Skip: (node) => {
      offset = parseInt(node?.value?.raw);
    },
    OrderByItem: (node) => {
      switch (node?.value?.direction) {
        case -1:
          orderBy.push(`${nameMapper(node.value?.expr?.raw)} DESC`); break;
        case 1:
          orderBy.push(`${nameMapper(node.value?.expr?.raw)} ASC`); break;
        default:
          break;
      }
    },
    SelectItem: (node) => {
      // only support simple property of entity
      // please raise error on deep path
      selects.push(nameMapper(node.raw));
    },
    InlineCount: (node) => {
      inlineCount = node.value?.raw == 'true';
    },
    Search: () => {
      // not support now
      throw new NotImplementedError('Not implement $search.');
    },
    Filter: (node) => {
      where = transformFilterAst(node, nameMapper, valueMapper);
    }
  };

  // only first level options
  // @ts-ignore
  node.value?.options?.forEach((option) => {
    traverseAst(traverser, option);
  });

  const parts = [];

  if (where && where.trim().length > 0) {
    parts.push(`WHERE ${where}`);
  }
  if (offset || limit) {
    parts.push(`LIMIT ${limit} OFFSET ${offset}`);
  }
  if (orderBy.length > 0) {
    parts.push(`ORDER BY ${orderBy.join(', ')}`);
  }

  const sqlQuery = parts.length > 0 ? parts.join(' ') : '';

  return { sqlQuery, selectedFields: selects, count: inlineCount, where, offset, limit };

};

