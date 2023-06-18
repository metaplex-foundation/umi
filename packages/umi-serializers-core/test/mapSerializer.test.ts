import test from 'ava';
import { Serializer, mapSerializer } from '../src';

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
