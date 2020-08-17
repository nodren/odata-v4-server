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

  it('should support transient class', async () => {

    const c1 = new InjectContainer();
    const c2 = await c1.getInstance(SubLevelInjectContainer);
    const c3 = await c1.getInstance(SubLevelInjectContainer);

    c1.registerProvider(createInstanceProvider('v1', '1'));
    c1.registerProvider(createInstanceProvider('v2', '2'));

    c2.registerProvider(createInstanceProvider('v1', '21'));
    c3.registerProvider(createInstanceProvider('v1', '31'));

    // SubLevelInjectContainer is transient container,
    // each time will create new instance
    expect(c2).not.toBe(c3);
    // but parent container will be equal
    // @ts-ignore
    expect(c2._global).toBe(c3._global);

    expect(await c2.getInstance('v1')).toBe('21');
    expect(await c3.getInstance('v1')).toBe('31');

    expect(await c2.getInstance('v2')).toBe('2');
    expect(await c3.getInstance('v2')).toBe('2');

  });

  it('should support deep container hierarchy', async () => {

    const c1 = new InjectContainer();
    const c2 = await c1.getInstance(SubLevelInjectContainer);
    const c3 = await c2.getInstance(SubLevelInjectContainer);

    c1.registerProvider(createInstanceProvider('v1', '1'));
    c1.registerProvider(createInstanceProvider('v01', '01'));
    c1.registerProvider(createInstanceProvider('v11', '11'));

    c2.registerProvider(createInstanceProvider('v1', '2'));
    c2.registerProvider(createInstanceProvider('v11', '22'));
    c2.registerProvider(createInstanceProvider('v22', '22'));

    c3.registerProvider(createInstanceProvider('v1', '3'));

    expect(await c3.getInstance('v1')).toBe('3'); // from c3
    expect(await c3.getInstance('v22')).toBe('22'); // from c2
    expect(await c3.getInstance('v11')).toBe('22'); // from c2
    expect(await c3.getInstance('v01')).toBe('01'); // from c1

  });


});
