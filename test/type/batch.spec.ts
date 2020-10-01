// @ts-nocheck
import { DeepPartial } from '@newdash/newdash';
import { BatchRequestOptionsV4 } from '@odata/client';
import { ODataMethod } from '@odata/parser';
import { v4 } from 'uuid';
import { IncKeyProperty, KeyProperty, ODataModel, OptionalProperty } from '../../src';
import { ERROR_BATCH_REQUEST_FAST_FAIL } from '../../src/messages';
import { groupDependsOn } from '../../src/middlewares';
import { createServerAndClient, createTmpConnection } from './utils';


describe('Batch Test Suite', () => {

  it('should raise error when payload wrong', async () => {

    @ODataModel()
    class B1 {

      @KeyProperty()
      key: number;

      @OptionalProperty()
      name: string;

      @OptionalProperty()
      age: number;

    }

    const conn = await createTmpConnection({
      name: 'batch_error_test_conn',
      entityPrefix: 'batch_unit_test_01_',
      entities: [B1]
    });

    const { server, client, shutdownServer } = await createServerAndClient(conn, B1);

    try {

      // empty requests
      const requests = [];

      // raise error when no items in batch payload
      await expect(async () => { await client.execBatchRequestsJson(requests); }).rejects.toThrow();

    } finally {
      await shutdownServer();
    }


  });

  it('should share single transaction by default (without atom group)', async () => {

    @ODataModel()
    class B2 {

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
      entityPrefix: 'batch_unit_test_02_',
      entities: [B2]
    });

    const { server, client, shutdownServer } = await createServerAndClient(conn, B2);

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
      await shutdownServer();
    }

  });


  it('should support fast failed', async () => {

    @ODataModel()
    class B3 {

      @KeyProperty({ generated: 'increment' })
      key: number;

      @OptionalProperty({ unique: true })
      name: string;

      @OptionalProperty()
      age: number;

    }

    const testName = v4();
    const testName2 = v4();

    const conn = await createTmpConnection({
      name: 'batch_fast_fail_test_conn',
      entityPrefix: 'batch_unit_test_03_',
      entities: [B3]
    });

    const { client, shutdownServer } = await createServerAndClient(conn, B3);

    try {

      const es = client.getEntitySet<B3>('B3s');

      const requests = [
        es.batch().create({ name: testName }),
        es.batch().create({ name: testName }),
        es.batch().create({ name: testName2 })
      ];

      // with fast fail header
      // @ts-ignore
      client.commonHeader['continue-on-error'] = 'false';

      const responses = await client.execBatchRequestsJson(requests);

      expect(responses).toHaveLength(3);

      // first request should success
      expect(responses[0].status).toBe(201);
      // second request should be failed, because the name have the unique constraint
      expect(responses[1].status).toBe(500);
      // fast fail, even this request could be processed
      expect(responses[2].status).toBe(500);
      // fast fail error message
      expect((await responses[2].json()).error.message).toBe(ERROR_BATCH_REQUEST_FAST_FAIL);


      const items = await es.find({ name: testName });
      // no items should be created
      // whole batch request will be put into 'default' atom group by default (without the parameter)
      // and each atom group will share single batch request
      // and rollback when any errors occurs
      expect(items).toHaveLength(0);

    } finally {
      await shutdownServer();
    }

  });

  it('should support order by dependsOn', () => {

    const groups = groupDependsOn([
      { id: '0', method: ODataMethod.GET, url: '/' },
      { id: '1', method: ODataMethod.GET, url: '/', dependsOn: ['0'] },
      { id: '2', method: ODataMethod.GET, url: '/', dependsOn: ['0'] },
      { id: '3', method: ODataMethod.GET, url: '/', dependsOn: ['2'] }
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].map((req) => req.id)).toStrictEqual(['0', '1', '2', '3']);

    const groups2 = groupDependsOn([
      { id: '0', method: ODataMethod.GET, url: '/' },
      { id: '1', method: ODataMethod.GET, url: '/', dependsOn: ['0'] },
      { id: '2', method: ODataMethod.GET, url: '/', dependsOn: ['0'] },
      { id: '3', method: ODataMethod.GET, url: '/', dependsOn: ['2'] },
      { id: '4', method: ODataMethod.GET, url: '/' },
      { id: '5', method: ODataMethod.GET, url: '/', dependsOn: ['6'] },
      { id: '6', method: ODataMethod.GET, url: '/', dependsOn: ['4'] }
    ]);

    expect(groups2).toHaveLength(2);
    expect(groups2[0].map((req) => req.id)).toStrictEqual(['0', '1', '2', '3']);
    expect(groups2[1].map((req) => req.id)).toStrictEqual(['4', '6', '5']);


    expect(() => groupDependsOn([
      { id: '0', method: ODataMethod.GET, url: '/', dependsOn: ['4'] },
      { id: '1', method: ODataMethod.GET, url: '/', dependsOn: ['0'] },
      { id: '2', method: ODataMethod.GET, url: '/', dependsOn: ['1'] },
      { id: '3', method: ODataMethod.GET, url: '/', dependsOn: ['2'] },
      { id: '4', method: ODataMethod.GET, url: '/', dependsOn: ['3'] }
    ])).toThrowError('found cycle dependsOn in requests [1->2->3->4->0->1]');

  });

  it('should support dependsOn requests', async () => {

    @ODataModel()
    class DependsOnModel {
      @IncKeyProperty() key: number;
      @OptionalProperty() num: number;
    }

    const conn = await createTmpConnection({
      name: 'batch_c_04',
      entities: [DependsOnModel]
    });

    const { client, shutdownServer } = await createServerAndClient(conn);

    try {

      let idx = -1;
      function createRequest(req?: DeepPartial<BatchRequestOptionsV4<DependsOnModel>>) {
        idx++;
        return client.newBatchRequest(Object.assign({}, {
          requestId: idx.toString(), method: 'POST',
          collection: 'DependsOnModels',
          entity: { num: idx }
        }, req) as BatchRequestOptionsV4<DependsOnModel>);
      }

      const requests = [
        createRequest(),
        createRequest({ dependsOn: ['2'] }),
        createRequest({ dependsOn: ['0'] })
      ];

      const resHeaders = await Promise.all((await client.execBatchRequestsJson(requests)).map((res) => res.headers));

      expect(resHeaders).toHaveLength(3);

      expect(resHeaders).toMatchObject([
        { 'x-batch-request-id': '0' },
        { 'x-batch-request-id': '2' }, // run the third request before the second request
        { 'x-batch-request-id': '1' }
      ]);

      // duplicate request id
      const requests2 = [
        createRequest({ requestId: '1' }),
        createRequest({ requestId: '1' })
      ];
      await expect(() => client.execBatchRequestsJson(requests2)).rejects.toThrowError('request id [1] is duplicate');


      // dependsOn not exist
      const requests3 = [
        createRequest({ requestId: '1', dependsOn: ['3'] }),
        createRequest({ requestId: '2', dependsOn: ['2'] })
      ];
      await expect(() => client.execBatchRequestsJson(requests3)).rejects.toThrowError('request [1] dependsOn [3] not existed in atom group [default]');

      // cycle dependsOn
      const requests4 = [
        createRequest({ requestId: '1', dependsOn: ['2'] }),
        createRequest({ requestId: '2', dependsOn: ['4'] }),
        createRequest({ requestId: '4', dependsOn: ['1'] })
      ];

      await expect(() => client.execBatchRequestsJson(requests4)).rejects.toThrowError('found cycle dependsOn in requests [4->2->1->4]');


      // dependsOn another atom group request
      const requests5 = [
        createRequest({ requestId: '1', dependsOn: ['2'], atomicityGroup: '1' }),
        createRequest({ requestId: '2', dependsOn: ['4'], atomicityGroup: '1' }),
        createRequest({ requestId: '4', atomicityGroup: '1' }),
        createRequest({ requestId: '6', dependsOn: ['2'], atomicityGroup: '2' })
      ];

      await expect(() => client.execBatchRequestsJson(requests5)).rejects.toThrowError('request [6] dependsOn [2] not existed in atom group [2]');


    } finally {
      await shutdownServer();
    }

  });

});
