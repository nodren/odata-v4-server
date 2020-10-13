import { OptionalProperty } from '../../decorators';


export class PersonName {

  @OptionalProperty({ length: '255' })
  firstName: string;

  @OptionalProperty({ length: '255' })
  middleName: string;

  @OptionalProperty({ length: '255' })
  lastName: string;

  @OptionalProperty({ length: '255' })
  nickName: string;

}
