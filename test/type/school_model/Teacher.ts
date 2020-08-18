import { Connection } from 'typeorm';
import { isUndefined } from 'util';
import { BaseODataModel, Edm, inject, InjectContainer, ODataAction, ODataColumn, ODataModel, ODataNavigation, ResourceNotFoundError, TypedODataServer } from '../../../src';
import { InjectKey } from '../../../src/constants';
import { Class } from './Class';
import { Profile } from './Profile';

@ODataModel()
export class Teacher extends BaseODataModel {

  @ODataColumn({ primary: true, generated: 'increment' })
  tid: number;

  @ODataColumn()
  name: string;

  @ODataColumn({ nullable: true })
  profileId: number;

  @ODataNavigation({ type: 'OneToOne', entity: () => Profile, foreignKey: 'profileId' })
  profile: Profile;

  @ODataNavigation({ type: 'OneToMany', entity: () => Class, targetForeignKey: 'teacherOneId' })
  classes: Class[];

  // POST http://localhost:50000/Teachers(1)/Default.addClass
  // {
  //  "classId": 1
  // }
  @ODataAction
  async addClass(
    @Edm.Int32 classId: number,
    @inject(InjectKey.ServerType) serverType: typeof TypedODataServer,
    @inject(InjectContainer) ic: InjectContainer
  ) {
    const classService = ic.wrap(await serverType.getService(Class));
    const c = await classService.findOne(classId);

    if (isUndefined(c)) {
      throw new ResourceNotFoundError(`not found instance class[${classId}]`);
    }
    c.teacherOneId = this.tid;

    await classService.update(c.cid, c); // save with hooks lifecycle, suggested
  }

  // GET http://localhost:50000/Teachers(1)/Default.queryClass()
  @Edm.Function(Edm.Collection(Edm.String))
  async queryClass(@inject(InjectKey.GlobalConnection) conn: Connection) {
    const classes = await conn.getRepository(Class).find({
      where: {
        teacherOneId: this.tid
      }
    });

    return classes.map((item) => item.name);
  }

}
