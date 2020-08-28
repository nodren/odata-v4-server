import { identity } from '@newdash/newdash/.internal/identity';
import { Token, traverseAst, traverseAstDeepFirst, Traverser } from '@odata/parser';
import { ODataQuery } from '..';
import { NotImplementedError } from '../error';

export const mapValue = (node: Token) => {
  switch (node.value) {
    case 'Edm.DateTimeOffset':
      return new Date(node.raw).getTime();
    default:
      return node.raw;
  }
};

/**
 * transformFilterAst to where sql
 *
 * @param node
 */
export const transformFilterAst = (node: Token, nameMapper: FieldNameMapper = identity): string => {

  // maybe the hidden 'sql' property will pollute the object,
  // but deep copy object will consume too much resource

  const traverser: Traverser = {
    EqualsExpression: (node) => {
      node['sql'] = `${nameMapper(node.value.left.raw)} = ${mapValue(node.value.right)}`;
    },
    NotEqualsExpression: (node) => {
      node['sql'] = `${nameMapper(node.value.left.raw)} != ${mapValue(node.value.right)}`;
    },
    GreaterOrEqualsExpression: (node) => {
      node['sql'] = `${nameMapper(node.value.left.raw)} >= ${mapValue(node.value.right)}`;
    },
    GreaterThanExpression: (node) => {
      node['sql'] = `${nameMapper(node.value.left.raw)} > ${mapValue(node.value.right)}`;
    },
    LesserOrEqualsExpression: (node) => {
      node['sql'] = `${nameMapper(node.value.left.raw)} <= ${mapValue(node.value.right)}`;
    },
    LesserThanExpression: (node) => {
      node['sql'] = `${nameMapper(node.value.left.raw)} < ${mapValue(node.value.right)}`;
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

export const transformQueryAst = (node: ODataQuery, nameMapper: FieldNameMapper = identity) => {

  let sqlQuery = '';
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
      where = transformFilterAst(node, nameMapper);
    }
  };

  // only first level options
  // @ts-ignore
  node.value?.options?.forEach((option) => {
    traverseAst(traverser, option);
  });


  if (where && where.trim().length > 0) {
    sqlQuery += ` WHERE ${where}`;
  }
  if (offset || limit) {
    sqlQuery += ` LIMIT ${limit} OFFSET ${offset}`;
  }
  if (orderBy.length > 0) {
    sqlQuery += ` ORDERBY ${orderBy.join(', ')}`;
  }

  return { sqlQuery, selectedFields: selects, count: inlineCount, where, offset, limit };

};

