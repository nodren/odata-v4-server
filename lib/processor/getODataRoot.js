"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getODataRoot = void 0;
exports.getODataRoot = function (context) {
    return `${context.protocol || 'http'}://${context.host || 'localhost'}${context.base || ''}`;
};
//# sourceMappingURL=getODataRoot.js.map