import { ODataModel, OptionalProperty, UUIDKeyProperty } from '../../src';
import { Class, SchoolEntities } from './school_model';
import { createServerAndClient, createTmpConnection } from './utils';


describe('server query result Test Suite', () => {


  it('should support $orderby', async () => {
    const conn = await createTmpConnection({
      name: 's_query_conn_1',
      entities: SchoolEntities
    });

    const { client, shutdownServer } = await createServerAndClient(conn);

    try {
      const classes = client.getEntitySet<Class>('Classes');
      const c1 = await classes.create({ cid: 1, name: 'c1', desc: 'class1' });
      const c2 = await classes.create({ cid: 2, name: 'c2', desc: 'class2' });
      const r1 = await classes.query(client.newParam().orderby('cid', 'desc'));
      expect(r1.map((item) => item.cid)).toMatchObject([c2.cid, c1.cid]);
      const r2 = await classes.query(client.newParam().orderby('cid', 'asc'));
      expect(r2.map((item) => item.cid)).toMatchObject([c1.cid, c2.cid]);

    } finally {
      await shutdownServer();
    }

  });

  it('should support $orderby multi parameters', async () => {


    @ODataModel()
    class ODBModel {
      @UUIDKeyProperty() key: string;
      @OptionalProperty() c1: number;
      @OptionalProperty() c2: number;
    }

    const conn = await createTmpConnection({
      name: 's_query_conn_2',
      entities: [ODBModel]
    });

    const { client, shutdownServer } = await createServerAndClient(conn);

    try {
      const es = client.getEntitySet<ODBModel>('ODBModels');
      const o1 = await es.create({ c1: 1, c2: 1 });
      const o2 = await es.create({ c1: 1, c2: 2 });
      const o3 = await es.create({ c1: 2, c2: 1 });
      const o4 = await es.create({ c1: 2, c2: 2 });

      const r1 = await es.query(client.newParam().orderbyMulti([
        { field: 'c1', order: 'asc' },
        { field: 'c2', order: 'asc' }
      ]));

      expect(r1.map((item) => item.key)).toMatchObject([
        o1.key,
        o2.key,
        o3.key,
        o4.key
      ]);

      const r2 = await es.query(client.newParam().orderbyMulti([
        { field: 'c1', order: 'asc' },
        { field: 'c2', order: 'desc' }
      ]));

      expect(r2.map((item) => item.key)).toMatchObject([
        o2.key,
        o1.key,
        o4.key,
        o3.key
      ]);

    } finally {
      await shutdownServer();
    }

  });

});
