import * as express from "express";
import 'reflect-metadata';
import { createTypedODataServer } from '../src';
import { SchoolEntities } from "../test/type/school_model";
import { createTmpConnection } from "../test/type/utils";


const run = async () => {

  const conn = await createTmpConnection({
    name: 'default',
    synchronize: true,
    logging: true,
    cache: true,
    entityPrefix: "odata_server_example_school_",
    entities: SchoolEntities,
  })

  const server = await createTypedODataServer(conn, ...SchoolEntities);

  const app = express()

  app.use(server.create())

  const s = app.listen(50000)

  s.once('listening', () => console.log(`server started at ${s.address()['port']}`));

};

if (require.main == module) {
  run().catch(console.error);
}
