// @ts-nocheck
import { OData } from '@odata/client';
import '@odata/client/lib/polyfill';
import { filter } from '@odata/parser';
import 'reflect-metadata';
import { Entity } from 'typeorm';
import { v4 } from 'uuid';
import { BaseODataModel, getODataNavigation, IncKeyProperty, ODataColumn, ODataEntityType, ODataModel, ODataNavigation, Property } from '../../src';
import { createServerAndClient, createTmpConnection } from './utils';

describe('Typeorm Test Suite', () => {


  it('should support shortcut to create a service', async () => {


    // define models
    @Entity()
    class Student extends BaseODataModel {

      @IncKeyProperty()
      id: number;

      @Property()
      name: string;

      @Property()
      age: number;

    }

    @Entity()
    class Class extends BaseODataModel {

      @IncKeyProperty()
      id: number;

      @Property()
      name: string;

      @Property()
      desc: string;

    }

    const conn = await createTmpConnection({
      name: 'shortcut_test_conn',
      entityPrefix: 'u_idx_01_',
      entities: [Student, Class]
    });

    const { server, client, shutdownServer } = await createServerAndClient(conn, Student, Class);

    try {

      const students = client.getEntitySet<Student>('Students');

      const name1 = v4();
      const name2 = v4();
      const created = await students.create({
        name: name1,
        age: 12
      });

      expect(created).not.toBeUndefined();

      await students.update(created.id, { name: name2 });

      const updated = await students.retrieve(created.id);

      expect(updated.name).toEqual(name2);

      const total = await students.count(OData.newFilter().field('name').eq(name2));

      expect(total).toEqual(1);

      await students.delete(created.id);

    } finally {

      await shutdownServer();

    }


  });

  it('should works with decorator', () => {

    @ODataModel()
    class A extends BaseODataModel { }

    @ODataModel()
    class B extends BaseODataModel { }

    @ODataModel()
    class E1 extends BaseODataModel {

      @ODataColumn()
      f1: string

      @ODataColumn()
      f2: boolean

      @ODataColumn()
      f3: number

      @ODataColumn()
      f4: Date

      @ODataColumn()
      f5: 'a' | 'b'

      @ODataNavigation({
        type: 'OneToMany',
        entity: () => A,
        foreignKey: 'a'
      })
      f6: A[]

      @ODataNavigation({
        type: 'ManyToOne',
        entity: () => B,
        foreignKey: 'a'
      })
      f7: B

    }

    const n = getODataNavigation(E1.prototype, 'f6');

    expect(n).not.toBeUndefined();
  });

  it('should query by date time', async () => {

    @ODataModel()
    class TimeSheet extends BaseODataModel {

      @ODataColumn({ primary: true, generated: 'uuid' })
      id: string;

      @ODataColumn()
      date: Date;

    }

    const conn = await createTmpConnection({
      name: 'datetime_query_conn',
      entityPrefix: 'u_idx_02_',
      entities: [TimeSheet]
    });

    const { client, shutdownServer } = await createServerAndClient(conn, TimeSheet);

    try {

      const es = client.getEntitySet<TimeSheet>('TimeSheets');

      const date = new Date();

      const body = await es.create({ date });

      expect(new Date(body.date).getTime()).toBe(date.getTime());

      const items = await es.find({
        date: date.toISOString()
      });

      expect(items).toHaveLength(1);

      expect(items[0].date).toBe(date.toISOString());

      await es.delete(body.id);

    } finally {

      await shutdownServer();

    }


  });

  it('should perform default value for instance', async () => {

    @ODataModel()
    class T3 extends BaseODataModel {

      @ODataColumn({ primary: true, generated: 'increment' })
      id: number;

      @ODataColumn({ default: 'unknown' })
      name: string;

    }

    const conn = await createTmpConnection({
      name: 'default_value_unit_conn',
      entityPrefix: 'u_idx_03_',
      entities: [T3]
    });

    const { server, client, shutdownServer } = await createServerAndClient(conn, T3);

    try {

      const es = client.getEntitySet<T3>('T3s');
      const body = await es.create({});
      expect(body.name).toBe('unknown');

    } finally {
      await shutdownServer();
    }

  });

  it('should support access services by API', async () => {

    @ODataEntityType()
    class People11 extends BaseODataModel {

      @IncKeyProperty()
      pid: number;

      @Property()
      name: string
    }

    const conn = await createTmpConnection({
      name: 'default_service_api_unit_conn',
      entityPrefix: 'u_idx_04_',
      entities: [People11]
    });
    const { odata, server, shutdownServer } = await createServerAndClient(conn, People11);

    const { tx, services: [PeopleService] } = await odata.getServicesWithNewContext(People11);

    try {

      const items = await PeopleService.find();
      expect(items).toHaveLength(0);

      await PeopleService.create({ name: 'theo' });
      const results = await PeopleService.find(filter({ name: 'theo' }));

      expect(results).toHaveLength(1);
      expect(results[0].pid).not.toBeUndefined();

      await tx.commit();

    } finally {

      await tx.rollback();
      await shutdownServer();

    }

  });


});
