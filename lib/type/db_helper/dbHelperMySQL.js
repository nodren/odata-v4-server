"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySqlDBHelper = void 0;
const newdash_1 = require("@newdash/newdash");
const literal_1 = require("../../literal");
const dbHelper_1 = require("./dbHelper");
const buildNameWithBackQuote = (...names) => names.filter(Boolean).map((name) => `\`${name}\``).join('.');
class MySqlDBHelper extends dbHelper_1.BaseDBHelper {
    getDatabaseType() {
        return 'mysql';
    }
    createIdentifierBuilder(colNameMapper, tableName, schema) {
        return (columnName) => buildNameWithBackQuote(schema, tableName, colNameMapper(columnName));
    }
    buildFullTableName(tableName, schema) {
        return buildNameWithBackQuote(schema, tableName);
    }
    buildQueryStatement(selectedFields, fullTableName, sqlQuery) {
        const sSelects = newdash_1.isEmpty(selectedFields) ? '*' : selectedFields.join(', ');
        return `SELECT ${sSelects} FROM ${fullTableName} ${sqlQuery};`;
    }
    buildCountStatement(countKey, fullTableName, whereExpr) {
        let countStatement = `SELECT count(1) AS ${countKey} FROM ${fullTableName}`;
        if (whereExpr) {
            countStatement += ` WHERE ${whereExpr}`;
        }
        return countStatement;
    }
    mapQueryValue(type, raw) {
        switch (type) {
            case literal_1.EdmType.DateTimeOffset:
                return new Date(raw).getTime();
            case literal_1.EdmType.Guid:
                // single quote for mysql
                return `'${raw}'`;
            default:
                return raw;
        }
    }
}
exports.MySqlDBHelper = MySqlDBHelper;
//# sourceMappingURL=dbHelperMySQL.js.map