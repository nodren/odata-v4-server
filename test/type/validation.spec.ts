// @ts-nocheck
import { ODataMethod } from '@odata/parser';
import BigNumber from 'bignumber.js';
import { ColumnOptions } from 'typeorm';
import * as validate from 'validate.js';
import { BaseODataModel, columnToValidateRule, EColumnOptions, KeyProperty, ODataEntityType, ODataModel, ODataNavigation, OptionalProperty, Property, UUIDKeyProperty, Validate } from '../../src';
import { createServerAndClient, createTmpConnection, getTestCharDataType } from './utils';


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

  it('should raise error message when validate failed', async () => {

    @ODataModel()
    class ValidationModel1 {
      @UUIDKeyProperty() id: string;
      @Property() name: string;
      @Property() age: number;
      @OptionalProperty() m2Id: string;
      @ODataNavigation({ type: 'OneToOne', entity: () => ValidationModel2, foreignKey: 'm2Id' })
      m2: any
    }

    @ODataModel()
    class ValidationModel2 {
      @UUIDKeyProperty() id: string;
      @Property() name: string;
      @Property() age: number;
    }


    const conn = await createTmpConnection({
      name: 'validate_conn_7',
      entityPrefix: 'val_test_07',
      entities: [ValidationModel1, ValidationModel2]
    });

    const { client, shutdownServer } = await createServerAndClient(conn);

    try {

      const es = client.getEntitySet<ValidationModel1>('ValidationModel1s');
      await expect(() => es.create({ c: 1 })).rejects.toThrow();

      // skip mandatory check for update
      const item = await es.create({ name: '1', age: 11 });
      await es.update(item.id, { age: 12 });

      // check mandatory for deep insert
      await expect(() => es.create({ name: '1', age: 11, m2: { c: 1 } })).rejects.toThrow();

      // pass mandatory check for deep insert
      await es.create({ name: '1', age: 11, m2: { name: '1', age: 13 } });

    } finally {
      await shutdownServer();
    }

  });


  it('should pass full type check for validation', async () => {

    @ODataModel()
    class ValidationString {
      @UUIDKeyProperty() id: string;
      @Property({ type: getTestCharDataType(), length: 10 }) value: string;
    }

    @ODataModel()
    class ValidationFloat {
      @UUIDKeyProperty() id: string;
      @Property({ type: 'float' }) value: BigNumber;
    }

    @ODataModel()
    class ValidationDecimal {
      @UUIDKeyProperty() id: string;
      @Property({ type: 'decimal', precision: 12 }) value: BigNumber;
    }

    @ODataModel()
    class ValidationInteger {
      @UUIDKeyProperty() id: string;
      @Property({ type: 'int' }) value: BigNumber;
    }

    @ODataModel()
    class ValidationDate {
      @UUIDKeyProperty() id: string;
      @Property() value: Date;
    }

    @ODataModel()
    class ValidationBool {
      @UUIDKeyProperty() id: string;
      @Property() value: Boolean;
    }

    const conn = await createTmpConnection({
      name: 'validate_conn_8',
      entityPrefix: 'val_test_08',
      entities: [ValidationString, ValidationFloat, ValidationDecimal, ValidationInteger, ValidationDate, ValidationBool]
    });

    const { client, shutdownServer } = await createServerAndClient(conn);

    try {

      await expect(() => client.getEntitySet('ValidationStrings').create({})).rejects.toThrow();
      await expect(() => client.getEntitySet('ValidationFloats').create({})).rejects.toThrow();
      await expect(() => client.getEntitySet('ValidationDecimals').create({})).rejects.toThrow();
      await expect(() => client.getEntitySet('ValidationIntegers').create({})).rejects.toThrow();
      await expect(() => client.getEntitySet('ValidationDates').create({})).rejects.toThrow();
      await expect(() => client.getEntitySet('ValidationBools').create({})).rejects.toThrow();

      await expect(() => client.getEntitySet('ValidationStrings').create({ value: false })).rejects.toThrow();
      await expect(() => client.getEntitySet('ValidationStrings').create({ id: 1, value: '123' })).rejects.toThrow();
      // length exceed
      await expect(() => client.getEntitySet('ValidationStrings').create({ value: '1234567891011' })).rejects.toThrow();

      await expect(() => client.getEntitySet('ValidationFloats').create({ value: 'abc' })).rejects.toThrow();
      await expect(() => client.getEntitySet('ValidationDecimals').create({ value: 'abc' })).rejects.toThrow();
      // precision exceed
      await expect(() => client.getEntitySet('ValidationDecimals').create(
        { value: '0.123456789101112' })
      ).rejects.toThrow('precision exceed');

      await expect(() => client.getEntitySet('ValidationIntegers').create({ value: 33.99 }))
        .rejects.toThrow('not integer');
      await expect(() => client.getEntitySet('ValidationIntegers').create({ value: '33.99' }))
        .rejects.toThrow('not integer');

      await expect(() => client.getEntitySet('ValidationDates').create({ value: 3334 })).rejects.toThrow();
      await expect(() => client.getEntitySet('ValidationBools').create({ value: 123 })).rejects.toThrow();

      await client.getEntitySet('ValidationStrings').create({ value: '123213' });
      // UUID check should passed
      await client.getEntitySet('ValidationStrings').create({
        id: 'a14dd2c8-6de2-46e2-b4fa-f69456c1fd10',
        value: '123213'
      });
      await client.getEntitySet('ValidationFloats').create({ value: '33.99' });
      await client.getEntitySet('ValidationDecimals').create({ value: '3213.122' });

      await client.getEntitySet('ValidationIntegers').create({ value: 32 });
      await client.getEntitySet('ValidationIntegers').create({ value: '32' });
      const item = await client.getEntitySet('ValidationIntegers').create({ value: new BigNumber('12') });
      expect(item.value).toBe('12');

      await client.getEntitySet('ValidationDates').create({ value: new Date() });
      await client.getEntitySet('ValidationBools').create({ value: true });
      await client.getEntitySet('ValidationBools').create({ value: false });


    } finally {
      await shutdownServer();
    }

  });

  it('should support create validate option by column metadata', () => {

    const uuidMeta: ColumnOptions = {
      type: 'uuid',
      generated: 'uuid'
    };

    const uuidValidateOptPost = columnToValidateRule(uuidMeta, ODataMethod.POST);

    let errors = validate.single(undefined, uuidValidateOptPost);
    expect(errors).toBeUndefined();
    errors = validate.single(null, uuidValidateOptPost);
    expect(errors).toBeUndefined();
    // invalid uuid string
    errors = validate.single('123432', uuidValidateOptPost);
    expect(errors).toHaveLength(1);

    const v1Meta: EColumnOptions = {
      type: 'nvarchar'
    };

    expect(
      validate.single(
        undefined,
        columnToValidateRule(v1Meta, ODataMethod.POST)
      )
    ).toHaveLength(1);

    expect(
      validate.single(
        null,
        columnToValidateRule(v1Meta, ODataMethod.POST)
      )
    ).toHaveLength(1);

    expect(
      validate.single(
        undefined,
        columnToValidateRule(v1Meta, ODataMethod.PATCH)
      )
    ).toBeUndefined();

    expect(
      validate.single(
        null,
        columnToValidateRule(v1Meta, ODataMethod.PATCH)
      )
    ).toBeUndefined();


  });

  it('should support custom format validation', async () => {

    @ODataModel()
    class CustomValModel {

      @UUIDKeyProperty() id: string;

      @Validate({
        format: {
          pattern: /^\d{4}-\d{2}-\d{2}$/,
          message: '^is not a valid date string'
        },
        // allow undefined value
        // set true as mandatory
        presence: false
      })
      @OptionalProperty()
      value: string;

    }

    const conn = await createTmpConnection({
      name: 'val_conn_10',
      entityPrefix: 'val_test_10',
      entities: [CustomValModel]
    });

    const { client, shutdownServer } = await createServerAndClient(conn);

    try {

      const es = client.getEntitySet<CustomValModel>('CustomValModels');

      const d1 = '2020-11-11';
      const v = await es.create({ value: d1 });
      expect(v.value).toBe(d1);

      const v2 = await es.create({});
      expect(v2.value).toBeUndefined();

      await expect(() => es.create({ value: 'djsa-ds-sd' }))
        .rejects.toThrow('property \'value\' is not a valid date string');

      await expect(() => es.create({ value: 'hello 2020-11-11' }))
        .rejects.toThrow('property \'value\' is not a valid date string');

    } finally {
      await shutdownServer();
    }


  });

});
