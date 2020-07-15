import 'reflect-metadata'
import { Entity, BaseEntity, PrimaryColumn, Column, createConnection, PrimaryGeneratedColumn, OneToMany, ManyToMany, ManyToOne, JoinColumn } from 'typeorm';
import { createTypedODataServer, ODataColumn, ODataModel, beforeCreate, beforeUpdate, HookType, beforeDelete, afterLoad, BaseODataModel, Edm, ODataNavigation } from '../lib';

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
  desc: string

  @ODataNavigation({
    type: 'ManyToOne',
    entity: () => Teacher,
    foreignKey: "teacherOneId"
  })
  teacher: any

  @ODataColumn()
  teacherOneId: number;

}

@ODataModel()
class Profile extends BaseODataModel {

  @ODataColumn({ primary: true, generated: "increment" })
  id: number;

}

@ODataModel()
class Teacher extends BaseODataModel {

  @ODataColumn({ primary: true, generated: "increment" })
  id: number;

  @ODataColumn()
  name: string;

  @ODataNavigation({
    type: "OneToOne",
    entity: () => Profile,
    foreignKey: "profileId"
  })
  profile: Profile;

  @ODataColumn()
  profileId: number;

  @ODataNavigation({
    type: 'OneToMany',
    entity: () => Class,
    foreignKey: "teacherOneId"
  })
  classes: Class[]

}

const run = async () => {
  const conn = await createConnection({
    name: 'default',
    type: 'sqljs',
    synchronize: true,
    logging: true,
    cache: true,
    entities: [Student, Class, Teacher, Profile]
  });

  const server = createTypedODataServer(conn.name, Student, Class, Teacher, Profile);

  const s = server.create(50000);

  s.once('listening', () => console.log(`server started at ${s.address()['port']}`));

};

if (require.main == module) {
  run();
}
