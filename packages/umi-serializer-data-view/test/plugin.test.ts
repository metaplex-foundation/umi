import { createUmi } from '@metaplex-foundation/umi';
import test from 'ava';
import { dataViewSerializer } from '../src';

test('it can use a DataView serializer', (t) => {
  const umi = createUmi().use(dataViewSerializer());
  t.deepEqual(umi.serializer.u16().serialize(42), new Uint8Array([42, 0]));
});
