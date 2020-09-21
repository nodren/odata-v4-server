import { ODataModel, Property, UUIDKeyProperty } from '../../src';
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
      energyFee: number;
      @Property()
      funds: boolean;
      @Property({ type: 'date' })
      endDate: string;

    }

    const conn = await createTmpConnection({
      name: 'entity_test_conn_01',
      entityPrefix: 'entity_test_01',
      entities: [TestProposal1]
    });

    const { client, shutdownServer } = await createServerAndClient(conn, TestProposal1);

    try {

      const set = client.getEntitySet<TestProposal1>('TestProposal1s');
      const testObject: Partial<TestProposal1> = {
        endDate: '2020-09-03',
        funds: true,
        energyFee: 33.99,
        voltageLevel: 'test2'
      };

      const created = await set.create(testObject);
      expect(created).toMatchObject(testObject);

      const [findObj1] = await set.query();
      expect(findObj1).toMatchObject(testObject);

      const retrieved1 = await set.retrieve(created.id);
      expect(retrieved1).toMatchObject(testObject);


    } finally {
      await shutdownServer();
    }


  });

});
