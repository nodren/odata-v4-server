import { RelStudentClassAssignment, Student, Teacher } from '.';
import { KeyProperty, ODataView, Property } from '../../../src';
import { Class } from './Class';


@ODataView(
  {
    expression: (conn) => conn.createQueryBuilder()
      .addSelect('rel.uuid', 'uuid')
      .addSelect('student.name', 'studentName')
      .addSelect('class.name', 'className')
      .addSelect('teacher.name', 'teacherName')
      .from(RelStudentClassAssignment, 'rel')
      .innerJoin(Class, 'class', 'class.cid = rel.classId')
      .innerJoin(Student, 'student', 'student.sid = rel.studentId')
      .innerJoin(Teacher, 'teacher', 'teacher.tid = class.teacherOneId')
  }
)
export class RelView {

  @KeyProperty()
  uuid: number;

  @Property()
  studentName: string;
  @Property()
  className: string;
  @Property()
  teacherName: string;

}
