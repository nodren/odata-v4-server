import { Teacher } from '.';
import { IncKeyProperty, ODataModel, ODataNavigation, Property } from '../../../src';

@ODataModel()
export class Profile  {

  @IncKeyProperty()
  id: number;

  @Property()
  title: string;

  @ODataNavigation({ type: 'OneToOne', entity: () => Teacher, targetForeignKey: 'profileId' })
  teacher: Teacher;

}
