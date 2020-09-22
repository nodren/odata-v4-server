import { ValueTransformer } from 'typeorm';
import { ServerInternalError } from '../../error';

export const DecimalTransformer: ValueTransformer = {
  from: (databaseColumn: string): string => {
    if (typeof databaseColumn == 'number') {
      return String(databaseColumn);
    }
    return databaseColumn;
  },
  to: (jsColumn): string => {
    if (typeof jsColumn == 'number') {
      return String(jsColumn);
    }
    return jsColumn;
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
