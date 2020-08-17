// @ts-nocheck
import { forEach } from '@newdash/newdash/forEach';
import { isArray } from '@newdash/newdash/isArray';
import { isEmpty } from '@newdash/newdash/isEmpty';
import { defaultParser, ODataQueryParam } from '@odata/parser';
import 'reflect-metadata';
import { Connection, getConnection, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { getKeyProperties, ODataQuery } from '..';
import { ODataController } from '../controller';
import * as Edm from '../edm';
import { ResourceNotFoundError, ServerInternalError } from '../error';
import { Literal } from '../literal';
import * as odata from '../odata';
import { getOrCreateTransaction, TransactionContext } from '../transaction';
import { DBHelper } from './db_helper';
import { getConnectionName, getDBHelper, getODataEntityNavigations, getODataEntityType, getODataServerType } from './decorators';
import { BaseODataModel } from './entity';
import { findHooks, HookContext, HookEvents, HookType } from './hooks';
import { TypedODataServer } from './server';


/**
 * Typeorm Service (Controller)
 */
export class TypedService<T extends typeof BaseODataModel = any> extends ODataController {

  /**
   * get main connection (without transaction)
   */
  protected async _getConnection(): Promise<Connection>;
  /**
   * get transactional connection
   *
   * @param ctx
   */
  protected async _getConnection(ctx?: TransactionContext): Promise<Connection>;
  protected async _getConnection(ctx?: TransactionContext) {
    if (ctx) {
      return (await this._getQueryRunner(ctx)).manager.connection;
    }
    return getConnection(getConnectionName(this.constructor));
  }

  protected _getEntityType(): T {
    return getODataEntityType(this.constructor);
  }

  protected _getDBHelper(): DBHelper {
    return getDBHelper(this.constructor);
  }

  protected async _getEntityManager(ctx?: TransactionContext) {
    return (await this._getQueryRunner(ctx)).manager;
  }

  protected async _getQueryRunner(ctx?: TransactionContext) {
    const connName = getConnectionName(this.constructor);
    const conn = getConnection(connName);
    return getOrCreateTransaction(conn, ctx);
  }

  protected async _getRepository(ctx?: TransactionContext): Promise<Repository<InstanceType<T>>> {
    // @ts-ignore
    return (await this._getEntityManager(ctx)).getRepository(this._getEntityType());
  }

  private _getServerType(): typeof TypedODataServer {
    return getODataServerType(this.constructor);
  }

  protected async _getService<E extends typeof BaseODataModel>(entity: E): Promise<TypedService<E>> {
    return this._getServerType().getService(entity);
  };

  /**
   * execute hooks for data processor
   *
   * @param ctx
   * @param hookType
   * @param data data for read/create
   * @param key key for update/delete
   */
  private async _executeHooks(ctx?: Partial<HookContext>) {

    if (ctx.entityType == undefined) {
      ctx.entityType = this._getEntityType();
    }

    if (ctx.hookType == undefined) {
      throw new ServerInternalError('Hook Type must be specify by controller');
    }

    if (ctx.getService == undefined) {
      ctx.getService = this._getService.bind(this);
    }

    const isEvent = HookEvents.includes(ctx.hookType);

    if (isEvent) {
      delete ctx.txContext;
    }

    const serverType = getODataServerType(this.constructor);

    const hooks = findHooks(serverType, this._getEntityType(), ctx.hookType);

    for (let idx = 0; idx < hooks.length; idx++) {
      const hook = hooks[idx];

      if (isEvent) {
        // is event, just trigger executor but not wait it finished
        // @ts-ignore
        hook.execute(ctx).catch(console.error); // create transaction context here
      } else {
        // is hook, wait them executed
        // @ts-ignore
        await hook.execute(ctx);
      }

    }
  }

  /**
   * transform inbound payload
   *
   * please AVOID run this method for single body multi times
   */
  private async _transformInboundPayload(body: any, ctx: TransactionContext) {
    forEach(body, (value: any, key: string) => {
      const type = Edm.getType(this._getEntityType(), key);
      if (type) {
        body[key] = Literal.convert(type, value);
      }
    });
  }

  /**
   * apply typeorm transformers, for read only
   *
   * (because the SQL query can not be processed in typeorm lifecycle)
   *
   * @param body
   */
  private async _applyTransforms(body: any, ctx: TransactionContext) {
    if (isArray(body)) {
      await Promise.all(body.map((item) => this._applyTransforms(item, ctx)));
    } else {
      const conn = await this._getConnection(ctx);
      const meta = conn.getMetadata(this._getEntityType());
      const columns = meta.columns;
      columns.forEach(({ propertyName, transformer }) => {
        if (transformer && Object.prototype.hasOwnProperty.call(body, propertyName)) {
          body[propertyName] = transformer.from(body[propertyName]);
        }
      });
    }

  }

  @odata.GET
  async findOne(@odata.key key, @odata.txContext ctx?: TransactionContext): Promise<InstanceType<T>> {
    if (key != undefined && key != null) {
      // with key
      const repo = await this._getRepository(ctx);
      const data = await repo.findOne(key);
      if (isEmpty(data)) {
        throw new ResourceNotFoundError(`Resource not found: ${this._getEntityType()?.name}[${key}]`);
      }
      await this._executeHooks({
        txContext: ctx, hookType: HookType.afterLoad, data, entityType: this._getEntityType()
      });
      return data;
    }
    // without key, generally in navigation
    return {};
  }

  private _columnNameMappingStore: Map<string, string>;

  private async createColumnMapper() {
    if (this._columnNameMappingStore == undefined) {
      this._columnNameMappingStore = new Map();
      const conn = await this._getConnection();
      const meta = conn.getMetadata(this._getEntityType());
      const columns = meta.columns;
      for (let idx = 0; idx < columns.length; idx++) {
        const column = columns[idx];
        this._columnNameMappingStore.set(column.propertyName, column.databaseName);
      }
    }
    return (propName) => this._columnNameMappingStore.get(propName);
  }

  async find(query: ODataQueryParam, ctx?: TransactionContext): Promise<Array<InstanceType<T>>>;
  async find(query: string, ctx?: TransactionContext): Promise<Array<InstanceType<T>>>;
  async find(query: ODataQuery, ctx?: TransactionContext): Promise<Array<InstanceType<T>>>;
  @odata.GET
  async find(@odata.query query, @odata.txContext ctx?: TransactionContext) {

    const conn = await this._getConnection(ctx);
    const repo = await this._getRepository(ctx);

    let data = [];

    if (query) {

      if (typeof query == 'string') {
        query = defaultParser.query(query);
      }

      if (query instanceof ODataQueryParam) {
        query = defaultParser.query(query.toString());
      }

      // optimize here
      const meta = conn.getMetadata(this._getEntityType());
      const schema = meta.schema;
      const tableName = meta.tableName;

      const helper = this._getDBHelper();

      const columnMapper = await this.createColumnMapper();

      const { queryStatement, countStatement } = helper.buildSQL({
        tableName,
        schema,
        query,
        countKey: 'TOTAL',
        colNameMapper: columnMapper
      });

      // query all ids firstly
      data = await repo.query(queryStatement);
      // apply transform
      await this._applyTransforms(data, ctx);

      // get counts if necessary
      if (countStatement) {
        const countResult = await repo.query(countStatement);
        let [{ TOTAL }] = countResult;
        // for mysql, maybe other db driver also will response string
        if (typeof TOTAL == 'string') {
          TOTAL = parseInt(TOTAL);
        }
        data['inlinecount'] = TOTAL;
      }


    } else {

      data = await repo.find();

    }


    if (data.length > 0) {
      await this._executeHooks({
        txContext: ctx, hookType: HookType.afterLoad, data
      });
    }

    return data;

  }

  /**
   * deep insert
   *
   * @private
   * @ignore
   * @internal
   * @param parentBody
   * @param ctx
   *
   * @returns require the parent object re-save again
   */
  private async _deepInsert(parentBody: any, ctx: TransactionContext): Promise<boolean> {
    let reSaveRequired = false;

    const navigations = getODataEntityNavigations(this._getEntityType().prototype);
    // TO DO
    // assert only one key for entities
    const [parentObjectKeyName] = getKeyProperties(this._getEntityType());

    for (const navigationName in navigations) {
      if (Object.prototype.hasOwnProperty.call(navigations, navigationName)) {
        if (Object.prototype.hasOwnProperty.call(parentBody, navigationName)) {

          // if navigation property have value
          const navigationData = parentBody[navigationName];
          const options = navigations[navigationName];
          const deepInsertElementType = options.entity();

          const parentObjectFKName = options.foreignKey;
          const navTargetFKName = options.targetForeignKey;

          if (isEmpty(parentObjectFKName) && isEmpty(navTargetFKName)) {
            throw new ServerInternalError(`fk is not defined on entity ${this._getEntityType().name} or ${deepInsertElementType.name}`);
          }

          const service = await this._getService(deepInsertElementType);
          const [navTargetKeyName] = getKeyProperties(deepInsertElementType);

          switch (options.type) {
            case 'OneToMany':
              if (isArray(navigationData)) {
                parentBody[navigationName] = await Promise.all(
                  navigationData.map((navigationItem) => {
                    navigationItem[navTargetFKName] = parentBody[parentObjectKeyName];
                    return service.create(navigationItem, ctx);
                  })
                );
              } else {
                // for one-to-many relationship, must provide an array, even only have one record
                throw new ServerInternalError(`navigation property [${navigationName}] must be an array!`);
              }
              break;
            case 'ManyToOne':
              reSaveRequired = true;
              parentBody[navigationName] = await service.create(navigationData, ctx);
              parentBody[parentObjectFKName] = parentBody[navigationName][navTargetKeyName];
              break;
            default:

              if (navTargetFKName) {
                navigationData[navTargetFKName] = parentBody[parentObjectKeyName];
              }

              parentBody[navigationName] = await service.create(navigationData, ctx);

              if (parentObjectFKName) {
                // save the fk to parent table
                reSaveRequired = true;
                parentBody[parentObjectFKName] = parentBody[navigationName][navTargetKeyName];
              }

              break;
          }
        }

      }
    }

    return reSaveRequired;

  }

  @odata.POST
  async create(@odata.body body: QueryDeepPartialEntity<InstanceType<T>>, @odata.txContext ctx?: TransactionContext) {
    const repo = await this._getRepository(ctx);
    await this._transformInboundPayload(body);

    const instance = body;
    await this._executeHooks({ txContext: ctx, hookType: HookType.beforeCreate, data: instance });

    // creation (INSERT only)
    await repo.insert(instance);

    // deep insert
    const reSaveRequired = await this._deepInsert(instance, ctx);
    // merge deep insert fk
    if (reSaveRequired) {
      await repo.save(instance);
    }

    await this._executeHooks({ txContext: ctx, hookType: HookType.afterCreate, data: instance });
    return instance;
  }

  // create or update
  @odata.PUT
  async save(@odata.key key, @odata.body body: QueryDeepPartialEntity<InstanceType<T>>, @odata.txContext ctx?: TransactionContext) {
    const repo = await this._getRepository(ctx);
    if (key) {
      const item = await repo.findOne(key);
      // if exist
      if (item) {
        return this.update(key, body, ctx);
      }
    }
    return this.create(body, ctx);
  }

  // odata patch will not response any content
  @odata.PATCH
  async update(@odata.key key, @odata.body body: QueryDeepPartialEntity<InstanceType<T>>, @odata.txContext ctx?: TransactionContext) {
    await this._transformInboundPayload(body);
    const repo = await this._getRepository(ctx);
    const instance = body;
    await this._executeHooks({ txContext: ctx, hookType: HookType.beforeUpdate, data: instance, key });
    await repo.update(key, instance);
    await this._executeHooks({ txContext: ctx, hookType: HookType.afterUpdate, data: instance, key });
  }

  // odata delete will not response any content
  @odata.DELETE
  async delete(@odata.key key, @odata.txContext ctx?: TransactionContext) {
    const repo = await this._getRepository(ctx);
    await this._executeHooks({ txContext: ctx, hookType: HookType.beforeDelete, key });
    await repo.delete(key);
    await this._executeHooks({ txContext: ctx, hookType: HookType.afterDelete, key });
  }

}
