// @ts-nocheck
import isEmpty from '@newdash/newdash/isEmpty';
import { defaultParser, ODataQueryParam } from '@odata/parser';
import 'reflect-metadata';
import { getConnection, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { odata, ODataQuery } from '..';
import { getControllerInstance, ODataController } from '../controller';
import { ResourceNotFoundError, ServerInternalError } from '../error';
import { ODataHttpContext } from '../server';
import { getConnectionName } from './connection';
import { findHooks, HookContext, HookEvents, HookType } from './hooks';
import { BaseODataModel } from './model';
import { getOrCreateTransaction } from './transaction';
import { transformQueryAst } from './visitor';

/**
 * Typeorm Service (Controller)
 */
export class TypedService<T extends typeof BaseODataModel = any> extends ODataController {

  protected async _getConnection(ctx?: ODataHttpContext) {
    return (await this._getQueryRunner(ctx)).connection;
  }

  protected async _getEntityManager(ctx?: ODataHttpContext) {
    return (await this._getQueryRunner(ctx)).manager;
  }

  protected async _getQueryRunner(ctx?: ODataHttpContext) {
    return getOrCreateTransaction(getConnection(getConnectionName(this.constructor as typeof TypedService)), ctx);
  }

  protected async _getRepository(ctx?: ODataHttpContext): Promise<Repository<InstanceType<T>>> {
    // @ts-ignore
    return (await this._getConnection(ctx)).getRepository(this.elementType);
  }

  protected _gerService<E extends typeof BaseODataModel>(entity: E): TypedService<E> {
    return getEntityController(entity);
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
      ctx.entityType = this.elementType;
    }
    if (ctx.em == undefined) {
      ctx.em = await this._getEntityManager(ctx.context);
    }
    if (ctx.hookType == undefined) {
      throw new ServerInternalError('Hook Type must be specify by controller');
    }
    if (ctx.getService == undefined) {
      ctx.getService = getEntityController;
    }

    const isEvent = HookEvents.includes(ctx.hookType);

    const hooks = findHooks(this.elementType, ctx.hookType);

    for (let idx = 0; idx < hooks.length; idx++) {
      const hook = hooks[idx];

      if (isEvent) {
        // is event, just trigger executor but not wait it finished
        // @ts-ignore
        hook.execute(ctx).catch((error) => {
          // logger here
        });
      } else {
        // is hook, wait them executed
        // @ts-ignore
        await hook.execute(ctx);
      }

    }
  }


  @odata.GET
  async findOne(@odata.key key, @odata.context ctx?: ODataHttpContext): Promise<InstanceType<T>> {
    const repo = await this._getRepository(ctx);
    const data = await repo.findOne(key);
    if (isEmpty(data)) {
      throw new ResourceNotFoundError(`Resource not found: ${this.elementType?.name}[${key}]`);
    }
    await this._executeHooks({
      context: ctx, hookType: HookType.afterLoad, data, entityType: this.elementType
    });
    return data;
  }

  async find(query: ODataQueryParam, ctx?: ODataHttpContext): Promise<Array<InstanceType<T>>>;
  async find(query: string, ctx?: ODataHttpContext): Promise<Array<InstanceType<T>>>;
  async find(query: ODataQuery, ctx?: ODataHttpContext): Promise<Array<InstanceType<T>>>;
  @odata.GET
  async find(@odata.query query, @odata.context ctx?: ODataHttpContext) {

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

      const meta = conn.getMetadata(this.elementType);
      const tableName = meta.tableName;
      const { selectedFields, sqlQuery, count, where } = transformQueryAst(
        query,
        (f) => `${tableName}.${f}`
      );
      const sFields = selectedFields.length > 0 ? selectedFields.join(', ') : '*';
      const sql = `select ${sFields} from ${tableName} ${sqlQuery};`;
      data = await repo.query(sql);
      if (count) {
        let sql = `select count(1) as total from ${tableName}`;
        if (where) { sql += ` where ${where}`; }
        const [{ total }] = await repo.query(sql);
        data['inlinecount'] = total;
      }
    } else {
      data = await repo.find();
    }

    if (data.length > 0) {
      await this._executeHooks({
        context: ctx, hookType: HookType.afterLoad, data
      });
    }

    return data;

  }

  @odata.POST
  async create(@odata.body body: QueryDeepPartialEntity<InstanceType<T>>, @odata.context ctx?: ODataHttpContext) {
    const repo = await this._getRepository(ctx);
    const instance = repo.create(body);
    await this._executeHooks({ context: ctx, hookType: HookType.beforeCreate, data: instance });
    // query the created item
    const { identifiers: [id] } = await repo.insert(instance);
    // and return it
    const created = await this.findOne(id, ctx);
    await this._executeHooks({ context: ctx, hookType: HookType.afterSave, data: created });
    return created;
  }

  // create or update
  @odata.PUT
  async save(@odata.key key, @odata.body body: QueryDeepPartialEntity<InstanceType<T>>, @odata.context ctx?: ODataHttpContext) {
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
  async update(@odata.key key, @odata.body body: QueryDeepPartialEntity<InstanceType<T>>, @odata.context ctx?: ODataHttpContext) {
    const repo = await this._getRepository(ctx);
    const instance = repo.create(body);
    await this._executeHooks({ context: ctx, hookType: HookType.beforeUpdate, data: instance, key });
    await repo.update(key, instance);
    await this._executeHooks({ context: ctx, hookType: HookType.afterSave, data: instance, key });
  }

  // odata delete will not response any content
  @odata.DELETE
  async delete(@odata.key key, @odata.context ctx?: ODataHttpContext) {
    const repo = await this._getRepository(ctx);
    await this._executeHooks({ context: ctx, hookType: HookType.beforeDelete, key });
    await repo.delete(key);
    await this._executeHooks({ context: ctx, hookType: HookType.afterSave, key });
  }

}

/**
 * service registry for entities
 */
const entityServicesRegistry = new Map<typeof BaseODataModel, typeof TypedService>();

/**
 * register controller for entity
 *
 * @param entity
 * @param controller
 */
export function registerController(entity: typeof BaseODataModel, controller: typeof TypedService): void {
  if (entityServicesRegistry.has(entity)) {
    throw new Error('the controller has been generated for entity. (one entity - one controller)');
  }
  entityServicesRegistry.set(entity, controller);
}

/**
 * get entity controller instance
 *
 * @param entity
 */
export function getEntityController<E extends typeof BaseODataModel>(entity: E): TypedService<E> {
  // @ts-ignore
  return getControllerInstance(entityServicesRegistry.get(entity));
}
