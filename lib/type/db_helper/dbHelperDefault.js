"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultDBHelper = void 0;
const newdash_1 = require("@newdash/newdash");
const dbHelper_1 = require("./dbHelper");
const buildNameWithQuote = (...names) => names.filter(Boolean).map((name) => `"${name}"`).join('.');
class DefaultDBHelper extends dbHelper_1.BaseDBHelper {
    createIdentifierBuilder(colNameMapper, tableName, schema) {
        return (columnName) => buildNameWithQuote(schema, tableName, colNameMapper(columnName));
    }
    buildFullTableName(tableName, schema) {
        return buildNameWithQuote(schema, tableName);
    }
    buildQueryStatement(selectedFields, fullTableName, sqlQuery) {
        const sSelects = newdash_1.isEmpty(selectedFields) ? '*' : selectedFields.join(', ');
        return `SELECT ${sSelects} FROM ${fullTableName} ${sqlQuery};`;
    }
    buildCountStatement(countKey, fullTableName, whereExpr) {
        let countStatement = `SELECT count(1) AS "${countKey}" FROM ${fullTableName}`;
        if (whereExpr) {
            countStatement += ` WHERE ${whereExpr}`;
        }
        return countStatement;
    }
}
exports.DefaultDBHelper = DefaultDBHelper;
//# sourceMappingURL=dbHelperDefault.js.map