import { OData } from 'light-odata';
import "light-odata/lib/polyfill";
import { isArray } from 'util';
import { BaseHookProcessor, BaseODataModel, beforeCreate, createHookProcessor, createTypedODataServer, findHooks, HookContext, HookProcessor, HookType, ODataColumn, ODataModel, registerHook } from "../../lib";
import { randomPort } from '../utils/randomPort';
import { ready, shutdown } from '../utils/server';
import { createTmpConnection } from './utils';


describe('Hooks Test Suite', () => {

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

    const s = createTypedODataServer(conn.name, ...entities)
    const httpServer = s.create(randomPort())
    const port = await ready(httpServer)

    const client = OData.New4({ metadataUri: `http://127.0.0.1:${port}/$metadata`, processCsrfToken: false })

    const es = client.getEntitySet<Student>("Students")

    await es.create({
      name: TEST_USERNAME
    })

    const u1 = (await es.find({ name: TEST_USERNAME }))[0]

    expect(u1.name).toEqual(TEST_USERNAME)
    expect(u1.age).toEqual(DEFAULT_AGE)

    await shutdown(httpServer)

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

    const s = createTypedODataServer(conn.name, ...entities)
    const httpServer = s.create(randomPort())
    const port = await ready(httpServer)

    const client = OData.New4({ metadataUri: `http://127.0.0.1:${port}/$metadata`, processCsrfToken: false })

    const es = client.getEntitySet<Student>("Students")

    await es.create({
      name: TEST_USERNAME
    })

    const u1 = (await es.find({ name: TEST_USERNAME }))[0]

    expect(u1.name).toEqual(TEST_USERNAME)
    expect(u1.age).toEqual(DEFAULT_AGE)

    await shutdown(httpServer)

  });

});


