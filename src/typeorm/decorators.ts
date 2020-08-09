import { has } from '@newdash/newdash/has';
import { isEmpty } from '@newdash/newdash/isEmpty';
import toInteger from '@newdash/newdash/toInteger';
import 'reflect-metadata';
import { Column, ColumnOptions, Entity, EntityOptions, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { Edm, ODataServer } from '..';
import { NotImplementedError, ServerInternalError } from '../error';
import { DBHelper } from './db_helper';
import { BaseODataModel } from './model';
import { TypedODataServer } from './server';

const KEY_ODATA_ENTITY_SET = 'odata.entity:entity_set_name';
const KEY_ODATA_PROP_NAVIGATION = 'odata.entity:entity_prop_navigation';
const KEY_ODATA_ENTITY_NAVIGATIONS = 'odata.entity:entity_navigations';
const KEY_ODATA_ENTITY_TYPE = 'odata.entity:entity_type';
const KEY_TYPEORM_DB_TYPE = 'odata.typeorm:db_type';
const KEY_WITH_ODATA_SERVER = 'odata:with_server';


const DateTimeTransformer = {
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

/**
 * define odata action for entity
 *
 * @alias Edm.Action
 */
export const ODataAction = Edm.Action;

/**
 * define odata function for entity
 *
 * @alias Edm.Function
 */
export const ODataFunction = Edm.Function;
/**
 * set entity set name for odata entity
 *
 * @param entitySetName
 */
export function withEntitySetName(entitySetName: string) {
  return function (target: any) {
    Reflect.defineMetadata(KEY_ODATA_ENTITY_SET, entitySetName, target);
  };
}

/**
 * set entity type for anything
 *
 * @param entity
 */
export function withEntityType(entity: any) {
  return function (target: any) {
    if (entity.prototype instanceof BaseODataModel) {
      Reflect.defineMetadata(KEY_ODATA_ENTITY_TYPE, entity, target);
    } else {
      throw new TypeError('Must provide sub-class of BaseODataModel');
    }
  };
}

/**
 * with db helper for entity/service/server
 *
 * @param type
 */
export function withDBHelper(type: DBHelper) {
  return function (target: any) {
    Reflect.defineMetadata(KEY_TYPEORM_DB_TYPE, type, target);
  };
}

/**
 * get db helper for entity/service/server
 *
 * @param target
 */
export function getDBHelper(target: any): DBHelper {
  return Reflect.getMetadata(KEY_TYPEORM_DB_TYPE, target);
}

/**
 * set entity set name for odata entity
 *
 * @param target
 */
export function getODataEntitySetName(target: any): string {
  const metaName = Reflect.getMetadata(KEY_ODATA_ENTITY_SET, target);
  if (metaName) {
    return metaName;
  } else if (target?.name) {
    return `${target.name}s`;
  }
  return undefined;
}

/**
 * get entity type for controller
 *
 * @param target
 */
export function getODataEntityType(target: any): typeof BaseODataModel {
  return Reflect.getMetadata(KEY_ODATA_ENTITY_TYPE, target);
}

/**
 * ODataModel
 *
 * decorator wrapper of the typeorm `Entity` decorator
 *
 * @param options
 */
export function ODataModel(options: EntityOptions = {}, entitySetName?: string) {
  return function (target: any): void {
    Entity(options)(target);
    if (entitySetName) {
      withEntitySetName(entitySetName)(target);
    }
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
  return function (object: any, propertyName: string): void {
    const { primary, length, precision, nullable } = options;


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
        options.type = 'bigint';
        options.transformer = DateTimeTransformer;
        break;
      default:
        throw new NotImplementedError(`Not support the type of field '${propertyName}'.`);
    }

    Column(options)(object, propertyName);

  };
}

export interface NavigationOptions<T extends typeof BaseODataModel = any> {
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
  return function (target: any, propertyName: string): void {

    if (isEmpty(options.foreignKey)) {
      throw new ServerInternalError(`OneToMany navigation must define the ref 'foreign key' in ${target?.constructor?.name} ${propertyName}`);
    }

    const navigations = getODataEntityNavigations(target);

    navigations[propertyName] = options;

    Reflect.defineMetadata(KEY_ODATA_ENTITY_NAVIGATIONS, navigations, target);

    Reflect.defineMetadata(KEY_ODATA_PROP_NAVIGATION, options, target, propertyName);

    switch (options.type) {
      case 'OneToMany':
        OneToMany(options.entity, options.foreignKey)(target, propertyName);
        Edm.Collection(Edm.EntityType(Edm.ForwardRef(options.entity)))(target, propertyName);
        Edm.ForeignKey(options.foreignKey)(target, propertyName);
        break;
      case 'ManyToOne':
        ManyToOne(options.entity)(target, propertyName);
        JoinColumn({ name: options.foreignKey })(target, propertyName);
        Edm.EntityType(Edm.ForwardRef(options.entity))(target, propertyName);
        Edm.ForeignKey(options.foreignKey)(target, propertyName);
        break;
      case 'OneToOne':
        OneToOne(options.entity)(target, propertyName);
        Edm.EntityType(Edm.ForwardRef(options.entity))(target, propertyName);
        JoinColumn({ name: options.foreignKey })(target, propertyName);
        Edm.ForeignKey(options.foreignKey)(target, propertyName);
      default:
        break;
    }

  };
}

/**
 * get odata navigation
 *
 * @param target
 * @param propertyName
 */
export function getODataNavigation(target: any, propertyName: any): NavigationOptions {
  return Reflect.getMetadata(KEY_ODATA_PROP_NAVIGATION, target, propertyName);
}


/**
 * get odata navigation for entity
 *
 * @param target
 * @param propertyName
 */
export function getODataEntityNavigations(target: any): { [key: string]: NavigationOptions } {
  return Reflect.getMetadata(KEY_ODATA_ENTITY_NAVIGATIONS, target) || {};
}

export function withODataServerType(serverType: typeof TypedODataServer) {
  return function (target: any) {
    Reflect.defineMetadata(KEY_WITH_ODATA_SERVER, serverType, target);
  };
}

export function getODataServerType(target: any): typeof ODataServer {
  return Reflect.getMetadata(KEY_WITH_ODATA_SERVER, target);
}
