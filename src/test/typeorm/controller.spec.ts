import { ODataFilter, ODataQueryParam } from '@odata/parser';
import { v4 } from 'uuid';
import { BaseODataModel, beforeCreate, HookContext, HookProcessor, ODataColumn, ODataModel } from '../../lib';
import { shutdown } from '../utils/server';
import { createServerAndClient, createTmpConnection } from './utils';


describe('Typed Controller Test Suite', () => {

  it('should support call controller from hook', async () => {

    @ODataModel()
    class A1 extends BaseODataModel {

      @ODataColumn({ primary: true, generated: 'increment' })
      id: number

      @ODataColumn({ nullable: true })
      name: string

      @ODataColumn({ nullable: true })
      desc: string
    }

    @ODataModel()
    class A2 extends BaseODataModel {

      @ODataColumn({ primary: true, generated: 'increment' })
      id: number

      @ODataColumn({ nullable: true })
      name: string

      @ODataColumn({ nullable: true })
      desc: string
    }

    const entities = [A1, A2];

    const testUserName = 'theo';

    const conn = await createTmpConnection({
      name: 'controller_call_test_conn',
      // logging: true,
      entities
    });

    @beforeCreate(A1)
    class BeforeA1CreationHook extends HookProcessor<A1> {

      async execute(ctx: HookContext<A1>): Promise<void> {

        const ct = ctx.getController(A2);
        const items = await ct.find(
          ODataQueryParam.New().filter(ODataFilter.New().field('name').eq(testUserName)),
          ctx.context
        );

        if (items.length > 0) {
          // overwrite A1 value by A2 with same name
          ctx.data.desc = items[0].desc;
        }

      }
    }

    const expectedDescription = v4();

    const { server, client } = await createServerAndClient(conn, BeforeA1CreationHook, ...entities);

    const esA1 = client.getEntitySet<A1>('A1s');
    const esA2 = client.getEntitySet<A2>('A2s');

    await esA2.create({ name: testUserName, desc: expectedDescription });
    await esA1.create({ name: testUserName });

    const items = await esA1.find({ name: testUserName });

    // expect A1.student[theo].desc has been copied from A2.student[theo].desc
    expect(items[0].desc).toBe(expectedDescription);

    await shutdown(server);

  });

});
