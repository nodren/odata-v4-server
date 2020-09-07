import { Teacher } from '.';
import { ODataColumn, ODataModel, ODataNavigation } from '../../../src';

@ODataModel()
export class Profile  {

  @ODataColumn({ primary: true, generated: 'increment' })
  id: number;

  @ODataColumn()
  title: string;

  @ODataNavigation({ type: 'OneToOne', entity: () => Teacher, targetForeignKey: 'profileId' })
  teacher: Teacher;

}
