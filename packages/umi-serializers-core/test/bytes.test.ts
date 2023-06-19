import test from 'ava';
import { fixBytes, mergeBytes, padBytes } from '../src';

test('it can merge multiple arrays of bytes together', async (t) => {
  t.deepEqual(
    mergeBytes([
      new Uint8Array([1, 2, 3]),
      new Uint8Array([4, 5]),
      new Uint8Array([6, 7, 8, 9]),
    ]),
    new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9])
  );
});

test('it can pad an array of bytes to the specified length', async (t) => {
  t.deepEqual(
    padBytes(new Uint8Array([1, 2, 3]), 5),
    new Uint8Array([1, 2, 3, 0, 0])
  );

  t.deepEqual(
    padBytes(new Uint8Array([1, 2, 3]), 2),
    new Uint8Array([1, 2, 3])
  );
});

test('it can fix an array of bytes to the specified length', async (t) => {
  t.deepEqual(
    fixBytes(new Uint8Array([1, 2, 3]), 5),
    new Uint8Array([1, 2, 3, 0, 0])
  );

  t.deepEqual(fixBytes(new Uint8Array([1, 2, 3]), 2), new Uint8Array([1, 2]));
});
