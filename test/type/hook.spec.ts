import { inject } from '@newdash/inject';
import '@odata/client/lib/polyfill';
import { isArray } from 'util';
import { BaseHookProcessor, BaseODataModel, beforeCreate, findHooks, HookContext, HookProcessor, HookType, ODataColumn, ODataModel, TypedODataServer, withEntitySetName, withHook } from '../../src';
import { InjectKey } from '../../src/constants';
import { shutdown } from '../utils/server';
import { createServerAndClient, createTmpConnection } from './utils';


describe('Hooks Test Suite', () => {


  it('should register hooks', () => {

    const s1 = class extends TypedODataServer { };

    const t1 = class extends BaseODataModel { };
    const t2 = class extends BaseODataModel { };

    const p1 = new class extends BaseHookProcessor {
      order() {
        return 0;
      }
      support(entityType?: any, hookType?: HookType): boolean {
        return true;
      }
      async execute(ctx: HookContext<any>): Promise<void> {
      }
    };
    const p2 = new class extends BaseHookProcessor {
      order() {
        return 0;
      }
      support(entityType?: any, hookType?: HookType): boolean {
        return true;
      }
      async execute(ctx: HookContext<any>): Promise<void> {
      }
    };
    const p3 = new class extends BaseHookProcessor {
      order() {
        return 0;
      }
      support(entityType?: any, hookType?: HookType): boolean {
        return entityType == t1;
      }
      async execute(ctx: HookContext<any>): Promise<void> {
      }
    };

    const p4 = class extends BaseHookProcessor {
      order() {
        return 1;
      }
      support(entityType?: any, hookType?: HookType): boolean {
        return entityType == t2;
      }
      execute(ctx: HookContext<any>): Promise<void> {
        throw new Error('Method not implemented.');
      }
    };

    const p5 = class extends BaseHookProcessor {
      order() {
        return 2;
      }
      support(entityType?: any, hookType?: HookType): boolean {
        return entityType == t2;
      }
      execute(ctx: HookContext<any>): Promise<void> {
        throw new Error('Method not implemented.');
      }
    };

    withHook(p1)(s1);
    withHook(p2)(s1);
    withHook(p3)(s1);
    withHook(p4)(s1);
    withHook(p5)(s1);

    expect(findHooks(s1, t1, HookType.afterLoad)).toHaveLength(3);

    // ensure order
    expect(
      findHooks(s1, t2, HookType.beforeCreate).map((i) => i?.constructor)
    ).toStrictEqual(
      [
        p1?.constructor,
        p2?.constructor,
        p4,
        p5
      ]
    );

  });

  it('should support hooks process', async () => {

    const DEFAULT_AGE = 18;
    const TEST_USERNAME = 'Theo';

    @ODataModel()
    class Student extends BaseODataModel {

      // generated id
      @ODataColumn({ primary: true, generated: 'increment' })
      id: number;

      @ODataColumn({ nullable: true })
      name: string;

      @ODataColumn({ nullable: true })
      age: number;

    }

    const entities = [Student];

    class Hook1 extends BaseHookProcessor {

      support(entityType?: any, hookType?: HookType): boolean {
        let rt = true;
        if (entityType != undefined && entityType !== Student) {
          rt = false;
        }
        if (hookType != undefined && hookType !== HookType.beforeCreate) {
          rt = false;
        }
        return rt;
      }

      async execute(@inject(InjectKey.HookContext) ctx: HookContext<any>): Promise<void> {
        if (!isArray(ctx.data)) {
          ctx.data.age = DEFAULT_AGE;
        }
      }

    }

    const conn = await createTmpConnection({
      name: 'hook_test_conn',
      entityPrefix: 'odata_server_unit_hook_01_',
      entities
    });

    const { server, client } = await createServerAndClient(conn, Hook1, ...entities);

    const es = client.getEntitySet<Student>('Students');

    await es.create({
      name: TEST_USERNAME
    });

    const u1 = (await es.find({ name: TEST_USERNAME }))[0];

    expect(u1.name).toEqual(TEST_USERNAME);
    expect(u1.age).toEqual(DEFAULT_AGE);

    await shutdown(server);

  });

  it('should support register hook by decorator', async () => {

    const DEFAULT_AGE = 18;
    const TEST_USERNAME = 'Theo';

    @ODataModel()
    class Student extends BaseODataModel {

      // generated id
      @ODataColumn({ primary: true, generated: 'increment' })
      id: number;

      @ODataColumn({ nullable: true })
      name: string;

      @ODataColumn({ nullable: true })
      age: number;

    }

    const entities = [Student];

    @beforeCreate(Student)
    class BeforeStudentCreationHook extends HookProcessor<Student> {

      async execute(@inject(InjectKey.HookContext) ctx: HookContext<Student>): Promise<void> {
        ctx.data.age = DEFAULT_AGE;
      }

    }

    const conn = await createTmpConnection({
      name: 'hook_class_test_conn',
      entityPrefix: 'odata_server_unit_hook_02_',
      entities
    });

    const { server, client } = await createServerAndClient(conn, BeforeStudentCreationHook, ...entities);

    const es = client.getEntitySet<Student>('Students');

    await es.create({ name: TEST_USERNAME });

    const u1 = (await es.find({ name: TEST_USERNAME }))[0];

    expect(u1.name).toEqual(TEST_USERNAME);
    expect(u1.age).toEqual(DEFAULT_AGE);

    await shutdown(server);

  });

  it('should integrated with transaction', async () => {


    @ODataModel()
    @withEntitySetName('Students2')
    class Student2 extends BaseODataModel {

      // generated id
      @ODataColumn({ primary: true, generated: 'increment' })
      id2: number;

      @ODataColumn({ nullable: true })
      name2: string;

      @ODataColumn({ nullable: true })
      age2: number;

    }

    @ODataModel()
    @withEntitySetName('Students3')
    class Student3 extends BaseODataModel {

      // generated id
      @ODataColumn({ primary: true, generated: 'increment' })
      id2: number;

      @ODataColumn({ nullable: true })
      name2: string;

      @ODataColumn({ nullable: true })
      age2: number;

    }

    const entities = [Student2, Student3];

    const hookInvokeSeq = [];

    @beforeCreate(Student2, 0)
    class h1 extends HookProcessor<Student2> {

      async execute(@inject(InjectKey.HookContext) ctx: HookContext<Student2>): Promise<void> {
        hookInvokeSeq.push('h1');
        const student3s = await ctx.getService(Student3);

        await student3s.create({ name2: 'first' });
      }

    }


    @beforeCreate(Student2, 1)
    class h2 extends HookProcessor<Student2> {

      async execute(): Promise<void> {
        hookInvokeSeq.push('h2');
        throw new Error('something wrong!');
      }

    }

    const conn = await createTmpConnection({
      name: 'hook_class_tx_conn',
      entityPrefix: 'odata_server_unit_hook_03_',
      entities
    });

    const { server, client } = await createServerAndClient(conn, h1, h2, ...entities);

    const es = client.getEntitySet<Student2>('Students2');

    await expect(async () => { await es.create({ name2: 'second' }); }).rejects.toThrowError('something wrong!');

    const count = await es.count();

    // nothing should be created
    expect(count).toBe(0);

    // assert running order of hooks
    expect(hookInvokeSeq).toStrictEqual(['h1', 'h2']);

    await shutdown(server);

  });

});


