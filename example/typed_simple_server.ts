import 'reflect-metadata';
import { createTypedODataServer } from '../lib';
import { SchoolEntities } from "../test/typeorm/school_model";

const run = async () => {

  const server = await createTypedODataServer({
    name: 'default',
    type: 'sqljs',
    synchronize: true,
    logging: true,
    cache: true,
    entities: SchoolEntities
  }, ...SchoolEntities);

  const s = server.create(50000);

  s.once('listening', () => console.log(`server started at ${s.address()['port']}`));

};

if (require.main == module) {
  run();
}
