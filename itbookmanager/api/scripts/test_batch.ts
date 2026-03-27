import { batchCreateTablets } from '../src/services/mdm/tablets.service';

async function test() {
  try {
    const res = await batchCreateTablets([
      { serialNumber: 'TEST1', modelName: 'M1' },
      { serialNumber: 'TEST2', modelName: 'M1' }
    ]);
    console.log(res);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test();
