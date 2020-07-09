import { ODataQuery } from '..';
import { FindManyOptions, FindConditions, Not } from 'typeorm';
import { Traverser, traverseAst, traverseAstDeepFirst, Token } from '@odata/parser';
import { NotImplementedError } from '../error';

export const transformFilterAst = (node: Token): FindConditions<any> | FindConditions<any>[] => {

  let rt = undefined;
  const tmp = [];

  const traverser: Traverser = {
    EqualsExpression: (node) => {
      tmp.push(
        { [node.value.left.raw]: [node.value.right.raw] }
      );
    },
    NotEqualsExpression: (node) => {
      tmp.push(
        { [node.value.left.raw]: [node.value.right.raw] }
      );
    },
    OrExpression: (node) => {
      if (node.value.left.type == 'BoolParenExpression' || node.value.left.type == 'BoolParenExpression') {
        if (node.value.left.type == 'BoolParenExpression') {

        }

      } else {
        rt = Object.assign({}, ...tmp);
      }
    },

    AndExpression: (node) => {
      if (node.value.left.type == 'BoolParenExpression' || node.value.left.type == 'BoolParenExpression') {

      } else {
        rt = Object.assign({}, ...tmp);
      }
    }
  };

  traverseAstDeepFirst(traverser, node);

  return rt;
};


export const transformQueryAst = (node: ODataQuery): FindManyOptions<any> => {
  const opt: FindManyOptions = {};

  const traverser: Traverser = {
    Top: (node) => {
      opt.take = parseInt(node?.value?.raw);
    },
    Skip: (node) => {
      opt.skip = parseInt(node?.value?.raw);
    },
    OrderByItem: (node) => {
      opt.order = opt.order || {};
      opt.order[node.value?.expr?.raw] = node?.value?.direction;
    },
    SelectItem: (node) => {
      // only support simple property of entity
      // please raise error on deep path
      opt.select = opt.select || [];
      opt.select.push(node.raw);
    },
    Search: (node) => {
      // not support now
      throw new NotImplementedError('Not implement $search.');
    },
    Filter: (node) => {
      opt.where = opt.where || {};
    }
  };

  traverseAst(traverser, node);

  return opt;
};

