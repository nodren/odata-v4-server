// @ts-nocheck
import { ORMController, transformQueryAst } from "../lib/typeorm";
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

  it('should support converting odata query to typeorm find option', () => {

    const ast = defaultParser.query("$format=json&$select=A,B,C&$top=10&$skip=30&$filter=A eq 1&$orderby=A desc,V asc")
    const opt = transformQueryAst(ast)

    expect(opt.skip).toEqual(30)
    expect(opt.take).toEqual(10)
    expect(opt.select).toEqual(["A", "B", "C"])
    expect(opt.order).toEqual({ A: -1, V: 1 })
  
  });

});
