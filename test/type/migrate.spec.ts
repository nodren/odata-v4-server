// @ts-nocheck
import { QueryFailedError } from 'typeorm';
import { ConnectionOptions, createTypedODataServer, IncKeyProperty, migrate, ODataModel, OptionalProperty } from '../../src';
import { createTmpMigrateConnOpt } from './utils';

describe('Server Test Suite', () => {


  it('should throw error when model is not sync', async () => {

    @ODataModel()
    class V1 { @IncKeyProperty() id: number; @OptionalProperty() value: string; }

    const opt: ConnectionOptions = createTmpMigrateConnOpt({
      name: 'server_creation_test_00',
      entities: [V1]
    });

    expect(opt.synchronize).toBeUndefined();

    const server = await createTypedODataServer(opt, V1);

    const { services: [v1Service] } = await server.getServicesWithNewContext(V1);

    await expect(() => v1Service.create({ value: 'test' })).rejects.toThrow(QueryFailedError); // table not found

  });


  it('should works fine with migration', async () => {

    @ODataModel()
    class V1 { @IncKeyProperty() id: number; @OptionalProperty() value: string; }

    const opt: ConnectionOptions = createTmpMigrateConnOpt({
      name: 'server_creation_test_01',
      entities: [V1]
    });

    expect(opt.synchronize).toBeUndefined();

    expect(await migrate(opt, 1)).toBe(true);
    expect(await migrate(opt, 1)).toBe(false); // no migration on version no change

    const server = await createTypedODataServer(opt, V1);

    const { services: [v1Service] } = await server.getServicesWithNewContext(V1);

    const obj = await v1Service.create({ value: 'test' });

    expect(obj.id).not.toBeUndefined();

    await server.getConnection().close(); // close connection

    expect(await migrate(opt, 1)).toBe(false); // no migration on version no change

  });

});
