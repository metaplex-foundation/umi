import test from 'ava';
import { base16 } from '../src';

test('it can serialize base 16 strings', (t) => {
  t.deepEqual(base16.serialize(''), new Uint8Array([]));
  t.deepEqual(base16.deserialize(new Uint8Array([])), ['', 0]);

  t.deepEqual(base16.serialize('0'), new Uint8Array([0]));
  t.deepEqual(base16.serialize('00'), new Uint8Array([0]));
  t.deepEqual(base16.deserialize(new Uint8Array([0])), ['00', 1]);

  t.deepEqual(base16.serialize('1'), new Uint8Array([1]));
  t.deepEqual(base16.serialize('01'), new Uint8Array([1]));
  t.deepEqual(base16.deserialize(new Uint8Array([1])), ['01', 1]);

  t.deepEqual(base16.serialize('2a'), new Uint8Array([42]));
  t.deepEqual(base16.deserialize(new Uint8Array([42])), ['2a', 1]);

  t.deepEqual(base16.serialize('0400'), new Uint8Array([4, 0]));
  t.deepEqual(base16.deserialize(new Uint8Array([4, 0])), ['0400', 2]);

  t.deepEqual(base16.serialize('ffff'), new Uint8Array([255, 255]));
  t.deepEqual(base16.deserialize(new Uint8Array([255, 255])), ['ffff', 2]);

  t.throws(() => base16.serialize('INVALID_INPUT'), {
    message: (m) =>
      m.includes('Expected a string of base 16, got [INVALID_INPUT].'),
  });
});
