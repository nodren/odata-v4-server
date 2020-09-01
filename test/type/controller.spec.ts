import { inject } from '@newdash/inject';
import { ODataFilter, ODataParam } from '@odata/parser';
import { v4 } from 'uuid';
import { BaseODataModel, beforeCreate, HookContext, HookProcessor, ODataColumn, ODataModel } from '../../src';
import { InjectKey } from '../../src/constants';
import { shutdown } from '../utils/server';
import { createServerAndClient, createTmpConnection } from './utils';


describe('Typed Controller Test Suite', () => {

  it('should support call service from hook', async () => {

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

    const testUserName = `theo_${v4()}`;

    const conn = await createTmpConnection({
      name: 'controller_call_test_conn',
      entityPrefix: 'unit_controller_01_',
      entities
    });

    @beforeCreate(A1)
    class BeforeA1CreationHook extends HookProcessor<A1> {

      async execute(@inject(InjectKey.HookContext) hookCtx: HookContext<A1>): Promise<void> {

        const service = await hookCtx.getService(A2);
        const items = await service.find(
          ODataParam.New().filter(ODataFilter.New().field('name').eq(testUserName))
        );

        if (items.length > 0) {
          // overwrite A1 value by A2 with same name
          hookCtx.data.desc = items[0].desc;
        }

      }
    }

    const expectedDescription = v4();

    const { server, client } = await createServerAndClient(conn, BeforeA1CreationHook, ...entities);

    const esA1 = client.getEntitySet<A1>('A1s');
    const esA2 = client.getEntitySet<A2>('A2s');

    const instanceA1 = await esA2.create({ name: testUserName, desc: expectedDescription });
    const instanceA2 = await esA1.create({ name: testUserName });

    const items = await esA1.find({ name: testUserName });

    // expect A1.student[theo].desc has been copied from A2.student[theo].desc
    expect(items[0].desc).toBe(expectedDescription);

    // clean
    await esA1.delete(instanceA1.id);
    await esA2.delete(instanceA2.id);

    await shutdown(server);

  });

});
