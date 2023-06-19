import test from 'ava';
import { base58 } from '../src';

test('it can serialize base 58 strings', (t) => {
  t.deepEqual(base58.serialize(''), new Uint8Array([]));
  t.deepEqual(base58.deserialize(new Uint8Array([])), ['', 0]);

  t.deepEqual(base58.serialize('1'), new Uint8Array([0]));
  t.deepEqual(base58.deserialize(new Uint8Array([0])), ['1', 1]);

  t.deepEqual(base58.serialize('2'), new Uint8Array([1]));
  t.deepEqual(base58.deserialize(new Uint8Array([1])), ['2', 1]);

  t.deepEqual(base58.serialize('11'), new Uint8Array([0, 0]));
  t.deepEqual(base58.deserialize(new Uint8Array([0, 0])), ['11', 2]);

  const zeroes32 = new Uint8Array(Array(32).fill(0));
  t.deepEqual(base58.serialize('1'.repeat(32)), zeroes32);
  t.deepEqual(base58.deserialize(zeroes32), ['1'.repeat(32), 32]);

  t.deepEqual(base58.serialize('j'), new Uint8Array([42]));
  t.deepEqual(base58.deserialize(new Uint8Array([42])), ['j', 1]);

  t.deepEqual(base58.serialize('Jf'), new Uint8Array([4, 0]));
  t.deepEqual(base58.deserialize(new Uint8Array([4, 0])), ['Jf', 2]);

  t.deepEqual(base58.serialize('LUv'), new Uint8Array([255, 255]));
  t.deepEqual(base58.deserialize(new Uint8Array([255, 255])), ['LUv', 2]);

  const pubkey = 'LorisCg1FTs89a32VSrFskYDgiRbNQzct1WxyZb7nuA';
  const bytes = new Uint8Array([
    5, 19, 4, 94, 5, 47, 73, 25, 182, 8, 150, 61, 231, 60, 102, 110, 6, 114,
    224, 110, 40, 20, 10, 184, 65, 191, 241, 204, 131, 161, 120, 181,
  ]);
  t.deepEqual(base58.serialize(pubkey), bytes);
  t.deepEqual(base58.deserialize(bytes), [pubkey, 32]);

  t.throws(() => base58.serialize('INVALID_INPUT'), {
    message: (m) =>
      m.includes('Expected a string of base 58, got [INVALID_INPUT].'),
  });
});
