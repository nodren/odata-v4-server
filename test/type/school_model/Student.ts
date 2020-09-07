import { ODataColumn, ODataModel, ODataNavigation } from '../../../src';
import { RelStudentClassAssignment } from './Rel';

@ODataModel()
export class Student  {

  // generated id
  @ODataColumn({ primary: true, generated: 'increment' })
  sid: number;

  @ODataColumn()
  name: string;

  @ODataColumn({ nullable: true })
  age: number;

  @ODataNavigation({ type: 'OneToMany', entity: () => RelStudentClassAssignment, targetForeignKey: 'studentId' })
  classes: any;

}
