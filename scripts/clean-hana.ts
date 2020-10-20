// @ts-nocheck
import 'colors';
import { createConnection } from 'typeorm';
import { createTmpDefaultOption } from '../test/type/utils';

(async () => {

  try {
    const opt = createTmpDefaultOption();
    opt.name = 'clean-conn';
    opt.logging = true;
    const conn = await createConnection(opt);
    await conn.createQueryRunner().clearDatabase();
    await conn.close();
    console.log('clean finished'.green);
  } catch (error) {
    console.error(`${error}`.red);
  }


})();
