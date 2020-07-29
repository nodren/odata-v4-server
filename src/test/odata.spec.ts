import { NoServer, AuthenticationServer } from './test.model';
import { Edm, odata } from '../lib/index';


describe('Code coverage', () => {
  it('should return empty object when no public controllers on server', () => {
    expect(odata.getPublicControllers(NoServer)).toEqual({});
  });

  it('should not allow non-OData methods', () => {
    try {
      NoServer.execute('/dev/null', 'MERGE');
      throw new Error('MERGE should not be allowed');
    } catch (err) {
      expect(err.message).toEqual('Method not allowed.');
    }
  });

  it('should throw resource not found error', () => AuthenticationServer.execute('/Users', 'DELETE').then(() => {
    throw new Error('should throw error');
  }, (err) => {
    expect(err.message).toEqual('Not implemented.');
  }));

});
