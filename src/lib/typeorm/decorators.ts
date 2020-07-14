import { ColumnOptions, Column, EntityOptions, Entity } from 'typeorm';
import { Edm } from '..';
import { NotImplementedError } from '../error';
import toInteger from '@newdash/newdash/toInteger';
import { has } from '@newdash/newdash/has';


/**
 * ODataModel
 *
 * decorator wrapper of the typeorm `Entity` decorator
 *
 * @param options
 */
export function ODataModel(options: EntityOptions = {}) {
  return function(target) {
    Entity(options)(target);
  };
}

/**
 * ODataColumn
 *
 * combine the `Edm` & `typeorm` decorator
 *
 * @param options
 */
export function ODataColumn(options: ColumnOptions = {}) {
  return function(object: any, propertyName: string, propertyIndex: number) {
    const { primary, length, precision, nullable } = options;

    Column(options)(object, propertyName);

    if (primary) {
      Edm.Key(object, propertyName);
    }

    if (length) {
      Edm.MaxLength(toInteger(length))(object, propertyName, propertyIndex);
    }

    if (precision) {
      Edm.Precision(toInteger(precision))(object, propertyName, propertyIndex);
    }

    if (nullable) {
      Edm.Nullable(object, propertyName, propertyIndex);
    }

    if (has(options, 'default')) {
      Edm.DefaultValue(options.default)(object, propertyName, propertyIndex);
    }

    const reflectType = Reflect.getMetadata('design:type', object, propertyName);

    switch (reflectType) {
      case String:
        Edm.String(object, propertyName);
        break;
      case Number:
        switch (options.type) {
          case 'int': case 'int2': case 'int4': case 'int8':
            Edm.Int16(object, propertyName);
            break;
          case 'int64':
            Edm.Int64(object, propertyName);
            break;
          default:
            // unknown or not have type
            Edm.Int32(object, propertyName);
            break;
        }
        break;
      case Boolean:
        Edm.Boolean(object, propertyName);
        break;
      case Date:
        Edm.DateTimeOffset(object, propertyName);
        break;
      default:
        throw new NotImplementedError(`Not support the type of field '${propertyName}'.`);
    }
  };
}
