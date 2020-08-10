import { BaseODataModel, createPropertyDecorator, getPropertyOptions, KeyProperty, ODataEntityType, Property } from '../../src';


describe('Decorator Test Suite', () => {

  it('should create custom decorators', () => {

    const OptionalProperty = createPropertyDecorator({ nullable: true });

    @ODataEntityType()
    class D1 extends BaseODataModel {

      @KeyProperty({ generated: 'increment' })
      key: number;

      @OptionalProperty()
      c1: number;

      @Property()
      c2: number;

    }

    expect(getPropertyOptions(D1, 'key').primary).toBeTruthy();
    expect(getPropertyOptions(D1, 'c1').nullable).toBeTruthy();
    expect(getPropertyOptions(D1, 'c2').nullable).toBeFalsy();

  });


});
