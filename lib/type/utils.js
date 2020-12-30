"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnumValues = void 0;
/**
 * Returns available values of an enum
 *
 * @example
 * ```
 *  enum LambdaEnum {
 *    NONE = 0,
 *    A = 1,
 *    B = 2,
 * }
 * // become => { "0": "NONE", "1": "A", "2": "B", "NONE": 0, "A": 1, "B": 2}
 *
 * const values = getEnumValues(LambdaEnum); // returns [ 0, 1, 2 ]
 * ```
 * @param enumObj
 * @returns The values of the enum
 */
function getEnumValues(enumObj) {
    return Object.keys(enumObj)
        .filter((key) => isNaN(parseInt(key, 10)))
        .map((key) => enumObj[key]);
}
exports.getEnumValues = getEnumValues;
//# sourceMappingURL=utils.js.map