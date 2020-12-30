import 'reflect-metadata';
import { ColumnOptions, ColumnType, EntityOptions } from 'typeorm';
import { ViewEntityOptions } from 'typeorm/decorator/options/ViewEntityOptions';
import * as Edm from '../../edm';
import { ODataServer } from '../../server';
import { DBHelper } from '../db_helper';
import { BaseODataModel } from '../entity';
import { TypedODataServer } from '../server';
import { TypedService } from '../service';
import { Class } from '../types';
declare type ExcludedColumnType = 'float' | 'double' | 'float4' | 'float8' | 'double' | 'double precision' | 'enum';
export interface PropertyOptions extends ColumnOptions {
    type?: Exclude<ColumnType, ExcludedColumnType>;
}
export interface EColumnOptions extends Omit<PropertyOptions, 'enum'> {
    /**
     * reflect metadata type, could be undefined
     */
    reflectType?: Class;
    /**
     * `odata/server` **computed** field, not from DB but from logic
     */
    computed?: boolean;
    /**
     * enum values
     */
    enumValues?: Array<string> | Array<number> | object;
}
/**
 * define odata action for entity
 *
 * @alias Edm.Action
 */
export declare const ODataAction: typeof Edm._Action;
/**
 * define odata function for entity
 *
 * @alias Edm.Function
 */
export declare const ODataFunction: typeof Edm._Function;
/**
 * set entity set name for odata entity
 *
 * @param entitySetName
 */
export declare function withEntitySetName(entitySetName: string): (target: any) => void;
/**
 * set entity type for anything
 *
 * @param entity
 */
export declare function withEntityType(entity: any): (target: any) => void;
/**
 * with db helper for entity/service/server
 *
 * @param type
 */
export declare function withDBHelper(type: DBHelper): (target: any) => void;
/**
 * get db helper for entity/service/server
 *
 * @param target
 */
export declare function getDBHelper(target: any): DBHelper;
/**
 * set entity set name for odata entity
 *
 * @param target
 */
export declare function getODataEntitySetName(target: any): string;
/**
 * get entity type for controller
 *
 * @param target
 */
export declare function getODataEntityType(target: any): typeof BaseODataModel;
/**
 * OData Entity Type
 *
 * The wrapper of the typeorm `Entity` decorator
 *
 * @param options
 */
export declare function ODataModel(options?: EntityOptions, entitySetName?: string): (target: any) => void;
/**
 * define odata view
 *
 * @param options
 * @param entitySetName
 */
export declare function ODataView(options?: ViewEntityOptions, entitySetName?: string): (target: any) => void;
/**
 * define an odata entity type/domain model
 *
 * @deprecated do not use this
 */
export declare const ODataEntityType: typeof ODataModel;
export declare const getODataColumns: (classOrInstance: any) => Array<EColumnOptions>;
export declare const isODataEntityType: (classOrInstance: any) => boolean;
export declare const isODataViewType: (classOrInstance: any) => boolean;
/**
 * ODataColumn
 *
 * combine the `Edm` & `typeorm` decorator
 *
 * @param options
 */
export declare function ODataColumn(options?: PropertyOptions): (object: any, propertyName: string) => void;
/**
 * get property column options
 *
 * @param target
 * @param propsName
 */
export declare function getPropertyOptions(target: any, propsName: string): EColumnOptions;
/**
 * create property with default option
 *
 * @param defaultOption
 */
export declare function createPropertyDecorator(defaultOption: EColumnOptions): (options?: EColumnOptions) => PropertyDecorator;
/**
 * define key property for odata entity type
 *
 * @param options
 */
export declare const KeyProperty: (options?: EColumnOptions) => PropertyDecorator;
/**
 * auto increment key property
 */
export declare const IncKeyProperty: (options?: EColumnOptions) => PropertyDecorator;
/**
 * uuid generated key property
 */
export declare const UUIDKeyProperty: (options?: EColumnOptions) => PropertyDecorator;
/**
 * define property for odata entity type
 */
export declare const Property: (options?: EColumnOptions) => PropertyDecorator;
/**
 * define optional property for odata entity type
 */
export declare const OptionalProperty: (options?: EColumnOptions) => PropertyDecorator;
interface BaseNavigation<T extends Class = any> {
    /**
     * nav target entity
     */
    entity: (type?: any) => T;
}
interface OneToManyNavigationOption<T extends Class = any> extends BaseNavigation<T> {
    /**
     * one to many navigation
     *
     * so target entity fk will store current model key value
     */
    type: 'OneToMany';
    /**
     * fk on targe entity
     *
     */
    targetForeignKey: keyof InstanceType<T>;
}
interface ManyToOneNavigationOption<T extends Class = any> extends BaseNavigation<T> {
    /**
     * many to one navigation
     *
     * so the fk is stored the key value of target model
     */
    type: 'ManyToOne';
    /**
     * fk on current entity,
     */
    foreignKey: string;
}
interface OneToOneNavigationOption<T extends Class = any> extends BaseNavigation<T> {
    type: 'OneToOne';
    /**
     * fk on current entity,
     */
    foreignKey?: string;
    /**
     * fk on targe entity
     */
    targetForeignKey?: keyof InstanceType<T>;
}
export declare type NavigationOptions<T extends Class = any> = OneToManyNavigationOption<T> | ManyToOneNavigationOption<T> | OneToOneNavigationOption<T>;
/**
 * ODataNavigation decorator
 *
 * define the navigation
 *
 * @param options
 */
export declare function ODataNavigation<T extends Class>(options: NavigationOptions<T>): (target: any, propertyName: string) => void;
/**
 * get odata navigation options
 *
 * @param target
 * @param propertyName
 */
export declare function getODataNavigation(target: any, propertyName: any): NavigationOptions;
/**
 * get odata navigation for entity
 *
 * @param target
 * @param propertyName
 */
export declare function getODataEntityNavigations(target: any): {
    [key: string]: NavigationOptions;
};
export declare function withODataServerType(serverType: typeof TypedODataServer): (target: any) => void;
export declare function getODataServerType(target: any): typeof ODataServer;
/**
 * indicate the controller use the connection name
 * if user not use this decorator, or set empty connection name, the controller will use the 'default' connection of typeorm
 *
 * @param connectionName typeorm connection name
 */
export declare function withConnection(connectionName?: string): (controller: typeof TypedService) => void;
/**
 * getConnectName for typed controller
 * @param target
 */
export declare function getConnectionName(target: typeof TypedService | typeof BaseODataModel): any;
export {};
