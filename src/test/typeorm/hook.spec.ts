import { OData } from 'light-odata';
import "light-odata/lib/polyfill";
import { Connection } from 'typeorm';
import { isArray } from 'util';
import { BaseHookProcessor, BaseODataModel, beforeCreate, createHookProcessor, createTypedODataServer, findHooks, HookContext, HookProcessor, HookType, ODataColumn, ODataEntitySetName, ODataModel, registerHook } from "../../lib";
import { randomPort } from '../utils/randomPort';
import { ready, shutdown } from '../utils/server';
import { createTmpConnection } from './utils';


describe('Hooks Test Suite', () => {

  const createServerAndClient = async (connection: Connection, ...entities: any[]) => {

    const s = await createTypedODataServer(connection.name, ...entities)
    const httpServer = s.create(randomPort())
    const port = await ready(httpServer)
    const client = OData.New4({ metadataUri: `http://127.0.0.1:${port}/$metadata`, processCsrfToken: false })

    return {
      server: httpServer,
      client
    }

  }

  it('should register hooks', () => {

    const t1 = class extends BaseODataModel { }
    const t2 = class extends BaseODataModel { }

    const p1 = createHookProcessor(async (ctx) => { })
    const p2 = createHookProcessor(async (ctx) => { })
    const p3 = createHookProcessor(async (ctx) => { }, t1)

    const p4 = class extends BaseHookProcessor {
      order() {
        return 1
      }
      support(entityType?: any, hookType?: HookType): boolean {
        return entityType == t2
      }
      execute(ctx: HookContext<any>): Promise<void> {
        throw new Error("Method not implemented.");
      }
    }

    const p5 = class extends BaseHookProcessor {
      order() {
        return 2
      }
      support(entityType?: any, hookType?: HookType): boolean {
        return entityType == t2
      }
      execute(ctx: HookContext<any>): Promise<void> {
        throw new Error("Method not implemented.");
      }
    }

    registerHook(p1)
    registerHook(p2)
    registerHook(p3)
    registerHook(p4)
    registerHook(p5)

    expect(findHooks(t1, HookType.afterLoad)).toHaveLength(3)

    // ensure order
    expect(
      findHooks(t2, HookType.beforeCreate).map(i => i?.constructor)
    ).toStrictEqual(
      [
        p1?.constructor,
        p2?.constructor,
        p4,
        p5
      ]
    )

  });

  it('should support hooks process', async () => {

    const DEFAULT_AGE = 18
    const TEST_USERNAME = "Theo";

    @ODataModel()
    class Student extends BaseODataModel {

      // generated id
      @ODataColumn({ primary: true, generated: "increment" })
      id: number;

      @ODataColumn({ nullable: true })
      name: string;

      @ODataColumn({ nullable: true })
      age: number;

    }

    const entities = [Student]

    registerHook(
      createHookProcessor(
        async ({ data }) => { if (!isArray(data)) { data.age = DEFAULT_AGE } },
        Student,
        HookType.beforeCreate,
      )
    )

    const conn = await createTmpConnection({
      name: "hook_test_conn",
      entities
    })

    const { server, client } = await createServerAndClient(conn, ...entities)

    const es = client.getEntitySet<Student>("Students")

    await es.create({
      name: TEST_USERNAME
    })

    const u1 = (await es.find({ name: TEST_USERNAME }))[0]

    expect(u1.name).toEqual(TEST_USERNAME)
    expect(u1.age).toEqual(DEFAULT_AGE)

    await shutdown(server)

  });

  it('should support register hook by decorator', async () => {

    const DEFAULT_AGE = 18
    const TEST_USERNAME = "Theo";

    @ODataModel()
    class Student extends BaseODataModel {

      // generated id
      @ODataColumn({ primary: true, generated: "increment" })
      id: number;

      @ODataColumn({ nullable: true })
      name: string;

      @ODataColumn({ nullable: true })
      age: number;

    }

    const entities = [Student]

    @beforeCreate(Student)
    class BeforeStudentCreationHook extends HookProcessor<Student> {

      async execute(ctx: HookContext<Student>): Promise<void> {
        ctx.data.age = DEFAULT_AGE
      }

    }

    registerHook(BeforeStudentCreationHook)

    const conn = await createTmpConnection({
      name: "hook_class_test_conn",
      entities
    })

    const { server, client } = await createServerAndClient(conn, ...entities)

    const es = client.getEntitySet<Student>("Students")

    await es.create({ name: TEST_USERNAME })

    const u1 = (await es.find({ name: TEST_USERNAME }))[0]

    expect(u1.name).toEqual(TEST_USERNAME)
    expect(u1.age).toEqual(DEFAULT_AGE)

    await shutdown(server)

  });

  it('should integrated with transaction', async () => {


    @ODataModel()
    @ODataEntitySetName("Students2")
    class Student2 extends BaseODataModel {

      // generated id
      @ODataColumn({ primary: true, generated: "increment" })
      id2: number;

      @ODataColumn({ nullable: true })
      name2: string;

      @ODataColumn({ nullable: true })
      age2: number;

    }

    const entities = [Student2]

    const hookInvokeSeq = []

    const h1 = createHookProcessor(async (ctx) => {
      hookInvokeSeq.push('h1')
      ctx.em.getRepository(Student2).save({ name2: "first" })
    }, Student2, HookType.beforeCreate, 0)

    const h2 = createHookProcessor(async (ctx) => {
      hookInvokeSeq.push('h2')
      throw new Error("something wrong!")
    }, Student2, HookType.beforeCreate, 1)

    registerHook(h1)
    registerHook(h2)

    const conn = await createTmpConnection({
      name: "hook_class_tx_conn",
      entities
    })

    const { server, client } = await createServerAndClient(conn, ...entities)

    const es = client.getEntitySet<Student2>("Students2")

    await expect(async () => { await es.create({ name2: "second" }) }).rejects.toThrowError("something wrong!")

    const count = await es.count()

    // nothing should be created
    expect(count).toBe(0)

    // assert running order of hooks
    expect(hookInvokeSeq).toStrictEqual(['h1', 'h2'])

    await shutdown(server)

  });

});


