import { Class } from './Class';
import { Profile } from './Profile';
import { RelStudentClassAssignment } from './Rel';
import { RelView } from './RelView';
import { Student } from './Student';
import { Teacher } from './Teacher';


export {
  Class, Student, Teacher, RelStudentClassAssignment, Profile, RelView
};

export const SchoolEntities = [Class, Teacher, RelStudentClassAssignment, Profile, Student, RelView];
