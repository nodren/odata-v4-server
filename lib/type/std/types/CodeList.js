"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeList = void 0;
const tslib_1 = require("tslib");
const decorators_1 = require("../../decorators");
class CodeList {
}
tslib_1.__decorate([
    decorators_1.KeyProperty({ length: 32 }),
    tslib_1.__metadata("design:type", String)
], CodeList.prototype, "code", void 0);
tslib_1.__decorate([
    decorators_1.OptionalProperty({ length: 255 }),
    tslib_1.__metadata("design:type", String)
], CodeList.prototype, "description", void 0);
exports.CodeList = CodeList;
//# sourceMappingURL=CodeList.js.map