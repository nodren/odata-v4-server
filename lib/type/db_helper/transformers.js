"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateTimeTransformer = exports.DecimalTransformer = void 0;
const bignumber_js_1 = require("bignumber.js");
const error_1 = require("../../error");
exports.DecimalTransformer = {
    from: (databaseColumn) => {
        switch (typeof databaseColumn) {
            case 'number':
            case 'string':
                return new bignumber_js_1.BigNumber(databaseColumn);
            default:
                break;
        }
        return null;
    },
    to: (jsColumn) => {
        switch (typeof jsColumn) {
            case 'number':
                return jsColumn;
            case 'string':
                return new bignumber_js_1.BigNumber(jsColumn).toNumber();
            case 'object':
                if (jsColumn instanceof bignumber_js_1.BigNumber) {
                    return jsColumn.toNumber();
                }
            default:
                break;
        }
        return null;
    }
};
exports.DateTimeTransformer = {
    from: (databaseColumn) => {
        if (typeof databaseColumn == 'string') { // fix mysql driver return string for column
            databaseColumn = parseInt(databaseColumn);
        }
        if (databaseColumn) {
            return new Date(databaseColumn);
        }
        return new Date(0);
    },
    to: (date) => {
        switch (typeof date) {
            case 'string':
                return new Date(date).getTime();
            case 'object':
                if (date instanceof Date) {
                    return date.getTime();
                }
                throw new error_1.ServerInternalError('not supported property type');
            default: return 0;
        }
    }
};
//# sourceMappingURL=transformers.js.map