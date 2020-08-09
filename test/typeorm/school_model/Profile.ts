import { Teacher } from '.';
import { BaseODataModel, ODataColumn, ODataModel, ODataNavigation } from '../../../src';

@ODataModel()
export class Profile extends BaseODataModel {

  @ODataColumn({ primary: true, generated: 'increment' })
  id: number;

  @ODataColumn()
  title: string;

  // if user want two-direction navigation for one to one
  // must define FKs both on two entity
  @ODataNavigation({ type: 'OneToOne', entity: () => Teacher, foreignKey: 'teacherId', targetForeignKey: 'profileId' })
  teacher: Teacher;

  @ODataColumn({ nullable: true })
  teacherId: number;

}
