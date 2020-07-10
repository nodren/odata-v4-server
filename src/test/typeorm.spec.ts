// @ts-nocheck
import { ORMController, transformQueryAst, transformFilterAst, FieldNameMapper } from "../lib/typeorm";
import { createConnection, Entity, PrimaryColumn, Column, ConnectionOptions, getConnection } from "typeorm";
import { Edm, odata, ODataServer, withController, ODataQuery } from "../lib/index"
import { randomPort } from './utils/randomPort';
import { ready, shutdown } from './utils/server';
import * as req from 'request-promise';
import { defaultParser } from '@odata/parser';


describe('Typeorm Integration Test Suite', () => {

  const createTmpConnection = (opt?: Partial<ConnectionOptions>) => createConnection({
    name: "default",
    type: "sqljs",
    synchronize: true,
    // logging: true,
    ...opt
  })

  it('should support CRUD by repository', async () => {

    // example entity
    @Entity()
    class Product {

      @Edm.Key
      @PrimaryColumn()
      id: number;

      @Column()
      @Edm.String
      desc: string

    }

    const tmpConn = await createTmpConnection({ entities: [Product] })

    const tmpRepo = tmpConn.getRepository(Product)

    // ensure typeorm works
    await tmpRepo.save({ id: 2, desc: "123" })

    expect(await tmpRepo.findOne({ id: 2 })).not.toBeUndefined()
    tmpRepo.find({})

    // example controller
    @odata.type(Product)
    @odata.entitySet("Products")
    class C4 extends ORMController<Product> {

      @odata.GET
      async findOne(@odata.key key) {
        return getConnection("default").getRepository(Product).findOne(key)
      }

      @odata.POST
      async create(@odata.body body: Partial<Product>) {
        return getConnection("default").getRepository(Product).save(body)
      }

      // odata patch will response no content
      @odata.PATCH
      async update(@odata.key key, @odata.body body: Partial<Product>) {
        const repo = getConnection().getRepository(Product)
        return await repo.update(key, body)
      }

      // odata delete will response no content
      @odata.DELETE
      async delete(@odata.key key) {
        return getConnection().getRepository(Product).delete(key)
      }

    }

    @withController(C4)
    class TmpServer extends ODataServer { }

    const server = TmpServer.create(randomPort())

    const port = await ready(server)

    let res = await req.post(`http://127.0.0.1:${port}/Products`, { json: { id: 1, desc: "description" } })

    expect(res['@odata.id']).not.toBeUndefined()

    const v = await tmpRepo.findOne(1)

    expect(v).not.toBeUndefined()

    res = await req.get(`http://127.0.0.1:${port}/Products(1)`, { json: true })
    expect(res['desc']).toEqual('description')

    // update
    // no content
    await req.patch(`http://127.0.0.1:${port}/Products(1)`, { json: { id: 1, desc: "updated" } })

    // assert
    res = await req.get(`http://127.0.0.1:${port}/Products(1)`, { json: true })
    expect(res['desc']).toEqual('updated')

    res = await req.delete(`http://127.0.0.1:${port}/Products(1)`)

    // not found
    await expect(async () => req.get(`http://127.0.0.1:${port}/Products(1)`)).rejects.toThrow()

    await shutdown(server)
    await tmpConn.close()

  });

  it('should support converting odata query to sql', () => {

    const ast = defaultParser.query("$format=json&$select=A,B,C&$top=10&$skip=30&$filter=A eq 1&$orderby=A desc,V asc")
    const { selectedFields, sqlQuery } = transformQueryAst(ast)

    expect(sqlQuery.trim()).toEqual("WHERE A = 1 LIMIT 30, 10 ORDERBY A DESC, V ASC")
    expect(selectedFields).toEqual(["A", "B", "C"])

  });

  it('should support converting odata query to sql with name mapper', () => {

    const ast = defaultParser.query("$format=json&$select=A,B,C&$top=10&$skip=30&$filter=A eq 1&$orderby=A desc,V asc")
    const nameMapper: FieldNameMapper = (fieldName) => `table.${fieldName}`
    const { selectedFields, sqlQuery } = transformQueryAst(ast, nameMapper)

    expect(sqlQuery.trim()).toEqual("WHERE table.A = 1 LIMIT 30, 10 ORDERBY table.A DESC, table.V ASC")
    expect(selectedFields).toEqual(["table.A", "table.B", "table.C"])

  });

  it('should support converting data query to sql', () => {

    const ast = defaultParser.filter("(A eq 3) and (B eq 4 or B eq 5) and (C ge 3 and D lt 5)")
    const sql = transformFilterAst(ast)

    expect(sql).toEqual('(A = 3) AND (B = 4 OR B = 5) AND (C >= 3 AND D < 5)')

  });

});
