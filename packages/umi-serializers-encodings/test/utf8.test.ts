import test from 'ava';
import { utf8 } from '../src';

test('it can serialize utf8 strings', (t) => {
  t.deepEqual(utf8.serialize(''), new Uint8Array([]));
  t.deepEqual(utf8.deserialize(new Uint8Array([])), ['', 0]);

  t.deepEqual(utf8.serialize('0'), new Uint8Array([48]));
  t.deepEqual(utf8.deserialize(new Uint8Array([48])), ['0', 1]);

  t.deepEqual(utf8.serialize('ABC'), new Uint8Array([65, 66, 67]));
  t.deepEqual(utf8.deserialize(new Uint8Array([65, 66, 67])), ['ABC', 3]);

  const serializedHelloWorld = new Uint8Array([
    72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33,
  ]);
  t.deepEqual(utf8.serialize('Hello World!'), serializedHelloWorld);
  t.deepEqual(utf8.deserialize(serializedHelloWorld), ['Hello World!', 12]);

  t.deepEqual(utf8.serialize('語'), new Uint8Array([232, 170, 158]));
  t.deepEqual(utf8.deserialize(new Uint8Array([232, 170, 158])), ['語', 3]);
});
