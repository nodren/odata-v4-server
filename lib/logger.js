"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = void 0;
const debug_1 = require("debug");
exports.createLogger = (moduleName) => debug_1.default(`@odata/server:${moduleName}`);
//# sourceMappingURL=logger.js.map