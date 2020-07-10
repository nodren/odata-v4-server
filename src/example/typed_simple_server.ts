import { Entity, BaseEntity, PrimaryColumn, Column, createConnection, PrimaryGeneratedColumn } from 'typeorm';
import { Edm } from '../lib';
import { createTypedODataServer } from '../lib/typeorm';
import { randomPort } from '../test/utils/randomPort';

@Entity()
class Student extends BaseEntity {

  @Edm.Key
  @Edm.Int32
  @PrimaryGeneratedColumn() // generated
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


const run = async() => {
  const conn = await createConnection({
    name: 'default',
    type: 'sqljs',
    synchronize: true,
    // logging: true,
    entities: [Student, Class]
  });
  const server = createTypedODataServer(conn.name, Student, Class);

  const s = server.create(randomPort());
  s.once('listening', () => console.log(`server started at ${s.address()['port']}`));
};

if (require.main == module) {
  run();
}
