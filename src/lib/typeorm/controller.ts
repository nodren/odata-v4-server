import 'reflect-metadata';
import { EntityManager, getConnection, Repository } from 'typeorm';
import { odata } from '..';
import { ODataController } from '../controller';
import { ServerInternalError } from '../error';
import { ODataHttpContext } from '../server';
import { findHooks, HookContext, HookType } from './hooks';
import { BaseODataModel } from './model';
import { transformQueryAst } from './visitor';

/**
 * Typeorm Controller
 */
export class TypedController<T extends typeof BaseODataModel = any> extends ODataController {

  private _getConnection() {
    return getConnection(getConnectName(this.constructor as typeof TypedController));
  }

  private async _tx<X>(runner: (repo: Repository<InstanceType<T>>, em: EntityManager,) => Promise<X>): Promise<X> {
    return new Promise(async(resolve, reject) => {
      try {
        await this._getConnection().transaction(async(em) => {
          const repo = em.getRepository(this.elementType);
          // @ts-ignore
          resolve(await runner(repo, em));
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * execute hooks for data processor
   *
   * @param ctx
   * @param hookType
   * @param data data for read/create
   * @param key key for update/delete
   */
  private async _executeHooks(ctx: Partial<HookContext>) {
    const hooks = findHooks(this.elementType, ctx.hookType);
    for (let idx = 0; idx < hooks.length; idx++) {
      const hook = hooks[idx];
      if (ctx.entityType == undefined) {
        ctx.entityType = this.elementType;
      }
      if (ctx.em == undefined) {
        ctx.em = this._getConnection().manager;
      }
      if (ctx.hookType == undefined) {
        throw new ServerInternalError('Hook Type must be specify by controller');
      }
      // @ts-ignore
      await hook.execute(ctx);
    }
  }


  @odata.GET
  async findOne(@odata.key key, @odata.context ctx: ODataHttpContext) {
    return this._tx(async(repo, em) => {
      const data = await repo.findOne(key);
      await this._executeHooks({
        context: ctx, hookType: HookType.afterLoad, data, em, entityType: this.elementType
      });
      return data;
    });
  }

  @odata.GET
  async find(@odata.query query, @odata.context ctx: ODataHttpContext) {
    return this._tx(async(repo, em) => {
      const conn = em.connection;
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

      await this._executeHooks({
        context: ctx, hookType: HookType.afterLoad, data, em
      });

      return data;
    });

  }

  @odata.POST
  async create(@odata.body body, @odata.context ctx: ODataHttpContext) {
    return this._tx(async(repo) => {
      await this._executeHooks({ context: ctx, hookType: HookType.beforeCreate, data: body });
      return repo.save(body);
    });
  }

  // odata patch will response no content
  @odata.PATCH
  async update(@odata.key key, @odata.body body, @odata.context ctx: ODataHttpContext) {
    return this._tx(async(repo) => {
      await this._executeHooks({ context: ctx, hookType: HookType.beforeUpdate, data: body, key });
      return repo.update(key, body);
    });
  }

  // odata delete will response no content
  @odata.DELETE
  async delete(@odata.key key, @odata.context ctx: ODataHttpContext) {
    return this._tx(async(repo) => {
      await this._executeHooks({ context: ctx, hookType: HookType.beforeDelete, key });
      return repo.delete(key);
    });
  }


}

const KEY_CONN_NAME = 'odata:controller:connection';

/**
 * indicate the controller use the connection name
 * if user not use this decorator, or set empty connection name, the controller will use the 'default' connection of typeorm
 *
 * @param connectionName typeorm connection name
 */
export function withConnection(connectionName: string = 'default') {
  return function(controller: typeof TypedController) {
    Reflect.defineMetadata(KEY_CONN_NAME, connectionName, controller);
  };
}

/**
 * getConnectName for typed controller
 * @param target
 */
export function getConnectName(target: typeof TypedController) {
  return Reflect.getMetadata(KEY_CONN_NAME, target);
}
