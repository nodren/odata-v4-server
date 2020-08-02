import { odata } from '../src';
import { AuthenticationServer, NoServer } from './test.model';


describe('Code coverage', () => {
  it('should return empty object when no public controllers on server', () => {
    expect(odata.getPublicControllers(NoServer)).toEqual({});
  });

  it('should not allow non-OData methods', async () => {

    await expect(async () => NoServer.execute('/dev/null', 'MERGE')).rejects.toThrowError('Method not allowed.');

  });

  it('should throw resource not found error', () => AuthenticationServer.execute('/Users', 'DELETE').then(() => {
    throw new Error('should throw error');
  }, (err) => {
    expect(err.message).toEqual('Not implemented.');
  }));

});
