import { KeyProperty, OptionalProperty } from '../../decorators';

export class CodeList {

  @KeyProperty({ length: 32 })
  code: string;

  @OptionalProperty({ length: 255 })
  description: string;

}

