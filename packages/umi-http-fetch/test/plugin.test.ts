import test from 'ava';
import { createBaseUmi } from '@metaplex-foundation/umi';
import { fetchHttp } from '../src';

test('it can install the fetch http implementation on a umi instance', (t) => {
  const umi = createBaseUmi().use(fetchHttp());
  t.truthy(umi.http);
  t.is(typeof umi.http.send, 'function');
});
