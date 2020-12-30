"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDBHelper = void 0;
const tslib_1 = require("tslib");
const dbHelperDefault_1 = require("./dbHelperDefault");
const dbHelperMySQL_1 = require("./dbHelperMySQL");
tslib_1.__exportStar(require("./transformers"), exports);
exports.createDBHelper = (options) => {
    switch (options.type) {
        case 'mysql':
            return new dbHelperMySQL_1.MySqlDBHelper();
        default:
            return new dbHelperDefault_1.DefaultDBHelper();
    }
};
//# sourceMappingURL=index.js.map