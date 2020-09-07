// @ts-nocheck
import { getUnProxyTarget, inject, InjectContainer, required, transient, withType } from '@newdash/inject';
import { forEach } from '@newdash/newdash/forEach';
import { isArray } from '@newdash/newdash/isArray';
import { isEmpty } from '@newdash/newdash/isEmpty';
import { defaultParser, ODataFilter, ODataQueryParam, param } from '@odata/parser';
import 'reflect-metadata';
import { Connection, DeepPartial, QueryRunner, Repository } from 'typeorm';
import { getKeyProperties, ODataQuery } from '..';
import { InjectKey } from '../constants';
import { ODataController } from '../controller';
import * as Edm from '../edm';
import { ResourceNotFoundError, ServerInternalError } from '../error';
import { Literal } from '../literal';
import { createLogger } from '../logger';
import * as odata from '../odata';
import { TransactionContext } from '../transaction';
import { DBHelper } from './db_helper';
import { getODataEntityNavigations, getODataServerType } from './decorators';
import { BaseODataModel } from './entity';
import { findHooks, HookContext, HookEvents, HookType } from './hooks';
import { TypedODataServer } from './server';

const logger = createLogger('type:service');


/**
 * Typeorm Service (Controller)
 */
export class TypedService<T = any> extends ODataController {

  constructor() {
    super();
  }

  /**
   * get main connection (without transaction)
   */
  protected async _getConnection(): Promise<Connection>;
  /**
   * get transactional connection
   *
   * @param ctx
   */
  protected async _getConnection(@inject(InjectKey.TransactionQueryRunner) qr?: QueryRunner): Promise<Connection> {
    return qr.manager.connection;
  }

  protected async _getEntityManager(@inject(InjectKey.TransactionQueryRunner) qr?: QueryRunner) {
    return qr.manager;
  }

  protected async _getRepository(@inject(InjectKey.ODataTypeParameter) entityType: any): Promise<Repository<T>> {
    return (await this._getEntityManager()).getRepository(entityType);
  }

  protected async _getService<E extends typeof BaseODataModel = any>(
    @odata.type entityType: E,
    @odata.injectContainer ic: InjectContainer,
    @inject(InjectKey.ServerType) serverType: typeof TypedODataServer
  ): Promise<TypedService<InstanceType<E>>> {
    ic.registerInstance(InjectKey.ODataTypeParameter, entityType, true);
    const service = await serverType.getService(entityType);
    return ic.wrap(service);
  };

  private async executeHooks(
    hookType: HookType,
    data?: any,
    key?: any,
    @inject(InjectContainer) ic?: InjectContainer,
    @inject(InjectKey.RequestTransaction) tx?: TransactionContext,
    @inject(InjectKey.ODataTypeParameter) entityType
  ) {

    ic = await ic.createSubContainer();

    const ctx: HookContext = {
      hookType,
      key,
      ic,
      txContext: tx,
      entityType
    };

    if (data != undefined) {
      if (isArray(data)) {
        ctx.listData = data;
      } else {
        ctx.data = data;
      }
    }

    ctx.ic.registerInstance(InjectKey.HookContext, ctx);

    if (ctx.hookType == undefined) {
      throw new ServerInternalError('Hook Type must be specify by controller');
    }

    ctx.getService = this._getService.bind(this);

    const isEvent = HookEvents.includes(ctx.hookType);

    if (isEvent) {
      delete ctx.txContext;
    }

    const serverType = getODataServerType(this.constructor);

    const hooks = findHooks(serverType, ctx.entityType, ctx.hookType);

    for (let idx = 0; idx < hooks.length; idx++) {
      const hook = ctx.ic.wrap(hooks[idx]);

      if (isEvent) {
        // is event, just trigger executor but not wait it finished
        // @ts-ignore
        hook.execute().catch(logger); // create transaction context here
      } else {
        // is hook, wait them executed
        // @ts-ignore
        await hook.execute();
      }

    }
  }

