import { BaseODataModel, ODataColumn, ODataModel } from '../../../src';

@ODataModel()
export class Profile extends BaseODataModel {

  @ODataColumn({ primary: true, generated: 'increment' })
  id: number;

  @ODataColumn()
  title: string;

}
