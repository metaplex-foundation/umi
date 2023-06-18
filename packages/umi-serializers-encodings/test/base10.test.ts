import test from 'ava';
import { base10 } from '../src';

test('it can serialize base 10 strings', (t) => {
  t.deepEqual(base10.serialize(''), new Uint8Array([]));
  t.deepEqual(base10.deserialize(new Uint8Array([])), ['', 0]);

  t.deepEqual(base10.serialize('0'), new Uint8Array([0]));
  t.deepEqual(base10.deserialize(new Uint8Array([0])), ['0', 1]);

  t.deepEqual(base10.serialize('000'), new Uint8Array([0, 0, 0]));
  t.deepEqual(base10.deserialize(new Uint8Array([0, 0, 0])), ['000', 3]);

  t.deepEqual(base10.serialize('1'), new Uint8Array([1]));
  t.deepEqual(base10.deserialize(new Uint8Array([1])), ['1', 1]);

  t.deepEqual(base10.serialize('42'), new Uint8Array([42]));
  t.deepEqual(base10.deserialize(new Uint8Array([42])), ['42', 1]);

  t.deepEqual(base10.serialize('1024'), new Uint8Array([4, 0]));
  t.deepEqual(base10.deserialize(new Uint8Array([4, 0])), ['1024', 2]);

  t.deepEqual(base10.serialize('65535'), new Uint8Array([255, 255]));
  t.deepEqual(base10.deserialize(new Uint8Array([255, 255])), ['65535', 2]);

  t.throws(() => base10.serialize('INVALID_INPUT'), {
    message: (m) =>
      m.includes('Expected a string of base 10, got [INVALID_INPUT].'),
  });
});
