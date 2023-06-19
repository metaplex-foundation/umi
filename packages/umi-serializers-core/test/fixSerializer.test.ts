import test from 'ava';
import { Serializer, fixSerializer } from '../src';
import { base16, utf8 } from './_setup';

test('it can fix a serializer to a given amount of bytes', (t) => {
  const b = (s: string) => base16.serialize(s);
  const s = (size: number) => fixSerializer(utf8, size);

  // Description matches the fixed definition.
  t.is(fixSerializer(utf8, 42).description, 'fixed(42, utf8)');

  // Description can be overridden.
  t.is(fixSerializer(utf8, 42, 'my fixed').description, 'my fixed');

  // Fixed and max sizes.
  t.is(fixSerializer(utf8, 12).fixedSize, 12);
  t.is(fixSerializer(utf8, 12).maxSize, 12);
  t.is(fixSerializer(utf8, 42).fixedSize, 42);
  t.is(fixSerializer(utf8, 42).maxSize, 42);

  // Buffer size === fixed size.
  t.deepEqual(s(12).serialize('Hello world!'), b('48656c6c6f20776f726c6421'));
  t.deepEqual(s(12).deserialize(b('48656c6c6f20776f726c6421')), [
    'Hello world!',
    12,
  ]);

  // Buffer size > fixed size => truncated.
  t.deepEqual(s(5).serialize('Hello world!'), b('48656c6c6f'));
  t.deepEqual(s(5).deserialize(b('48656c6c6f20776f726c6421')), ['Hello', 5]);

  // Buffer size < fixed size => padded.
  t.deepEqual(s(12).serialize('Hello'), b('48656c6c6f00000000000000'));
  t.deepEqual(s(12).deserialize(b('48656c6c6f00000000000000')), ['Hello', 12]);
  t.throws(() => s(12).deserialize(b('48656c6c6f')), {
    message: (m) =>
      m.includes('Serializer [fixSerializer] expected 12 bytes, got 5.'),
  });
});

test('it can fix a serializer that requires a minimum amount of bytes (#56)', (t) => {
  // Given a mock `u32` serializer that ensures the buffer is 4 bytes long.
  const u32: Serializer<number> = {
    description: 'u32',
    fixedSize: 4,
    maxSize: 4,
    serialize: (value: number) => new Uint8Array([value, 0, 0, 0]),
    deserialize(bytes, offset = 0): [number, number] {
      if (bytes.slice(offset).length < offset + 4) {
        throw new Error('Not enough bytes to deserialize a u32.');
      }
      return [bytes.slice(offset)[0], offset + 4];
    },
  };

  // When we synthesize a `u24` from that `u32` using `fixSerializer`.
  const u24 = fixSerializer(u32, 3);

  // Then we can serialize a `u24`.
  const buf = u24.serialize(42);
  t.deepEqual(buf, new Uint8Array([42, 0, 0]));

  // And we can deserialize it back.
  const hydrated = u24.deserialize(buf);
  t.deepEqual(hydrated, [42, 3]);
});
