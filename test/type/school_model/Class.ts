import { IncKeyProperty, ODataModel, ODataNavigation, OptionalProperty, Property, ui, withEntitySetName } from '../../../src';
import { RelStudentClassAssignment } from './Rel';
import { Teacher } from './Teacher';

// indicate the entity set name for entity
@withEntitySetName('Classes')
@ODataModel()
@ui.Label('School Classes')
export class Class {

  @ui.Label('Class ID')
  @ui.FormField('updateForm', 'viewForm')
  @ui.ReadOnly('updateForm')
  @ui.TableItem(0)
  @IncKeyProperty()
  cid: number;

  @ui.Label('Class Name')
  @ui.TableItem(1)
  @ui.TableQueryItem()
  @Property()
  name: string;

  @Property()
  desc: string

  @OptionalProperty()
  teacherOneId: number;

  @ODataNavigation({ type: 'ManyToOne', entity: () => Teacher, foreignKey: 'teacherOneId' })
  teacher: any;

  // GET http://localhost:50000/Classes?$expand=students($expand=student)
  @ODataNavigation({ type: 'OneToMany', entity: () => RelStudentClassAssignment, targetForeignKey: 'classId' })
  students: any;

}
