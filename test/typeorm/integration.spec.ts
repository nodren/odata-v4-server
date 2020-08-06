import { shutdown } from '../utils/server';
import { Class, RelStudentClassAssignment, SchoolEntities, Student, Teacher } from './school_model';
import { createServerAndClient, createTmpConnection } from './utils';

describe('Typed OData Server Integration Test Suite', () => {

  it('should run total integration tests', async () => {

    const conn = await createTmpConnection({
      name: 'default', // why there should be 'default'?
      entityPrefix: 'odata_server_unit_int_',
      synchronize: true,
      entities: SchoolEntities
    });

    const { server, client } = await createServerAndClient(conn, ...SchoolEntities);

    try {
      const students = client.getEntitySet<Student>('Students');
      const classes = client.getEntitySet<Class>('Classes'); // renamed by decorator
      const teachers = client.getEntitySet<Teacher>('Teachers');
      const classRegistry = client.getEntitySet<RelStudentClassAssignment>('RelStudentClassAssignments');

      const t1 = await teachers.create({ name: 'turing', profile: { title: 'Professor' } });
      const t2 = await teachers.create({ name: 'issac', profile: { title: 'Associate Professor' } });

      const s1 = await students.create({ name: 'theo' });
      const s2 = await students.create({ name: 'sun' });

      const c1 = await classes.create({
        name: 'computer science',
        teacherOneId: t1.id,
        desc: 'Computer science is the study of computation and information.'
      });

      const c2 = await classes.create({
        name: 'Theoretical physics',
        teacherOneId: t2.id,
        desc: 'Theoretical physics is a branch of physics that employs mathematical models and abstractions of physical objects and systems to rationalize, explain and predict natural phenomena.'
      });


      const r1 = await classRegistry.create({ classId: c1.id, studentId: s1.id });
      const r2 = await classRegistry.create({ classId: c2.id, studentId: s2.id });
      const r3 = await classRegistry.create({ classId: c2.id, studentId: s1.id });

      const c1Full = await classes.retrieve(c1.id, client.newParam().expand('students($expand=student)'));

      expect(c1Full).toMatchObject({
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

      const c2Full = await classes.retrieve(c2.id, client.newParam().expand('students($expand=student)'));

      expect(c2Full).toMatchObject({
        'id': c2.id,
        'name': c2.name,
        'desc': c2.desc,
        'teacherOneId': t2.id,
        'students': [
          {
            'uuid': r2.uuid,
            'studentId': s2.id,
            'classId': c2.id,
            'student': {
              'id': s2.id,
              'name': 'sun',
              'age': null
            }
          },
          {
            'uuid': r3.uuid,
            'studentId': s1.id,
            'classId': c2.id,
            'student': {
              'id': s1.id,
              'name': 'theo',
              'age': null
            }
          }
        ]
      });

      const t1Full = await teachers.retrieve(t1.id, client.newParam().expand('profile'));

      expect(t1Full).toMatchObject({
        id: t1.id,
        name: t1.name,
        profile: {
          title: 'Professor'
        }
      });

    } finally {
      await shutdown(server);
    }


  });

});
