import { BaseODataModel, ODataColumn, ODataModel, ODataNavigation, withEntitySetName } from '../../../src';
import { RelStudentClassAssignment } from './Rel';
import { Teacher } from './Teacher';

// indicate the entity set name for entity
@withEntitySetName('Classes')
@ODataModel()
export class Class extends BaseODataModel {

  @ODataColumn({ primary: true, generated: 'increment' })
  id: number;

  @ODataColumn()
  name: string;

  @ODataColumn()
  desc: string

  @ODataColumn({ nullable: true })
  teacherOneId: number;

  @ODataNavigation({ type: 'ManyToOne', entity: () => Teacher, foreignKey: 'teacherOneId' })
  teacher: any;

  // GET http://localhost:50000/Classes?$expand=students($expand=student)
  @ODataNavigation({ type: 'OneToMany', entity: () => RelStudentClassAssignment, foreignKey: 'classId' })
  students: any;

}
