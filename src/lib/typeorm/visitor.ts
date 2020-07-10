import { ODataQuery } from '..';
import { Traverser, traverseAst, traverseAstDeepFirst, Token } from '@odata/parser';
import { NotImplementedError } from '../error';
import { identity } from '@newdash/newdash/.internal/identity';

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
      node['sql'] = `${nameMapper(node.value.left.raw)} = ${node.value.right.raw}`;
    },
    NotEqualsExpression: (node) => {
      node['sql'] = `${nameMapper(node.value.left.raw)} != ${node.value.right.raw}`;
    },
    GreaterOrEqualsExpression: (node) => {
      node['sql'] = `${nameMapper(node.value.left.raw)} >= ${node.value.right.raw}`;
    },
    GreaterThanExpression: (node) => {
      node['sql'] = `${nameMapper(node.value.left.raw)} > ${node.value.right.raw}`;
    },
    LesserOrEqualsExpression: (node) => {
      node['sql'] = `${nameMapper(node.value.left.raw)} <= ${node.value.right.raw}`;
    },
    LesserThanExpression: (node) => {
      node['sql'] = `${nameMapper(node.value.left.raw)} < ${node.value.right.raw}`;
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

export const transformQueryAst = (node: ODataQuery, nameMapper: FieldNameMapper = identity): { selectedFields: string[], sqlQuery: string } => {

  let sqlQuery = '';
  let offset = 0;
  let limit = 0;
  let where = '';

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
    Search: () => {
      // not support now
      throw new NotImplementedError('Not implement $search.');
    },
    Filter: (node) => {
      where = transformFilterAst(node, nameMapper);
    }
  };

  traverseAst(traverser, node);

  if (where) {
    sqlQuery += ` WHERE ${where}`;
  }
  if (offset || limit) {
    sqlQuery += ` LIMIT ${offset}, ${limit}`;
  }
  if (orderBy.length > 0) {
    sqlQuery += ` ORDERBY ${orderBy.join(', ')}`;
  }

  return { sqlQuery, selectedFields: selects };

};

