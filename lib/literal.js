"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Literal = exports.EdmType = void 0;
const toInteger_1 = require("@newdash/newdash/toInteger");
const toNumber_1 = require("@newdash/newdash/toNumber");
const trimPrefix_1 = require("@newdash/newdash/trimPrefix");
const trimSuffix_1 = require("@newdash/newdash/trimSuffix");
var EdmType;
(function (EdmType) {
    EdmType["String"] = "Edm.String";
    EdmType["Byte"] = "Edm.Byte";
    EdmType["SByte"] = "Edm.SByte";
    EdmType["Int16"] = "Edm.Int64";
    EdmType["Int32"] = "Edm.Int32";
    EdmType["Int64"] = "Edm.Int64";
    EdmType["Decimal"] = "Edm.Decimal";
    EdmType["Double"] = "Edm.Double";
    EdmType["Single"] = "Edm.Single";
    EdmType["Date"] = "Edm.Date";
    EdmType["DateTimeOffset"] = "Edm.DateTimeOffset";
    EdmType["Boolean"] = "Edm.Boolean";
    EdmType["Guid"] = "Edm.Guid";
    EdmType["null"] = "null";
    EdmType["TimeOfDay"] = "Edm.TimeOfDay";
    EdmType["Duration"] = "Edm.Duration";
})(EdmType = exports.EdmType || (exports.EdmType = {}));
function integer(value) {
    return toInteger_1.toInteger(value);
}
function float(value) {
    if (typeof value == 'number') {
        return value;
    }
    switch (value) {
        case 'INF': return Infinity;
        case '-INF': return -Infinity;
        default: return toNumber_1.toNumber(value);
    }
}
class Literal {
    constructor(type, value) {
        const result = (this[type] || ((_) => _))(value);
        this.valueOf = () => result;
    }
    static convert(type, value) {
        return (new Literal(type, value)).valueOf();
    }
    'Edm.String'(value) {
        if (typeof value == 'string') {
            if (value.startsWith("'") && value.endsWith("'")) {
                return trimSuffix_1.trimSuffix(trimPrefix_1.trimPrefix(decodeURIComponent(value), "'"), "'").replace(/''/g, "'");
            }
            return value;
        }
        return value;
    }
    'Edm.Byte'(value) {
        return integer(value);
    }
    'Edm.SByte'(value) {
        return integer(value);
    }
    'Edm.Int16'(value) {
        return integer(value);
    }
    'Edm.Int32'(value) {
        return integer(value);
    }
    'Edm.Int64'(value) {
        return integer(value);
    }
    'Edm.Decimal'(value) {
        return float(value);
    }
    'Edm.Double'(value) {
        return float(value);
    }
    'Edm.Single'(value) {
        return float(value);
    }
    'Edm.Boolean'(value) {
        switch (typeof value) {
            case 'string':
                value = value || '';
                switch (value.toLowerCase()) {
                    case 'true': return true;
                    case 'false': return false;
                    default: return undefined;
                }
            case 'boolean':
                return value;
            default:
                return undefined;
        }
    }
    'Edm.Guid'(value) {
        return decodeURIComponent(value);
    }
    'Edm.Date'(value) {
        return value;
    }
    'Edm.DateTimeOffset'(value) {
        return new Date(value);
    }
    'null'(value) {
        return null;
    }
    'Edm.TimeOfDay'(value) {
        return new Date(`1970-01-01T${value}Z`);
    }
    'Edm.Duration'(value) {
        const m = value.match(/P([0-9]*D)?T?([0-9]{1,2}H)?([0-9]{1,2}M)?([\.0-9]*S)?/);
        if (m) {
            const d = new Date(0);
            for (let i = 1; i < m.length; i++) {
                switch (m[i].slice(-1)) {
                    case 'D':
                        d.setDate(parseInt(m[i]));
                        continue;
                    case 'H':
                        d.setHours(parseInt(m[i]));
                        continue;
                    case 'M':
                        d.setMinutes(parseInt(m[i]));
                        continue;
                    case 'S':
                        d.setSeconds(parseFloat(m[i]));
                        continue;
                }
            }
            return d.getTime();
        }
        throw new Error('Invalid Duration');
    }
}
exports.Literal = Literal;
//# sourceMappingURL=literal.js.map