import isUndefined from '@newdash/newdash/isUndefined';
import 'reflect-metadata';
import { BaseODataModel, createTypedODataServer, Edm, odata, ODataColumn, ODataEntitySetName, ODataHttpContext, ODataModel, ODataNavigation, ResourceNotFoundError } from '../lib';


@ODataModel()
class Student extends BaseODataModel {

  // generated id
  @ODataColumn({ primary: true, generated: "increment" })
  id: number;

  @ODataColumn()
  name: string;

  @ODataColumn({ nullable: true })
  age: number;

  @ODataNavigation({ type: 'OneToMany', entity: () => RelStudentClassAssignment, foreignKey: "studentId" })
  classes: any;

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
  teacher: any;

  @ODataNavigation({ type: 'OneToMany', entity: () => RelStudentClassAssignment, foreignKey: "classId" })
  students: any;

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

  // POST http://localhost:50000/Teachers(1)/Default.addClass
  // {
  //  "classId": 1
  // }
  @Edm.Action
  async addClass(@Edm.Int32 classId: number, @odata.context ctx: ODataHttpContext) {
    const classService = this._gerService(Class)
    const c = await classService.findOne(classId, ctx)

    if (isUndefined(c)) {
      throw new ResourceNotFoundError(`not found instance class[${classId}]`)
    }
    c.teacherOneId = this.id

    await classService.save(c.id, c, ctx) // save with hooks lifecycle, suggested
    // await c.save() // save to DB directly
  }

  // GET http://localhost:50000/Teachers(1)/Default.queryClass()
  @Edm.Function(Edm.Collection(Edm.String))
  async queryClass(@odata.context ctx) {
    const qr = await this._getQueryRunner(ctx);
    // run native SQL query
    const items = await qr.query(`select name from class where teacherOneId = :id`, [this.id])
    return items.map(item => item.name)
  }

}

@ODataModel()
class RelStudentClassAssignment extends BaseODataModel {

  @ODataColumn({ primary: true, generated: "uuid" })
  uuid: string;

  @ODataColumn()
  studentId: number;

  @ODataColumn()
  classId: number;

  @ODataNavigation({ entity: () => Student, foreignKey: "studentId", type: "ManyToOne" })
  student: Student;

  @ODataNavigation({ entity: () => Class, foreignKey: "classId", type: "ManyToOne" })
  clazz: Class;

}

const run = async () => {

  const entities = [Student, Class, Teacher, Profile, RelStudentClassAssignment]

  const server = await createTypedODataServer({
    name: 'default',
    type: 'sqljs',
    synchronize: true,
    logging: true,
    cache: true,
    entities
  }, ...entities);

  const s = server.create(50000);

  s.once('listening', () => console.log(`server started at ${s.address()['port']}`));

};

if (require.main == module) {
  run();
}
