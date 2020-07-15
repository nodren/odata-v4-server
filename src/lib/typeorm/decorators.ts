import { ColumnOptions, Column, EntityOptions, Entity, OneToMany, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { Edm } from '..';
import { NotImplementedError, ServerInternalError } from '../error';
import toInteger from '@newdash/newdash/toInteger';
import { has } from '@newdash/newdash/has';
import { BaseODataModel } from './model';
import { isEmpty } from '@newdash/newdash/isEmpty';

/**
 * ODataModel
 *
 * decorator wrapper of the typeorm `Entity` decorator
 *
 * @param options
 */
export function ODataModel(options: EntityOptions = {}) {
  return function(target: any): void {
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
  return function(object: any, propertyName: string): void {
    const { primary, length, precision, nullable } = options;

    Column(options)(object, propertyName);

    if (primary) {
      Edm.Key(object, propertyName);
    }

    if (length) {
      Edm.MaxLength(toInteger(length))(object, propertyName);
    }

    if (precision) {
      Edm.Precision(toInteger(precision))(object, propertyName);
    }

    if (nullable) {
      Edm.Nullable(object, propertyName);
    }

    if (has(options, 'default')) {
      Edm.DefaultValue(options.default)(object, propertyName);
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

export interface NavigationOptions<T extends typeof BaseODataModel> {
  /**
   * navigation type
   */
  type: 'OneToOne' | 'OneToMany' | 'ManyToOne';
  /**
   * entity provider
   */
  entity: (type?: any) => T,
  /**
   * (ref) foreignKey,
   *
   * which field record the relation ship between `this` & `that` table
   */
  foreignKey: string;
}

/**
 * ODataNavigation decorator
 *
 * define the navigation
 *
 * @param options
 */
export function ODataNavigation<T extends typeof BaseODataModel>(options: NavigationOptions<T>) {
  return function(object: any, propertyName: string): void {

    if (isEmpty(options.foreignKey)) {
      throw new ServerInternalError(`OneToMany navigation must define the ref 'foreign key' in ${object?.constructor?.name} ${propertyName}`);
    }

    switch (options.type) {
      case 'OneToMany':
        OneToMany(options.entity, options.foreignKey)(object, propertyName);
        Edm.Collection(Edm.EntityType(Edm.ForwardRef(options.entity)))(object, propertyName);
        Edm.ForeignKey(options.foreignKey)(object, propertyName);
        break;
      case 'ManyToOne':
        ManyToOne(options.entity)(object, propertyName);
        JoinColumn({ name: options.foreignKey })(object, propertyName);
        Edm.EntityType(Edm.ForwardRef(options.entity))(object, propertyName);
        Edm.ForeignKey(options.foreignKey)(object, propertyName);
        break;
      case 'OneToOne':
        OneToOne(options.entity)(object, propertyName);
        Edm.EntityType(Edm.ForwardRef(options.entity))(object, propertyName);
        JoinColumn({ name: options.foreignKey })(object, propertyName);
        Edm.ForeignKey(options.foreignKey)(object, propertyName);
      default:
        break;
    }

  };
}
