import 'reflect-metadata'
import { Entity, BaseEntity, PrimaryColumn, Column, createConnection, PrimaryGeneratedColumn } from 'typeorm';
import { createTypedODataServer, ODataColumn, ODataModel, beforeCreate, beforeUpdate, HookType, beforeDelete, afterLoad } from '../lib';
import { randomPort } from '../test/utils/randomPort';

@ODataModel()
class Student extends BaseEntity {

  // generated id
  @ODataColumn({ primary: true, generated: "increment" })
  id: number;

  @ODataColumn()
  name: string;

  @ODataColumn()
  age: number;

}

@ODataModel()
class Class extends BaseEntity {

  @ODataColumn({ primary: true, generated: "increment" })
  id: number;

  @ODataColumn()
  name: string;

  @ODataColumn()
  desc: string;

  @beforeCreate()
  @beforeUpdate()
  async beforeCreate(item: Class, { type }) {

    if (type == HookType.beforeCreate) {
      // creation specify logic
    }

  }

  @beforeDelete()
  beforeDelete() {

  }

  @afterLoad()
  afterLoad() {

  }



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
