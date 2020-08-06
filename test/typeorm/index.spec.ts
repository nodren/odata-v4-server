// @ts-nocheck
import { OData } from '@odata/client';
import '@odata/client/lib/polyfill';
import { defaultParser } from '@odata/parser';
import 'reflect-metadata';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { v4 } from 'uuid';
import { BaseODataModel, Edm, FieldNameMapper, getODataNavigation, ODataColumn, ODataModel, ODataNavigation, transformFilterAst, transformQueryAst } from '../../src';
import { shutdown } from '../utils/server';
import { createServerAndClient, createTmpConnection } from './utils';

describe('Typeorm Test Suite', () => {

  it('should support converting odata query to sql', () => {

    const ast = defaultParser.query('$format=json&$select=A,B,C&$top=10&$skip=30&$filter=A eq 1&$orderby=A desc,V asc');
    const { selectedFields, sqlQuery } = transformQueryAst(ast);

    expect(sqlQuery.trim()).toEqual('WHERE A = 1 LIMIT 30, 10 ORDERBY A DESC, V ASC');
    expect(selectedFields).toEqual(['A', 'B', 'C']);

  });

  it('should visit $count', () => {
    const ast = defaultParser.query('$count=true');
    const { count } = transformQueryAst(ast);
    expect(count).toBeTruthy();
  });

  it('should support converting odata query to sql with name mapper', () => {

    const ast = defaultParser.query('$format=json&$select=A,B,C&$top=10&$skip=30&$filter=A eq 1&$orderby=A desc,V asc');
    const nameMapper: FieldNameMapper = (fieldName) => `table.${fieldName}`;
    const { selectedFields, sqlQuery } = transformQueryAst(ast, nameMapper);

    expect(sqlQuery.trim()).toEqual('WHERE table.A = 1 LIMIT 30, 10 ORDERBY table.A DESC, table.V ASC');
    expect(selectedFields).toEqual(['table.A', 'table.B', 'table.C']);

  });

  it('should support converting data query to sql', () => {

    const ast = defaultParser.filter('(A eq 3) and (B eq 4 or B eq 5) and (C ge 3 and D lt 5)');
    const sql = transformFilterAst(ast);

    expect(sql).toEqual('(A = 3) AND (B = 4 OR B = 5) AND (C >= 3 AND D < 5)');

  });

  it('should support shortcut to create a service', async () => {


    // define models
    @Entity()
    class Student extends BaseODataModel {

      @Edm.Key
      @Edm.Int32
      @PrimaryGeneratedColumn()
      id: number;

      @Edm.String
      @Column()
      name: string;

      @Edm.Int32
      @Column()
      age: number;

    }

    @Entity()
    class Class extends BaseODataModel {

      @Edm.Key
      @Edm.Int32
      @PrimaryGeneratedColumn()
      id: number;

      @Edm.String
      @Column()
      name: string;

      @Edm.String
      @Column()
      desc: string;

    }

    const conn = await createTmpConnection({
      name: 'shortcut_test_conn',
      entityPrefix: 'odata_server_unit_index_01_',
      entities: [Student, Class]
    });

    const { server, client } = await createServerAndClient(conn, Student, Class);

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

      await shutdown(server);

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
      entityPrefix: 'odata_server_unit_index_02_',
      entities: [TimeSheet]
    });

    const { server, client } = await createServerAndClient(conn, TimeSheet);

    try {

      const es = client.getEntitySet<TimeSheet>('TimeSheets');

      const date = new Date();

      const body = await es.create({ date });

      expect(new Date(body.date).getTime()).toBe(date.getTime());

      const items = await es.find({
        date: date.toISOString()
      });

      expect(items).toHaveLength(1);

      await es.delete(body.id);

    } finally {

      await shutdown(server);

    }


  });


});
