import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseODataModel, createTypedODataServer, Edm, odata, ODataColumn, ODataEntitySetName, ODataHttpContext, ODataModel, ODataNavigation } from '../lib';


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


// indicate the entity set name for entity
@ODataEntitySetName("Classes")
@ODataModel()
class Class extends BaseODataModel {

  @ODataColumn({ primary: true, generated: "increment" })
  id: number;

  @ODataColumn()
  name: string;

  @ODataColumn()
  desc: string

  @ODataColumn({ nullable: true })
  teacherOneId: number;

  @ODataNavigation({ type: 'ManyToOne', entity: () => Teacher, foreignKey: "teacherOneId" })
  teacher: any

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

  @ODataColumn({ nullable: true })
  profileId: number;

  @ODataNavigation({ type: "OneToOne", entity: () => Profile, foreignKey: "profileId" })
  profile: Profile;

  @ODataNavigation({ type: 'OneToMany', entity: () => Class, foreignKey: "teacherOneId" })
  classes: Class[];

  @Edm.Action
  async addClass(@Edm.Int32 classId: number, @odata.context ctx: ODataHttpContext) {
    // 'this' is bounded odata response object, is not entity instance 
    console.log(classId)
  }

}

const run = async () => {

  const entities = [Student, Class, Teacher, Profile]
  const conn = await createConnection({
    name: 'default',
    type: 'sqljs',
    synchronize: true,
    logging: true,
    cache: true,
    entities
  });

  const server = await createTypedODataServer(conn.name, ...entities);

  const s = server.create(50000);

  s.once('listening', () => console.log(`server started at ${s.address()['port']}`));

};

if (require.main == module) {
  run();
}
