import test from 'ava';
import {
  base16,
  mapSerializer,
  Serializer,
  reverseSerializer,
  fixSerializer,
  utf8,
} from '../src';

const numberSerializer: Serializer<number> = {
  description: 'number',
  fixedSize: 1,
  maxSize: 1,
  serialize: (value: number) => new Uint8Array([value]),
  deserialize: (buffer: Uint8Array): [number, number] => [buffer[0], 1],
};

test('it can loosen the serializer input with a map', (t) => {
  // From <number> to <number | string, number>.
  const mappedSerializer: Serializer<number | string, number> = mapSerializer(
    numberSerializer,
    (value: number | string) =>
      typeof value === 'number' ? value : value.length
  );

  const bufferA = mappedSerializer.serialize(42);
  t.is(mappedSerializer.deserialize(bufferA)[0], 42);

  const bufferB = mappedSerializer.serialize('Hello world');
  t.is(mappedSerializer.deserialize(bufferB)[0], 11);
});

test('it can map both the input and output of a serializer', (t) => {
  // From <number> to <number | string, string>.
  const mappedSerializer: Serializer<number | string, string> = mapSerializer(
    numberSerializer,
    (value: number | string) =>
      typeof value === 'number' ? value : value.length,
    (value: number) => 'x'.repeat(value)
  );

  const bufferA = mappedSerializer.serialize(42);
  t.is(mappedSerializer.deserialize(bufferA)[0], 'x'.repeat(42));

  const bufferB = mappedSerializer.serialize('Hello world');
  t.is(mappedSerializer.deserialize(bufferB)[0], 'x'.repeat(11));
});

test('it can map the input and output of a serializer to the same type', (t) => {
  // From <number> to <string>.
  const mappedSerializer: Serializer<string> = mapSerializer(
    numberSerializer,
    (value: string) => value.length,
    (value: number) => 'x'.repeat(value)
  );

  const bufferA = mappedSerializer.serialize('42');
  t.is(mappedSerializer.deserialize(bufferA)[0], 'xx');

  const bufferB = mappedSerializer.serialize('Hello world');
  t.is(mappedSerializer.deserialize(bufferB)[0], 'xxxxxxxxxxx');
});

test('it can wrap a serializer type in an object using a map', (t) => {
  // From <number> to <{ value: number }>.
  type Wrap<T> = { value: T };
  const mappedSerializer: Serializer<Wrap<number>> = mapSerializer(
    numberSerializer,
    (value: Wrap<number>) => value.value,
    (value: number): Wrap<number> => ({ value })
  );

  const buffer = mappedSerializer.serialize({ value: 42 });
  t.deepEqual(mappedSerializer.deserialize(buffer)[0], { value: 42 });
});

test('it map a serializer to loosen its input by providing default values', (t) => {
  // Create Serializer<Strict>.
  type Strict = { discriminator: number; label: string };
  const strictSerializer: Serializer<Strict> = {
    description: 'Strict',
    fixedSize: 2,
    maxSize: 2,
    serialize: (value: Strict) =>
      new Uint8Array([value.discriminator, value.label.length]),
    deserialize: (buffer: Uint8Array): [Strict, number] => [
      { discriminator: buffer[0], label: 'x'.repeat(buffer[1]) },
      1,
    ],
  };

  const bufferA = strictSerializer.serialize({
    discriminator: 5,
    label: 'Hello world',
  });
  t.deepEqual(strictSerializer.deserialize(bufferA)[0], {
    discriminator: 5,
    label: 'xxxxxxxxxxx',
  });

  // From <Strict> to <Loose, Strict>.
  type Loose = { discriminator?: number; label: string };
  const looseSerializer: Serializer<Loose, Strict> = mapSerializer(
    strictSerializer,
    (value: Loose): Strict => ({
      discriminator: 42, // <- Default value.
      ...value,
    })
  );

  // With explicit discriminator.
  const bufferB = looseSerializer.serialize({
    discriminator: 5,
    label: 'Hello world',
  });
  t.deepEqual(looseSerializer.deserialize(bufferB)[0], {
    discriminator: 5,
    label: 'xxxxxxxxxxx',
  });

  // With implicit discriminator.
  const bufferC = looseSerializer.serialize({
    label: 'Hello world',
  });
  t.deepEqual(looseSerializer.deserialize(bufferC)[0], {
    discriminator: 42,
    label: 'xxxxxxxxxxx',
  });
});

test('it can loosen a tuple serializer', (t) => {
  const serializer = {
    description: 'Tuple',
    fixedSize: 2,
    maxSize: 2,
    serialize: (value: [number, string]) =>
      new Uint8Array([value[0], value[1].length]),
    deserialize: (buffer: Uint8Array): [[number, string], number] => [
      [buffer[0], 'x'.repeat(buffer[1])],
      2,
    ],
  };

  const bufferA = serializer.serialize([42, 'Hello world']);
  t.deepEqual(serializer.deserialize(bufferA)[0], [42, 'xxxxxxxxxxx']);

  const mappedSerializer = mapSerializer(
    serializer,
    (value: [number | null, string]): [number, string] => [
      value[0] ?? value[1].length,
      value[1],
    ]
  );

  const bufferB = mappedSerializer.serialize([null, 'Hello world']);
  t.deepEqual(mappedSerializer.deserialize(bufferB)[0], [11, 'xxxxxxxxxxx']);

  const bufferC = mappedSerializer.serialize([42, 'Hello world']);
  t.deepEqual(mappedSerializer.deserialize(bufferC)[0], [42, 'xxxxxxxxxxx']);
});

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
    message: (m) => m.includes('Fixed serializer expected 12 bytes, got 5.'),
  });
});

test('it can reverse the bytes of a fixed-size serializer', (t) => {
  const b = (s: string) => base16.serialize(s);
  const s = (size: number) => reverseSerializer(fixSerializer(base16, size));

  // Serialize.
  t.deepEqual(s(1).serialize('00'), b('00'));
  t.deepEqual(s(2).serialize('00ff'), b('ff00'));
  t.deepEqual(s(2).serialize('ff00'), b('00ff'));
  t.deepEqual(s(4).serialize('00000001'), b('01000000'));
  t.deepEqual(s(4).serialize('01000000'), b('00000001'));
  t.deepEqual(s(8).serialize('0000000000000001'), b('0100000000000000'));
  t.deepEqual(s(8).serialize('0100000000000000'), b('0000000000000001'));
  t.deepEqual(
    s(32).serialize(`01${'00'.repeat(31)}`),
    b(`${'00'.repeat(31)}01`)
  );
  t.deepEqual(
    s(32).serialize(`${'00'.repeat(31)}01`),
    b(`01${'00'.repeat(31)}`)
  );

  // Deserialize.
  t.deepEqual(s(2).deserialize(b('ff00')), ['00ff', 2]);
  t.deepEqual(s(2).deserialize(b('00ff')), ['ff00', 2]);
  t.deepEqual(s(4).deserialize(b('00000001')), ['01000000', 4]);
  t.deepEqual(s(4).deserialize(b('01000000')), ['00000001', 4]);
  t.deepEqual(s(4).deserialize(b('aaaa01000000bbbb'), 2), ['00000001', 6]);
  t.deepEqual(s(4).deserialize(b('aaaa00000001bbbb'), 2), ['01000000', 6]);

  // Variable-size serializer.
  t.throws(() => reverseSerializer(base16), {
    message: (m) => m.includes('Cannot reverse a serializer of variable size'),
  });
});
