// @ts-nocheck
import { ORMController, withConnection } from "../lib/typeorm";
import { createConnection, Entity, PrimaryColumn, Column, ConnectionOptions, BaseEntity } from "typeorm";
import { Edm, odata, ODataServer, withController } from "../lib/index"
import { randomPort } from './utils/randomPort';
import * as req from 'request-promise';
import { Server } from 'http';

/**
 * check server ready and return listening port
 * @param s server
 */
const ready = (s: Server): Promise<number> => {
  return new Promise((resolve, reject) => {
    s.once('listening', () => {
      resolve(s.address()['port'])
    })
    s.once('error', reject)
  })
}

const shutdown = (s: Server): Promise<void> => {
  return new Promise(resolve => s.close(resolve))
}

describe('Typeorm Integration Test Suite', () => {

  // @ts-ignore
  const createTmpConnection = (opt?: Partial<ConnectionOptions>) => createConnection({
    name: "default",
    type: "sqlite",
    database: ":memory:",
    synchronize: true,
    // logging: true,
    ...opt
  })

  it('should support CRUD by repository', async () => {

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

    await tmpRepo.save({ id: 2, desc: "123" })

    expect(await tmpRepo.findOne({ id: 2 })).not.toBeUndefined()

    @odata.type(Product)
    @odata.entitySet("Products")
    @withConnection(async () => tmpConn)
    class C4 extends ORMController<Product> {

      @odata.GET
      async findOne(@odata.key key) {
        const i = await tmpRepo.findOne(key)
        return i
      }

      @odata.POST
      async create(@odata.body body: Partial<Product>) {
        return await tmpRepo.save(body)
      }

    }

    @withController(C4)
    class CC extends ODataServer { }

    const server = CC.create(randomPort())

    const port = await ready(server)

    let res = await req.post(`http://127.0.0.1:${port}/Products`, { json: { id: 1, desc: "description" } })

    expect(res['@odata.id']).not.toBeUndefined()

    const v = await tmpRepo.findOne(1)

    expect(v).not.toBeUndefined()

    res = await req.get(`http://127.0.0.1:${port}/Products(1)`, { json: true })
    expect(res['desc']).toEqual('description')

    await shutdown(server)
    await tmpConn.close()

  });

});
