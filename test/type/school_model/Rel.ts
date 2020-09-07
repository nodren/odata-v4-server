import { ODataColumn, ODataModel, ODataNavigation } from '../../../src';
import { Class } from './Class';
import { Student } from './Student';

@ODataModel()
export class RelStudentClassAssignment {

  @ODataColumn({ primary: true, generated: 'increment' })
  uuid: number;

  @ODataColumn()
  studentId: number;

  @ODataColumn()
  classId: number;

  @ODataNavigation({ entity: () => Student, foreignKey: 'studentId', type: 'ManyToOne' })
  student: Student;

  @ODataNavigation({ entity: () => Class, foreignKey: 'classId', type: 'ManyToOne' })
  clazz: Class;

}
