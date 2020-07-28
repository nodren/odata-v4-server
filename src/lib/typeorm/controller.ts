import 'reflect-metadata';
import { getConnection, Repository } from 'typeorm';
import { isArray } from 'util';
import { odata } from '..';
import { ODataController } from '../controller';
import { ODataHttpContext } from '../server';
import { findHooks, HookContext, HookType } from './hooks';
import { BaseODataModel } from './model';
import { transformQueryAst } from './visitor';

/**
 * Typeorm Controller
 */
export class TypedController<T extends typeof BaseODataModel = any> extends ODataController {

  /**
   * typeorm connection name
   */
  private connectionName: string

  private _getConnection() {
    return getConnection(this.connectionName);
  }

  private _getCurrentRepository(): Repository<InstanceType<T>> {
    // @ts-ignore
    return this._getConnection().getRepository(this.elementType);
  }

  @odata.GET
  async findOne(@odata.key key, @odata.context ctx: ODataHttpContext) {
    const data = await this._getCurrentRepository().findOne(key);
    await this._executeHooks(ctx, HookType.afterLoad, data);
    return data;
  }

  @odata.GET
  async find(@odata.query query, @odata.context ctx: ODataHttpContext) {

    const conn = this._getConnection();
    const repo = this._getCurrentRepository();
    let data = [];

    if (query) {
      const meta = conn.getMetadata(this.elementType);
      const tableName = meta.tableName;
      const { selectedFields, sqlQuery, count, where } = transformQueryAst(query, (f) => `${tableName}.${f}`);
      const sFields = selectedFields.length > 0 ? selectedFields.join(', ') : '*';
      const sql = `select ${sFields} from ${tableName} ${sqlQuery};`;
      data = await repo.query(sql);
      if (count) {
        const [{ total }] = await repo.query(`select count(1) as total from ${tableName} where ${where}`);
        data['inlinecount'] = total;
      }
    } else {
      data = await repo.find();
    }

    await this._executeHooks(ctx, HookType.afterLoad, data);

    return data;
  }

  @odata.POST
  async create(@odata.body body, @odata.context ctx: ODataHttpContext) {
    await this._executeHooks(ctx, HookType.beforeCreate, body);
    return this._getCurrentRepository().save(body);
  }

  // odata patch will response no content
  @odata.PATCH
  async update(@odata.key key, @odata.body body, @odata.context ctx: ODataHttpContext) {
    await this._executeHooks(ctx, HookType.beforeDelete, body, key);
    return this._getCurrentRepository().update(key, body);
  }

  // odata delete will response no content
  @odata.DELETE
  async delete(@odata.key key, @odata.context ctx: ODataHttpContext) {
    await this._executeHooks(ctx, HookType.beforeDelete, undefined, key);
    return this._getCurrentRepository().delete(key);
  }

  /**
   * execute hooks for data processor
   *
   * @param ctx
   * @param hookType
   * @param data data for read/create
   * @param key key for update/delete
   */
  private async _executeHooks(ctx: ODataHttpContext, hookType: HookType, data?: any, key?: any) {
    const hooks = findHooks(this.elementType, hookType);
    for (let idx = 0; idx < hooks.length; idx++) {
      const hook = hooks[idx];
      const opt: HookContext = {
        context: ctx,
        hookType,
        entityType: this.elementType,
        key
      };
      if (isArray(data)) {
        opt.listData = data;
      } else {
        opt.data = data;
      }
      await hook.execute(opt);
    }
  }

}


/**
 * indicate the controller use the connection name
 * if user not use this decorator, or set empty connection name, the controller will use the 'default' connection of typeorm
 *
 * @param connectionName typeorm connection name
 */
export function withConnection(connectionName: string = 'default') {
  return function(controller: typeof TypedController) {
    // @ts-ignore
    controller.prototype.connectionName = connectionName;
  };
}