  /**
   * transform inbound payload
   *
   * please AVOID run this method for single body multi times
   */
  private async _transformInboundPayload(body: any, @inject(InjectKey.ODataTypeParameter) entityType) {
    forEach(body, (value: any, key: string) => {
      const type = Edm.getType(entityType, key);
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
   * @private
   * @internal
   * @ignore
   *
   * @param body
   */
  private async _applyTransforms(body: any, @inject(InjectKey.ODataTypeParameter) entityType) {

    const conn = await this._getConnection();
    const meta = conn.getMetadata(entityType);
    const columns = meta.columns;

    function applyTransformForItem(item) {
      columns.forEach(({ propertyName, transformer }) => {
        if (transformer && Object.prototype.hasOwnProperty.call(item, propertyName)) {
          item[propertyName] = transformer.from(item[propertyName]);
        }
      });
    }

    if (isArray(body)) {
      for (let idx = 0; idx < body.length; idx++) {
        const item = body[idx];
        applyTransformForItem(item);
      }
    }
    else {
      applyTransformForItem(body);
    }

  }

  @odata.GET
  async findOne(@odata.key key: any, @inject(InjectKey.ODataTypeParameter) entityType): Promise<T> {
    if (key != undefined && key != null) {
      // with key
      const repo = await this._getRepository();
      const data = await repo.findOne(key);
      if (isEmpty(data)) {
        throw new ResourceNotFoundError(`Resource not found: ${entityType?.name}[${key}]`);
      }
      await this.executeHooks(HookType.afterLoad, data);
      return data;
    }
    // without key, generally in navigation
    return {};
  }

  private _columnNameMappingStore: Map<string, string>;

  private async createColumnMapper(
    @inject(InjectKey.ODataTypeParameter) entityType
  ) {
    if (this._columnNameMappingStore == undefined) {
      this._columnNameMappingStore = new Map();
      const conn = await this._getConnection();
      const meta = conn.getMetadata(entityType);
      const columns = meta.columns;
      for (let idx = 0; idx < columns.length; idx++) {
        const column = columns[idx];
        this._columnNameMappingStore.set(column.propertyName, column.databaseName);
      }
    }
    return (propName) => this._columnNameMappingStore.get(propName);
  }

  async find(queryString: string): Promise<Array<T>>;
  async find(queryAst: ODataQuery): Promise<Array<T>>;
  async find(queryObject: ODataQueryParam): Promise<Array<T>>;
  async find(filter: ODataFilter): Promise<Array<T>>;
  async find(filterOrQueryStringOrQueryAst?: any): Promise<Array<T>>;
  @odata.GET
  async find(
    @odata.query query,
    @inject(InjectKey.DatabaseHelper) helper: DBHelper,
    @inject(InjectKey.ODataTypeParameter) entityType
  ) {
    const conn = await this._getConnection();
    const repo = await this._getRepository();

    let data = [];

    if (query) {

      if (typeof query == 'string') {
        query = defaultParser.query(query);
      }

      if (query instanceof ODataQueryParam) {
        query = defaultParser.query(query.toString());
      }

      if (query instanceof ODataFilter) {
        query = defaultParser.query(param().filter(query).toString());
      }

      // optimize here
      const meta = conn.getMetadata(entityType);
      const schema = meta.schema;
      const tableName = meta.tableName;

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
      await this._applyTransforms(data);

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
      this.executeHooks(HookType.afterLoad, data);
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
  async _deepInsert(parentBody: any, @inject(InjectKey.ODataTypeParameter) entityType): Promise<boolean> {
    let reSaveRequired = false;

    const navigations = getODataEntityNavigations(entityType.prototype);

    const [parentObjectKeyName] = getKeyProperties(entityType);

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
            throw new ServerInternalError(`fk is not defined on entity ${entityType.name} or ${deepInsertElementType.name}`);
          }
          const service = await this._getService(deepInsertElementType);
          const [navTargetKeyName] = getKeyProperties(deepInsertElementType);

          switch (options.type) {
            case 'OneToMany':
              if (isArray(navigationData)) {
                parentBody[navigationName] = await Promise.all(
                  navigationData.map((navigationItem) => {
                    navigationItem[navTargetFKName] = parentBody[parentObjectKeyName];
                    return service.create(navigationItem);
                  })
                );
              } else {
                // for one-to-many relationship, must provide an array, even only have one record
                throw new ServerInternalError(`navigation property [${navigationName}] must be an array!`);
              }
              break;
            case 'ManyToOne':
              reSaveRequired = true;
              parentBody[navigationName] = await service.create(navigationData);
              parentBody[parentObjectFKName] = parentBody[navigationName][navTargetKeyName];
              break;
            default:

              if (navTargetFKName) {
                navigationData[navTargetFKName] = parentBody[parentObjectKeyName];
              }

              parentBody[navigationName] = await service.create(navigationData);

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
  async create(@odata.body body: DeepPartial<T>): Promise<T> {
    const repo = await this._getRepository();
    await this._transformInboundPayload(body);

    const instance = body;
    await this.executeHooks(HookType.beforeCreate, instance);

    // creation (INSERT only)
    await repo.insert(instance);

    // deep insert
    const reSaveRequired = await this._deepInsert(instance);

    // merge deep insert fk
    if (reSaveRequired) {
      await repo.save(instance);
    }

    await this.executeHooks(HookType.afterCreate, instance);
    return instance;
  }

  // create or update
  @odata.PUT
  async save(@odata.key key, @odata.body body: DeepPartial<T>) {
    const repo = await this._getRepository();
    if (key) {
      const item = await repo.findOne(key);
      // if exist
      if (item) {
        return this.update(key, body);
      }
    }
    return this.create(body);
  }

  // odata patch will not response any content
  @odata.PATCH
  async update(@odata.key key: any, @odata.body body: DeepPartial<T>) {
    await this._transformInboundPayload(body);
    const repo = await this._getRepository();
    const instance = body;
    await this.executeHooks(HookType.beforeUpdate, instance, key);
    await repo.update(key, instance);
    await this.executeHooks(HookType.afterUpdate, instance, key);
  }

  // odata delete will not response any content
  @odata.DELETE
  async delete(@odata.key key: any) {
    const repo = await this._getRepository();
    await this.executeHooks(HookType.beforeDelete, undefined, key);
    await repo.delete(key);
    await this.executeHooks(HookType.afterDelete, undefined, key);
  }

}

/**
 * provide odata service instance by entity
 */
export class ODataServiceProvider {

  @transient
  @withType(InjectKey.InjectODataService)
  async provide(
    @required @inject(InjectKey.ODataTypedService) entityType,
    @required @inject(InjectKey.ServerType) server: typeof TypedODataServer,
    @required @inject(InjectKey.ODataTxContextParameter) tx: TransactionContext
  ) {
    const [service] = await server.getServicesWithContext(tx, getUnProxyTarget(entityType));
    return service;
  }

}
