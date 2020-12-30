"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Repository = exports.Connection = exports.createDBConnection = void 0;
const typeorm_1 = require("typeorm");
/**
 *
 * create database connection
 *
 * @alias typeorm createConnection
 */
exports.createDBConnection = typeorm_1.createConnection;
var typeorm_2 = require("typeorm");
Object.defineProperty(exports, "Connection", { enumerable: true, get: function () { return typeorm_2.Connection; } });
Object.defineProperty(exports, "Repository", { enumerable: true, get: function () { return typeorm_2.Repository; } });
//# sourceMappingURL=connection.js.map