"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformQueryAst = exports.transformFilterAst = void 0;
const identity_1 = require("@newdash/newdash/.internal/identity");
const parser_1 = require("@odata/parser");
const edm_1 = require("../edm");
const error_1 = require("../error");
const visitor_1 = require("../visitor");
const decorators_1 = require("./decorators");
/**
 * transformFilterAst to where sql
 *
 * @param node
 */
exports.transformFilterAst = (node, nameMapper = identity_1.identity, valueMapper) => {
    // maybe the hidden 'sql' property will pollute the object,
    // but deep copy object will consume too much resource
    const traverser = {
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
            var _a;
            node['sql'] = (_a = node.value) === null || _a === void 0 ? void 0 : _a.sql;
        }
    };
    parser_1.traverseAstDeepFirst(traverser, node);
    return node['sql'];
};
exports.transformQueryAst = (node, nameMapper = identity_1.identity, valueMapper) => {
    var _a, _b;
    let offset = 0;
    let limit = 0;
    let where = '';
    let inlineCount = false;
    const orderBy = [];
    const selects = new Set();
    const navSelects = new Set();
    const traverser = {
        Top: (node) => {
            var _a;
            limit = parseInt((_a = node === null || node === void 0 ? void 0 : node.value) === null || _a === void 0 ? void 0 : _a.raw);
        },
        Skip: (node) => {
            var _a;
            offset = parseInt((_a = node === null || node === void 0 ? void 0 : node.value) === null || _a === void 0 ? void 0 : _a.raw);
        },
        OrderByItem: (node) => {
            var _a, _b, _c, _d, _e;
            switch ((_a = node === null || node === void 0 ? void 0 : node.value) === null || _a === void 0 ? void 0 : _a.direction) {
                case -1:
                    orderBy.push(`${nameMapper((_c = (_b = node.value) === null || _b === void 0 ? void 0 : _b.expr) === null || _c === void 0 ? void 0 : _c.raw)} DESC`);
                    break;
                case 1:
                    orderBy.push(`${nameMapper((_e = (_d = node.value) === null || _d === void 0 ? void 0 : _d.expr) === null || _e === void 0 ? void 0 : _e.raw)} ASC`);
                    break;
                default:
                    break;
            }
        },
        SelectItem: (node) => {
            // only support simple property of entity
            // please raise error on deep path
            selects.add(nameMapper(node.raw));
        },
        InlineCount: (node) => {
            var _a;
            inlineCount = ((_a = node.value) === null || _a === void 0 ? void 0 : _a.raw) == 'true';
        },
        Search: () => {
            // not support now
            throw new error_1.NotImplementedError('Not implement $search.');
        },
        Filter: (node) => {
            where = exports.transformFilterAst(node, nameMapper, valueMapper);
        }
    };
    (_b = (_a = node.value) === null || _a === void 0 ? void 0 : _a['options']) === null || _b === void 0 ? void 0 : _b.forEach((option) => {
        var _a, _b, _c;
        // ignore $expand inner parameters
        if (option.type !== parser_1.TokenType.Expand) {
            parser_1.traverseAst(traverser, option);
        }
        else {
            // force add expand item required fk to selects
            if (visitor_1.ODATA_TYPE in node) {
                const rootType = node[visitor_1.ODATA_TYPE];
                for (const expandItem of (_a = option === null || option === void 0 ? void 0 : option.value) === null || _a === void 0 ? void 0 : _a.items) {
                    if (visitor_1.ODATA_TYPE in expandItem) {
                        const expandItemPath = (_c = (_b = expandItem.value) === null || _b === void 0 ? void 0 : _b.path) === null || _c === void 0 ? void 0 : _c.raw;
                        if (expandItemPath !== undefined) {
                            const nav = decorators_1.getODataNavigation(rootType, expandItemPath);
                            if (nav !== undefined) {
                                switch (nav.type) {
                                    // add current model's pk to allow the navigation could access the PK
                                    case 'OneToMany':
                                        navSelects.add(nameMapper(edm_1.getKeyProperties(rootType)[0]));
                                        break;
                                    // add current models' fk to allow the navigation could access the FK
                                    case 'ManyToOne':
                                    case 'OneToOne':
                                        if (nav.foreignKey !== undefined) {
                                            navSelects.add(nameMapper(nav.foreignKey));
                                        }
                                        break;
                                    default:
                                        break;
                                }
                            }
                        }
                    }
                }
            }
        }
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
    // if use want to projection table
    if (selects.size > 0) {
        for (const navSelect of navSelects) {
            selects.add(navSelect);
        }
    }
    return { sqlQuery, selectedFields: Array.from(selects), count: inlineCount, where, offset, limit };
};
//# sourceMappingURL=visitor.js.map