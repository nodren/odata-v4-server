import 'reflect-metadata';
import { ODataController } from '../controller';
import { odata } from '..';
import { getConnection, Repository } from 'typeorm';
import { transformQueryAst } from './visitor';

/**
 * Typeorm Controller
 */
export class TypedController<T = any> extends ODataController {

  /**
   * typeorm connection name
   */
  private connectionName: string

  private _getConnection() {
    return getConnection(this.connectionName);
  }

  private _getCurrentRepository(): Repository<T> {
    return this._getConnection().getRepository(this.elementType);
  }

  @odata.GET
  async findOne(@odata.key key) {
    return this._getCurrentRepository().findOne(key);
  }

  @odata.GET
  async find(@odata.query query) {

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

    return data;
  }

  @odata.POST
  async create(@odata.body body) {
    return this._getCurrentRepository().save(body);
  }

  // odata patch will response no content
  @odata.PATCH
  async update(@odata.key key, @odata.body body) {
    return this._getCurrentRepository().update(key, body);
  }

  // odata delete will response no content
  @odata.DELETE
  async delete(@odata.key key) {
    return this._getCurrentRepository().delete(key);
  }

}


/**
 * @param connectionName typeorm connection name
 */
export function withConnection(connectionName: string = 'default') {
  return function(controller: typeof TypedController) {
    // @ts-ignore
    controller.prototype.connectionName = connectionName;
  };
}
