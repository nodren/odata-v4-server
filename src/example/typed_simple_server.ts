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
    const repo = await this._getRepository(ctx, Class)
    const c = await repo.findOne(classId)
    if (isUndefined(c)) {
      throw new ResourceNotFoundError(`not found instance class[${classId}]`)
    }
    c.teacherOneId = this.id
    await c.save()
  }

  @Edm.Collection(Edm.String)
  @Edm.Function
  async queryClass(@odata.context ctx) {
    const qr = await this._getQueryRunner(ctx);
    const items = await qr.query(`select name from class where teacherOneId = :id`, [this.id])
    return items.map(item => item.name)
  }

}

const run = async () => {

  const entities = [Student, Class, Teacher, Profile]
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
