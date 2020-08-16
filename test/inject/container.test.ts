import { createInstanceProvider, InjectContainer, SubLevelInjectContainer } from '../../src';


describe('Container Test Suite', () => {


  it('should support sub level container', async () => {

    const c1 = new InjectContainer();
    const c2 = await c1.getInstance(SubLevelInjectContainer);

    c1.registerProvider(createInstanceProvider('v1', 'v1'));
    c1.registerProvider(createInstanceProvider('v2', 'v3'));

    c2.registerProvider(createInstanceProvider('v1', 'v2'));

    const v1 = await c2.getInstance('v1');
    const v2 = await c2.getInstance('v2');

    expect(v1).toBe('v2');
    expect(v2).toBe('v3');

  });


});
