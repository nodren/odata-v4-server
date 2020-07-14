import { ColumnOptions, Column, PrimaryColumn, EntityOptions, Entity } from 'typeorm';
import { Edm } from '..';
import { NotImplementedError } from '../error';


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
 * combine `Edm` decorator & typeorm decorator
 *
 * @param options
 */
export function ODataColumn(options: ColumnOptions = {}) {
  return function(object: any, propertyName: string) {
    const { primary } = options;

    Column(options)(object, propertyName);

    if (primary) {
      Edm.Key(object, propertyName);
    }

    const reflectType = Reflect.getMetadata('design:type', object, propertyName);

    switch (reflectType) {
      case String:
        Edm.String(object, propertyName);
        break;
      case Number:
        Edm.Int32(object, propertyName);
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
