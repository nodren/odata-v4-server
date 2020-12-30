"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersonName = void 0;
const tslib_1 = require("tslib");
const decorators_1 = require("../../decorators");
class PersonName {
}
tslib_1.__decorate([
    decorators_1.OptionalProperty({ length: '255' }),
    tslib_1.__metadata("design:type", String)
], PersonName.prototype, "firstName", void 0);
tslib_1.__decorate([
    decorators_1.OptionalProperty({ length: '255' }),
    tslib_1.__metadata("design:type", String)
], PersonName.prototype, "middleName", void 0);
tslib_1.__decorate([
    decorators_1.OptionalProperty({ length: '255' }),
    tslib_1.__metadata("design:type", String)
], PersonName.prototype, "lastName", void 0);
tslib_1.__decorate([
    decorators_1.OptionalProperty({ length: '255' }),
    tslib_1.__metadata("design:type", String)
], PersonName.prototype, "nickName", void 0);
exports.PersonName = PersonName;
//# sourceMappingURL=Name.js.map