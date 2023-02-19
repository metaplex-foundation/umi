import {
  DataEnumToSerializerTuple,
  none,
  Serializer,
  utf8,
} from '@metaplex-foundation/umi-core';
import test, { ThrowsExpectation } from 'ava';
import { BeetSerializer, DeserializingEmptyBufferError } from './src';

test('it can serialize fixed', (t) => {
  const { fixed, string, u8, u32, u64, bytes } = new BeetSerializer();

  // Description matches the fixed definition.
  t.is(fixed(12, u64).description, 'fixed(12, u64)');

  // Description can be overridden.
  t.is(fixed(12, u64, 'my fixed').description, 'my fixed');

  // Fixed and max sizes.
  t.is(fixed(12, u64).fixedSize, 12);
  t.is(fixed(12, u64).maxSize, 12);
  t.is(fixed(42, bytes).fixedSize, 42);
  t.is(fixed(42, bytes).maxSize, 42);

  // Buffer size === fixed size.
  t.is(s(fixed(8, u64), 42), '2a00000000000000');
  t.is(d(fixed(8, u64), '2a00000000000000'), 42n);
  t.is(doffset(fixed(8, u64), '2a00000000000000'), 8);
  t.is(sd(fixed(8, u64), 42n), 42n);
  t.is(s(fixed(5, utf8), 'Hello'), '48656c6c6f');
  t.is(d(fixed(5, utf8), '48656c6c6f'), 'Hello');
  t.is(doffset(fixed(5, utf8), '48656c6c6f'), 5);
  t.is(sd(fixed(5, utf8), 'Hello'), 'Hello');

  // Buffer size > fixed size => truncated.
  t.is(s(fixed(4, u64), 42), '2a000000');
  t.is(d(fixed(4, u64), '2a000000'), 42n);
  t.is(doffset(fixed(4, u64), '2a000000'), 4);
  t.is(sd(fixed(4, u64), 42n), 42n);
  t.is(s(fixed(5, string(u8)), 'Hello'), '0548656c6c');
  t.is(d(fixed(5, string(u8)), '0548656c6c'), 'Hell');
  t.is(doffset(fixed(5, string(u8)), '0548656c6c'), 5);
  t.is(sd(fixed(5, string(u8)), 'Hello'), 'Hell');

  // Buffer size < fixed size => padded.
  t.is(s(fixed(8, u32), 42), '2a00000000000000');
  t.is(d(fixed(8, u32), '2a00000000000000'), 42);
  t.is(doffset(fixed(8, u32), '2a00000000000000'), 8);
  t.is(sd(fixed(8, u32), 42), 42);
  t.is(s(fixed(8, utf8), 'Hello'), '48656c6c6f000000');
  t.is(d(fixed(8, utf8), '48656c6c6f000000'), 'Hello');
  t.is(doffset(fixed(8, utf8), '48656c6c6f000000'), 8);
  t.is(sd(fixed(8, utf8), 'Hello'), 'Hello');
});

test('it can handle empty buffers', (t) => {
  const { u8, unit } = new BeetSerializer();
  const tolerant = new BeetSerializer();
  const intolerant = new BeetSerializer({ tolerateEmptyBuffers: false });
  const e: ThrowsExpectation = { instanceOf: DeserializingEmptyBufferError };
  const fixedError = (expectedBytes: number) => ({
    message: (m: string) =>
      m.includes(`Serializer [fixed] expected ${expectedBytes} bytes, got 0.`),
  });
  const empty = (serializer: Serializer<any, any>) =>
    serializer.deserialize(new Uint8Array())[0];

  // Tuple.
  t.throws(() => empty(tolerant.tuple([u8])), e);
  t.throws(() => empty(intolerant.tuple([u8])), e);
  t.deepEqual(empty(tolerant.tuple([])), []);
  t.deepEqual(empty(intolerant.tuple([])), []);

  // Vec.
  t.deepEqual(empty(tolerant.vec(u8)), []);
  t.throws(() => empty(intolerant.vec(u8)), e);

  // Array.
  t.throws(() => empty(tolerant.array(u8, 5)), e);
  t.throws(() => empty(intolerant.array(u8, 5)), e);
  t.deepEqual(empty(tolerant.array(u8, 0)), []);
  t.deepEqual(empty(intolerant.array(u8, 0)), []);

  // Map.
  t.deepEqual(empty(tolerant.map(u8, u8)), new Map());
  t.throws(() => empty(intolerant.map(u8, u8)), e);

  // Set.
  t.deepEqual(empty(tolerant.set(u8)), new Set());
  t.throws(() => empty(intolerant.set(u8)), e);

  // Options.
  t.deepEqual(empty(tolerant.option(u8)), none());
  t.deepEqual(empty(tolerant.fixedOption(u8)), none());
  t.deepEqual(empty(tolerant.nullable(u8)), null);
  t.deepEqual(empty(tolerant.fixedNullable(u8)), null);
  t.throws(() => empty(intolerant.option(u8)), e);
  t.throws(() => empty(intolerant.fixedOption(u8)), e);
  t.throws(() => empty(intolerant.nullable(u8)), e);
  t.throws(() => empty(intolerant.fixedNullable(u8)), e);

  // Struct.
  t.throws(() => empty(tolerant.struct([['age', u8]])), e);
  t.throws(() => empty(intolerant.struct([['age', u8]])), e);
  t.deepEqual(empty(tolerant.struct([])), {});
  t.deepEqual(empty(intolerant.struct([])), {});

  // Enum.
  enum DummyEnum {}
  t.throws(() => empty(tolerant.enum(DummyEnum)), e);
  t.throws(() => empty(intolerant.enum(DummyEnum)), e);

  // DataEnum.
  type DummyDataEnum = { __kind: 'foo' };
  t.throws(() => empty(tolerant.dataEnum<DummyDataEnum>([['foo', unit]])), e);
  t.throws(() => empty(intolerant.dataEnum<DummyDataEnum>([['foo', unit]])), e);

  // Fixed.
  t.throws(() => empty(tolerant.fixed(42, u8)), fixedError(42));
  t.throws(() => empty(intolerant.fixed(42, u8)), fixedError(42));

  // Strings.
  t.throws(() => empty(tolerant.string()), e);
  t.throws(() => empty(intolerant.string()), e);
  t.throws(() => empty(tolerant.fixedString(5)), fixedError(5));
  t.throws(() => empty(intolerant.fixedString(5)), fixedError(5));
  t.is(empty(tolerant.fixedString(0)), '');
  t.is(empty(intolerant.fixedString(0)), '');

  // Bool.
  t.throws(() => empty(tolerant.bool()), e);
  t.throws(() => empty(intolerant.bool()), e);

  // Unit.
  t.is(empty(tolerant.unit), undefined);
  t.is(empty(intolerant.unit), undefined);

  // Numbers.
  t.throws(() => empty(tolerant.u8), e);
  t.throws(() => empty(tolerant.u64), e);
  t.throws(() => empty(intolerant.u8), e);
  t.throws(() => empty(intolerant.u64), e);

  // PublicKey.
  t.throws(() => empty(tolerant.publicKey), e);
  t.throws(() => empty(intolerant.publicKey), e);

  // Bytes.
  t.deepEqual(empty(tolerant.bytes), new Uint8Array());
  t.deepEqual(empty(intolerant.bytes), new Uint8Array());
});
