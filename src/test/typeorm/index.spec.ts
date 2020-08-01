// @ts-nocheck
import { OData } from '@odata/client';
import '@odata/client/lib/polyfill';
import { defaultParser } from '@odata/parser';
import 'reflect-metadata';
import * as req from 'request-promise';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseODataModel, createTypedODataServer, Edm, FieldNameMapper, odata, ODataColumn, ODataModel, ODataNavigation, ODataServer, transformFilterAst, transformQueryAst, TypedService, withConnection } from '../../lib/index';
import { withODataServerType } from '../../lib/typeorm/server';
import { randomPort } from '../utils/randomPort';
import { ready, shutdown } from '../utils/server';
import { createTmpConnection } from './utils';

describe('Typeorm Integration Test Suite', () => {

  it('should support CRUD by repository', async () => {

    // example entity
    @ODataModel()
    class Product extends BaseODataModel {

      @ODataColumn({ primary: true, generated: 'increment' })
      id: number;

      @ODataColumn()
      desc: string

    }

    const tmpConn = await createTmpConnection({
      name: 'typeorm-test1', entities: [Product]
    });

    const tmpRepo = tmpConn.getRepository(Product);

    // ensure typeorm works
    await tmpRepo.save({ id: 2, desc: '123' });
    expect(await tmpRepo.findOne({ id: 2 })).not.toBeUndefined();

    // example service
    class TmpController extends TypedService<Product> {

    }

    // example server
    @odata.withController(TmpController, 'Products', Product)
    class TmpServer extends ODataServer { }

    withODataServerType(TmpServer)(TmpController);
    withConnection(tmpConn.name)(TmpController);

    const server = TmpServer.create(randomPort());

    const port = await ready(server);

    let res = await req.post(`http://127.0.0.1:${port}/Products`, { json: { id: 1, desc: 'description' } });

    expect(res['@odata.id']).not.toBeUndefined();

    const v = await tmpRepo.findOne(1);

    expect(v).not.toBeUndefined();

    // query
    res = await req.get(`http://127.0.0.1:${port}/Products?$filter=id eq 1`, { json: true });
    expect(res.value).toHaveLength(1);
    expect(res.value[0]?.desc).toEqual('description');

    // update
    // no content
    await req.patch(`http://127.0.0.1:${port}/Products(1)`, { json: { id: 1, desc: 'updated' } });

    // assert
    res = await req.get(`http://127.0.0.1:${port}/Products(1)`, { json: true });
    expect(res['desc']).toEqual('updated');

    res = await req.delete(`http://127.0.0.1:${port}/Products(1)`);

    // not found
    await expect(async () => req.get(`http://127.0.0.1:${port}/Products(1)`)).rejects.toThrow();

    // no limit query
    res = await req.get(`http://127.0.0.1:${port}/Products`, { json: true });

    // still have a '2' record
    expect(res.value).toHaveLength(1);

    await shutdown(server);
    await tmpConn.close();

  });

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

    const connectionName = 'shortcut';

    // define models
    @Entity()
    class Student extends BaseEntity {

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
    class Class extends BaseEntity {

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

    const conn = await createTmpConnection({ name: connectionName, entities: [Student, Class] });

    const OServer = await createTypedODataServer(connectionName, Student, Class);

    const s = OServer.create(randomPort());
    const port = await ready(s);

    const client = OData.New4({ metadataUri: `http://127.0.0.1:${port}/$metadata`, processCsrfToken: false });

    const students = client.getEntitySet<Student>('Students');

    const created = await students.create({
      name: 'theo',
      age: 12
    });

    expect(created).not.toBeUndefined();

    await students.update(created.id, { name: 'theo sun' });

    const updated = await students.retrieve(created.id);

    expect(updated.name).toEqual('theo sun');

    const total = await students.count(OData.newFilter().field('name').eq('theo sun'));

    expect(total).toEqual(1);

    await students.delete(created.id);

    await shutdown(s);
    await conn.close();


  });

  it('should works with decorator', () => {
    class A { }

    @ODataModel()
    class E1 {

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

    }

  });


});
