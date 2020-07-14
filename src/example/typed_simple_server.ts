import 'reflect-metadata'
import { Entity, BaseEntity, PrimaryColumn, Column, createConnection, PrimaryGeneratedColumn } from 'typeorm';
import { createTypedODataServer, ODataColumn, ODataModel, beforeCreate, beforeUpdate, HookType, beforeDelete, afterLoad, BaseODataModel } from '../lib';
import { randomPort } from '../test/utils/randomPort';

@ODataModel()
class Student extends BaseODataModel {

  // generated id
  @ODataColumn({ primary: true, generated: "increment" })
  id: number;

  @ODataColumn()
  name: string;

  @ODataColumn()
  age: number;

}

@ODataModel()
class Class extends BaseODataModel {

  @ODataColumn({ primary: true, generated: "increment" })
  id: number;

  @ODataColumn()
  name: string;

  @ODataColumn()
  desc: string;

}


const run = async () => {
  const conn = await createConnection({
    name: 'default',
    type: 'sqljs',
    synchronize: true,
    logging: true,
    entities: [Student, Class]
  });
  const server = createTypedODataServer(conn.name, Student, Class);

  const s = server.create(randomPort());
  s.once('listening', () => console.log(`server started at ${s.address()['port']}`));
};

if (require.main == module) {
  run();
}
