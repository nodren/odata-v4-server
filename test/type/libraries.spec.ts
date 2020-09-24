import { closestString, distance } from '../../src';


describe('Libraries Test Suite', () => {

  it('should support calculate distance of strings', () => {

    expect(distance('', '')).toBe(0);
    expect(distance('abcd', 'abcd')).toBe(0);
    expect(distance('abcd', 'abc')).toBe(1);
    expect(distance('abcd', '123')).toBe(4);

  });

  it('should support calculate closest string', () => {
    const dict = ['hello', 'haha', 'mama', 'moment', 'world', 'latest'];

    expect(closestString('h', dict)).toBe('haha');
    expect(closestString('he', dict)).toBe('hello');
    expect(closestString('m', dict)).toBe('mama');
    expect(closestString('mo', dict)).toBe('mama');
    expect(closestString('mome', dict)).toBe('mama');
    expect(closestString('latast', dict)).toBe('latest');

  });

  it('should support calculate closest string for detail', () => {
    const dict = ['moment1','mnment1','mcment1'];
    expect(closestString('moment', dict)).toBe('moment1');
    expect(closestString('mnment', dict)).toBe('mnment1');
    expect(closestString('mnment1', dict)).toBe('mnment1');

  });

});
