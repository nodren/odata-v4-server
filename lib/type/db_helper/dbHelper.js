"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseDBHelper = void 0;
const literal_1 = require("../../literal");
const visitor_1 = require("../visitor");
const DEFAULT_COUNT_TOTAL_KEY = 'TOTAL';
class BaseDBHelper {
    getDatabaseType() {
        return 'default';
    }
    buildSQL({ schema, tableName, query, countKey = DEFAULT_COUNT_TOTAL_KEY, colNameMapper = (v) => v }) {
        const fullTableName = this.buildFullTableName(tableName, schema);
        const nameMapper = this.createIdentifierBuilder(colNameMapper, tableName, schema);
        const astResult = visitor_1.transformQueryAst(query, nameMapper, this.mapQueryValue.bind(this));
        const { sqlQuery, count, where, selectedFields } = astResult;
        const queryStatement = this.buildQueryStatement(selectedFields, fullTableName, sqlQuery);
        let countStatement = undefined;
        if (count) {
            countStatement = this.buildCountStatement(countKey, fullTableName, where);
        }
        return {
            queryStatement,
            countStatement
        };
    }
    mapQueryValue(type, raw) {
        switch (type) {
            case literal_1.EdmType.DateTimeOffset:
                return new Date(raw).getTime();
            case literal_1.EdmType.Guid:
                return `'${raw}'`;
            default:
                return raw;
        }
    }
}
exports.BaseDBHelper = BaseDBHelper;
//# sourceMappingURL=dbHelper.js.map