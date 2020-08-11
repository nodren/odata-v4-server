import { isUndefined } from 'util';
import { BaseODataModel, Edm, odata, ODataAction, ODataColumn, ODataModel, ODataNavigation, ResourceNotFoundError, TransactionContext } from '../../../src';
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
  async addClass(@Edm.Int32 classId: number, @odata.txContext ctx: TransactionContext) {
    const classService = this._gerService(Class);
    const c = await classService.findOne(classId, ctx);

    if (isUndefined(c)) {
      throw new ResourceNotFoundError(`not found instance class[${classId}]`);
    }
    c.teacherOneId = this.tid;

    await classService.save(c.cid, c, ctx); // save with hooks lifecycle, suggested
    // await c.save() // save to DB directly
  }

  // GET http://localhost:50000/Teachers(1)/Default.queryClass()
  @Edm.Function(Edm.Collection(Edm.String))
  async queryClass(@odata.txContext ctx: TransactionContext) {
    const qr = await this._getQueryRunner(ctx);
    // run native SQL query
    const items = await qr.query(`select name from class where teacherOneId = :id`, [this.tid]);
    return items.map((item) => item.name);
  }

}
