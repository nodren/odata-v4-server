import { BaseODataModel, KeyProperty, ODataEntityType, ODataNavigation, OptionalProperty } from '../../src';
import { createServerAndClient, createTmpConnection } from './utils';


describe('Validate Test Suite', () => {

  it('should raise error on entity without key', async () => {

    @ODataEntityType()
    class V1 extends BaseODataModel {


      @OptionalProperty({ unique: true })
      name: string;

      @OptionalProperty()
      age: number;

    }

    await expect(() => createServerAndClient({
      name: 'validate_test_conn',
      entityPrefix: 'validate_unit_test_01',
      entities: [V1]
    }, V1)).rejects.toThrow();

  });

  it('should raise error on entity with multi key', async () => {

    @ODataEntityType()
    class V2 extends BaseODataModel {

      @KeyProperty()
      key1: string;

      @KeyProperty()
      key2: string;

      @OptionalProperty({ unique: true })
      name: string;

      @OptionalProperty()
      age: number;

    }

    const conn = await createTmpConnection({
      name: 'validate_test_conn_2',
      entityPrefix: 'validate_02',
      entities: [V2]
    });

    await expect(() => createServerAndClient(conn, V2)).rejects.toThrow();

  });

  it('should raise error on entity with undefined fk', async () => {

    @ODataEntityType()
    class V4 extends BaseODataModel {

      @KeyProperty()
      key: string;

    }

    @ODataEntityType()
    class V3 extends BaseODataModel {

      @KeyProperty()
      key: string;

      @ODataNavigation({ foreignKey: 'any', type: 'ManyToOne', entity: () => V4 })
      v4: any;

    }


    const conn = await createTmpConnection({
      name: 'validate_test_conn_3',
      entityPrefix: 'validate_unit_test_03',
      entities: [V3, V4]
    });

    await expect(async () => createServerAndClient(conn, V3, V4)).rejects.toThrow();

  });

  it('should raise error on entity with wrong input for decorator', async () => {


    @ODataEntityType()
    class V5 extends BaseODataModel {

      @KeyProperty()
      key: string;

      // @ts-ignore
      @ODataNavigation({ foreignKey: 'any', type: 'ManyToOne' })
      v4: any;

    }
    const conn = await createTmpConnection({
      name: 'validate_test_conn_4',
      entityPrefix: 'validate_unit_test_04',
      entities: [V5]
    });

    await expect(async () => createServerAndClient(conn, V5)).rejects.toThrow();

    @ODataEntityType()
    class V6 extends BaseODataModel {

      @KeyProperty()
      key: string;

      // @ts-ignore
      @ODataNavigation({ foreignKey: 'any', type: 'ManyToOne', type: '' })
      v4: any;

    }

    await expect(async () => createServerAndClient(conn, V6)).rejects.toThrow();


  });

  it('should raise error on entity with undefined fk for external entity', async () => {

    @ODataEntityType()
    class V8 extends BaseODataModel {

      @KeyProperty()
      key: string;

    }

    @ODataEntityType()
    class V7 extends BaseODataModel {

      @KeyProperty()
      key: string;

      // @ts-ignore
      @ODataNavigation({ targetForeignKey: 'v7key', type: 'OneToMany', entity: () => V8 })
      v8: any;

    }


    const conn = await createTmpConnection({
      name: 'validate_test_conn_6',
      entityPrefix: 'validate_unit_test_06',
      entities: [V7, V8]
    });

    await expect(async () => createServerAndClient(conn, V7, V8)).rejects.toThrow();

  });


});
