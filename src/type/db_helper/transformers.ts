import { BigNumber } from 'bignumber.js';
import { ValueTransformer } from 'typeorm';
import { ServerInternalError } from '../../error';

export const DecimalTransformer: ValueTransformer = {
  from: (databaseColumn): BigNumber => {
    switch (typeof databaseColumn) {
      case 'number':
      case 'string':
        return new BigNumber(databaseColumn);
      default:
        break;
    }
    return null;
  },
  to: (jsColumn): number => {
    switch (typeof jsColumn) {
      case 'number':
        return jsColumn;
      case 'string':
        return new BigNumber(jsColumn).toNumber();
      case 'object':
        if (jsColumn instanceof BigNumber) {
          return jsColumn.toNumber();
        }
      default:
        break;
    }

    return null;

  }
};

export const DateTimeTransformer: ValueTransformer = {
  from: (databaseColumn: number): Date => {
    if (typeof databaseColumn == 'string') { // fix mysql driver return string for column
      databaseColumn = parseInt(databaseColumn);
    }
    if (databaseColumn) {
      return new Date(databaseColumn);
    }
    return new Date(0);
  },
  to: (date): number => {
    switch (typeof date) {
      case 'string':
        return new Date(date).getTime();
      case 'object':
        if (date instanceof Date) {
          return date.getTime();
        }
        throw new ServerInternalError('not supported property type');
      default: return 0;
    }
  }
};
