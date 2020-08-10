import { v4 } from 'uuid';
import { BaseODataModel, KeyProperty, ODataEntityType, OptionalProperty } from '../../src';
import { shutdown } from '../utils/server';
import { createServerAndClient, createTmpConnection } from './utils';


describe('Batch Test Suite', () => {

  it('should raise error when payload wrong', async () => {

    @ODataEntityType()
    class B1 extends BaseODataModel {

      @KeyProperty()
      key: number;

      @OptionalProperty()
      name: string;

      @OptionalProperty()
      age: number;

    }

    const conn = await createTmpConnection({
      name: 'batch_error_test_conn',
      entityPrefix: 'batch_unit_test_01',
      entities: [B1]
    });

    const { server, client } = await createServerAndClient(conn, B1);

    try {

      // empty requests
      const requests = [];

      // raise error when no items in batch payload
      await expect(async () => { await client.execBatchRequestsJson(requests); }).rejects.toThrow();

    } finally {
      await shutdown(server);
    }


  });

  it('should share single transaction by default (without atom group)', async () => {

    @ODataEntityType()
    class B2 extends BaseODataModel {

      @KeyProperty({ generated: 'increment' })
      key: number;

      @OptionalProperty({ unique: true })
      name: string;

      @OptionalProperty()
      age: number;

    }

    const testName = v4();

    const conn = await createTmpConnection({
      name: 'batch_transaction_test_conn',
      entityPrefix: 'batch_unit_test_02',
      entities: [B2]
    });

    const { server, client } = await createServerAndClient(conn, B2);

    try {

      const es = client.getEntitySet<B2>('B2s');

      const requests = [
        es.batch().create({ name: testName }),
        es.batch().create({ name: testName })
      ];

      const responses = await client.execBatchRequestsJson(requests);

      expect(responses).toHaveLength(2);
      // first request should success
      expect(responses[0].status).toBe(201);
      // second request should be failed, because the name have the unique constraint
      expect(responses[1].status).toBe(500);

      const items = await es.find({ name: testName });
      // no items should be created
      // whole batch request will be put into 'default' atom group by default (without the parameter)
      // and each atom group will share single batch request
      // and rollback when any errors occurs
      expect(items).toHaveLength(0);

    } finally {
      await shutdown(server);
    }

  });

});
