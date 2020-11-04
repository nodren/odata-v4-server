import { lazyRef } from '@newdash/inject';
import { ODataFilter } from '@odata/parser';
import BigNumber from 'bignumber.js';
import { Edm, InjectedTypedService, KeyProperty, ODataAction, ODataFunction, ODataModel, oInject, OptionalProperty, Property, UUIDKeyProperty, withEntitySetName } from '../../src';
import { createServerAndClient, createTmpConnection } from './utils';


describe('Entity Type Test Suite', () => {

  it('should return value in consistence', async () => {

    @ODataModel()
    class TestProposal1 {

      @UUIDKeyProperty()
      id: string;
      @Property()
      voltageLevel: string;
      @Property({ type: 'decimal', precision: 12, scale: 2 })
      energyFee: BigNumber;
      @Property()
      funds: boolean;
      @Property({ type: 'date' })
      endDate: string;

    }

    const conn = await createTmpConnection({
      name: 'entity_t_01',
      entities: [TestProposal1]
    });

    const { client, shutdownServer } = await createServerAndClient(conn, TestProposal1);

    try {

      const set = client.getEntitySet<TestProposal1>('TestProposal1s');
      const testObject: Partial<TestProposal1> = {
        endDate: '2020-09-03',
        funds: true,
        energyFee: new BigNumber('33.99'), // will be stringify as '33.99'
        voltageLevel: 'test2'
      };
      const cTestObject = JSON.parse(JSON.stringify(testObject));
      const created = await set.create(testObject);
      expect(created).toMatchObject(cTestObject);

      const [findObj1] = await set.query();
      expect(findObj1).toMatchObject(cTestObject);

      const retrieved1 = await set.retrieve(created.id);
      expect(retrieved1).toMatchObject(cTestObject);


    } finally {
      await shutdownServer();
    }


  });

  it('should support inject service into action/function', async () => {

    @withEntitySetName('As')
    @ODataModel()
    class ActionRefObject {
      @KeyProperty() id: string;
      @Property() value: string;
    }

    @withEntitySetName('Zs')
    @ODataModel()
    class ActionFunctionEntity {
      @UUIDKeyProperty() id: string;

      @ODataAction
      @Edm.ReturnType(Edm.ComplexType(Edm.ForwardRef(() => ActionRefObject)))
      async doSomething(
        @oInject.body body,
        @oInject.service(lazyRef(() => ActionRefObject)) aService: InjectedTypedService<ActionRefObject>
      ) {
        return await aService.create({ id: this.id, value: body.value });
      }

      @ODataFunction
      @Edm.ReturnType(Edm.Collection(Edm.ComplexType(Edm.ForwardRef(() => ActionRefObject))))
      async querySomething(
        @Edm.ParameterType(Edm.String) id,
        @oInject.service(lazyRef(() => ActionRefObject)) aService: InjectedTypedService<ActionRefObject>
      ) {
        const items = await aService.find(ODataFilter.New({ id }));
        return items;
      }

    }

    const conn = await createTmpConnection({
      name: 'entity_test_conn_02',
      entityPrefix: 'entity_test_02',
      entities: [ActionRefObject, ActionFunctionEntity]
    });

    const { client, shutdownServer } = await createServerAndClient(conn);

    try {
      const actions = client.getEntitySet<ActionFunctionEntity>('Zs');
      const refs = client.getEntitySet<ActionRefObject>('As');
      const testValue = 'test value';
      const z1 = await actions.create({});
      expect(z1).not.toBeUndefined();

      const actionResult = await actions.action('Default.doSomething', z1.id, { value: testValue });
      expect(actionResult).not.toBeUndefined();
      expect(actionResult.value).toBe(testValue);

      const refItems = await refs.query();
      expect(refItems).toHaveLength(1);

      const funcResult = await actions.function('Default.querySomething', z1.id, { id: z1.id });
      expect(funcResult.value).toHaveLength(1);
      expect(funcResult.value[0].value).toBe(testValue);

    } finally {
      await shutdownServer();
    }


  });

  it('should support enum types as column', async () => {

    enum ValueType1 {
      v1 = 1,
      v2 = 3
    }
    enum ValueType2 {
      v1 = '1',
      v2 = '3'
    }

    @withEntitySetName('EnumEntities')
    @ODataModel()
    class EnumEntity {

      @UUIDKeyProperty() id: string;
      @OptionalProperty({ enumValues: ValueType1 }) t1: ValueType1
      @OptionalProperty({ enumValues: ValueType2 }) t2: ValueType2

      @OptionalProperty({ enumValues: ['v1', 'v2'] }) t3: string
      @OptionalProperty() t4: ValueType2 // without enum parameter, will no verify

    }

    const conn = await createTmpConnection({
      name: 'entity_test_03',
      entityPrefix: 'entity_test_03',
      entities: [EnumEntity]
    });

    const { client, shutdownServer } = await createServerAndClient(conn);

    try {

      const set = client.getEntitySet<EnumEntity>('EnumEntities');
      await set.create({ t1: ValueType1.v1, t2: ValueType2.v2 });
      await set.create({ t1: ValueType1.v2, t2: ValueType2.v1 });

      await set.create({ t4: '123' });
      await set.create({ t4: '456' });

      await expect(() => set.create({ t1: 5, t2: '124' }))
        .rejects
        .toThrow("property 't1' value '5' is not in enum values, property 't2' value '124' is not in enum values");
      await expect(() => set.create({ t3: '123123' }))
        .rejects
        .toThrow("property 't3' value '123123' is not in enum values");
    } finally {
      await shutdownServer();
    }
  });

});
