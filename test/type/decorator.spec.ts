import { BaseODataModel, createPropertyDecorator, getODataColumns, getPropertyOptions, getValidateOptions, isODataEntityType, KeyProperty, ODataEntityType, ODataModel, OptionalProperty, Property, UUIDKeyProperty, Validate } from '../../src';
import { createServerAndClient } from './utils';


describe('Decorator Test Suite', () => {

  it('should create custom decorators', () => {

    const OptionalProperty = createPropertyDecorator({ nullable: true });

    @ODataEntityType()
    class D1 extends BaseODataModel {

      @KeyProperty({ generated: 'increment' })
      key: number;

      @OptionalProperty()
      c1: number;

      @Property()
      c2: number;

    }

    expect(getPropertyOptions(D1, 'key').primary).toBeTruthy();
    expect(getPropertyOptions(D1, 'c1').nullable).toBeTruthy();
    expect(getPropertyOptions(D1, 'c2').nullable).toBeFalsy();

  });

  it('should support custom the database name for property', async () => {

    @ODataEntityType()
    class D2 extends BaseODataModel {

      @UUIDKeyProperty()
      key: number;

      // define property name in database
      @OptionalProperty({ name: 'cc2' })
      c1: number;

    }

    const { server, client, shutdownServer } = await createServerAndClient({
      name: 'decorator_test_conn_',
      entityPrefix: 'decorator_test_02_',
      entities: [D2]
    }, D2);

    try {
      const es = client.getEntitySet<D2>('D2s');
      await es.create({ c1: 123 });
      await es.query(client.newParam().select('c1')); // please no error here
    } finally {
      await shutdownServer();
    }


  });

  it('should support get odata columns for entities', () => {

    class A {
      @Property({}) a: number;
      @Property({}) b: string;
      @Property({ type: 'nvarchar' }) c: string;

    }
    const entityProps = getODataColumns(A);

    expect(entityProps).toHaveLength(3);
    expect(entityProps[0].reflectType).toBe(Number);
    expect(entityProps[1].reflectType).toBe(String);
    expect(entityProps[2].type).toBe('nvarchar');


    expect(getODataColumns(new A)).toHaveLength(3);

    expect(isODataEntityType(class C { })).toBeFalsy();
    expect(isODataEntityType(A)).toBeTruthy();
    expect(isODataEntityType(new A)).toBeTruthy();


  });

  it('should add @Validate to entity', () => {

    @ODataModel()
    class A {

      @UUIDKeyProperty()
      id: string;

      @Validate({
        format: { pattern: /^\d+$/, message: 'number only' }
      })
      @OptionalProperty()
      name: string;

    }

    let opt = getValidateOptions(new A, 'name');

    expect(opt).not.toBeUndefined();
    expect(opt.format).not.toBeUndefined();
    expect(opt.format.pattern).not.toBeUndefined();

    opt = getValidateOptions(A, 'name');

    expect(opt).not.toBeUndefined();
    expect(opt.format).not.toBeUndefined();
    expect(opt.format.pattern).not.toBeUndefined();


  });


});
