import { shutdown } from '../utils/server';
import { Class, RelStudentClassAssignment, SchoolEntities, Student, Teacher } from './school_model';
import { createServerAndClient, createTmpConnection } from './utils';

describe('Typed OData Server Integration Test Suite', () => {

  it('should run total integration tests', async () => {

    const conn = await createTmpConnection({
      name: 'typed_service_int_test', // why there should be 'default'?
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
        teacherOneId: t1.tid,
        desc: 'Computer science is the study of computation and information.'
      });

      const c2 = await classes.create({
        name: 'Theoretical physics',
        teacherOneId: t2.tid,
        desc: 'Theoretical physics is a branch of physics that employs mathematical models and abstractions of physical objects and systems to rationalize, explain and predict natural phenomena.'
      });


      const r1 = await classRegistry.create({ classId: c1.cid, studentId: s1.sid });
      const r2 = await classRegistry.create({ classId: c2.cid, studentId: s2.sid });
      const r3 = await classRegistry.create({ classId: c2.cid, studentId: s1.sid });

      const c1Full = await classes.retrieve(c1.cid, client.newParam().expand('students($expand=student)'));

      expect(c1Full).toMatchObject({
        cid: c1.cid,
        name: c1.name,
        desc: c1.desc,
        teacherOneId: t1.tid,
        students: [
          {
            'uuid': r1.uuid,
            'studentId': s1.sid,
            'classId': c1.cid,
            'student': {
              sid: s1.sid,
              'name': 'theo',
              'age': null
            }
          }
        ]
      });

      const c2Full = await classes.retrieve(c2.cid, client.newParam().expand('students($expand=student)'));

      expect(c2Full).toMatchObject({
        cid: c2.cid,
        'name': c2.name,
        'desc': c2.desc,
        'teacherOneId': t2.tid,
        'students': [
          {
            'uuid': r2.uuid,
            'studentId': s2.sid,
            'classId': c2.cid,
            'student': {
              sid: s2.sid,
              'name': 'sun',
              'age': null
            }
          },
          {
            'uuid': r3.uuid,
            'studentId': s1.sid,
            'classId': c2.cid,
            'student': {
              sid: s1.sid,
              'name': 'theo',
              'age': null
            }
          }
        ]
      });

      const t1Full = await teachers.retrieve(t1.tid, client.newParam().expand('profile'));

      expect(t1Full).toMatchObject({
        tid: t1.tid,
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
