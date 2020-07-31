import { shutdown } from '../utils/server';
import { Class, RelStudentClassAssignment, SchoolEntities, Student, Teacher } from './school_model';
import { createServerAndClient } from './utils';

describe('Typed OData Server Integration Test Suite', () => {

  it('should run total integration tests', async () => {

    const { server, client } = await createServerAndClient({
      name: 'typed_server_integration_test_conn',
      type: 'sqljs', synchronize: true,
      entities: SchoolEntities
    }, ...SchoolEntities);

    try {
      const students = client.getEntitySet<Student>('Students');
      const classes = client.getEntitySet<Class>('Classes'); // renamed by decorator
      const teachers = client.getEntitySet<Teacher>('Teachers');
      const classRegistry = client.getEntitySet<RelStudentClassAssignment>('RelStudentClassAssignments');

      const t1 = await teachers.create({ name: 'turing' });
      const s1 = await students.create({ name: 'theo' });
      const c1 = await classes.create({
        name: 'computer science',
        teacherOneId: t1.id,
        desc: 'Computer science is the study of computation and information.'
      });
      const r1 = await classRegistry.create({ classId: c1.id, studentId: s1.id });

      const full = await classes.retrieve(c1.id, client.newParam().expand('students($expand=student)'));

      expect(full).toMatchObject({
        'id': c1.id,
        'name': c1.name,
        'desc': c1.desc,
        'teacherOneId': t1.id,
        'students': [
          {
            'uuid': r1.uuid,
            'studentId': s1.id,
            'classId': c1.id,
            'student': {
              'id': s1.id,
              'name': 'theo',
              'age': null
            }
          }
        ]
      });

    } finally {
      await shutdown(server);
    }


  });

});
