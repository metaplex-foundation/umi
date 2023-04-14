import test, { ThrowsExpectation } from 'ava';
import { none, Serializer } from '@metaplex-foundation/umi';
import {
  createDataViewSerializer,
  DeserializingEmptyBufferError,
} from '../src';

test('it can handle empty buffers', (t) => {
  const { u8, unit } = createDataViewSerializer();
  const tolerant = createDataViewSerializer();
  const intolerant = createDataViewSerializer({ tolerateEmptyBuffers: false });
  const remainder = { size: 'remainder' } as const;
  const e: ThrowsExpectation = { instanceOf: DeserializingEmptyBufferError };
  const fixedError = (expectedBytes: number) => ({
    message: (m: string) =>
      m.includes(`Fixed serializer expected ${expectedBytes} bytes, got 0.`),
  });
  const empty = (serializer: Serializer<any, any>) =>
    serializer.deserialize(new Uint8Array())[0];

  // Tuple.
  t.throws(() => empty(tolerant.tuple([u8()])), e);
  t.throws(() => empty(intolerant.tuple([u8()])), e);
  t.deepEqual(empty(tolerant.tuple([])), []);
  t.deepEqual(empty(intolerant.tuple([])), []);

  // Array.
  t.deepEqual(empty(tolerant.array(u8())), []);
  t.throws(() => empty(intolerant.array(u8())), e);
  t.deepEqual(empty(tolerant.array(u8(), remainder)), []);
  t.deepEqual(empty(intolerant.array(u8(), remainder)), []);
  t.throws(() => empty(tolerant.array(u8(), { size: 5 })), e);
  t.throws(() => empty(intolerant.array(u8(), { size: 5 })), e);
  t.deepEqual(empty(tolerant.array(u8(), { size: 0 })), []);
  t.deepEqual(empty(intolerant.array(u8(), { size: 0 })), []);

  // Map.
  t.deepEqual(empty(tolerant.map(u8(), u8())), new Map());
  t.throws(() => empty(intolerant.map(u8(), u8())), e);
  t.deepEqual(empty(tolerant.map(u8(), u8(), remainder)), new Map());
  t.deepEqual(empty(intolerant.map(u8(), u8(), remainder)), new Map());
  t.throws(() => empty(tolerant.map(u8(), u8(), { size: 5 })), e);
  t.throws(() => empty(intolerant.map(u8(), u8(), { size: 5 })), e);
  t.deepEqual(empty(tolerant.map(u8(), u8(), { size: 0 })), new Map());
  t.deepEqual(empty(intolerant.map(u8(), u8(), { size: 0 })), new Map());

  // Set.
  t.deepEqual(empty(tolerant.set(u8())), new Set());
  t.throws(() => empty(intolerant.set(u8())), e);
  t.deepEqual(empty(tolerant.set(u8(), remainder)), new Set());
  t.deepEqual(empty(intolerant.set(u8(), remainder)), new Set());
  t.throws(() => empty(tolerant.set(u8(), { size: 5 })), e);
  t.throws(() => empty(intolerant.set(u8(), { size: 5 })), e);
  t.deepEqual(empty(tolerant.set(u8(), { size: 0 })), new Set());
  t.deepEqual(empty(intolerant.set(u8(), { size: 0 })), new Set());

  // Option.
  t.deepEqual(empty(tolerant.option(u8())), none());
  t.throws(() => empty(intolerant.option(u8())), e);
  t.deepEqual(empty(tolerant.option(u8(), { fixed: true })), none());
  t.throws(() => empty(intolerant.option(u8(), { fixed: true })), e);

  // Nullable.
  t.deepEqual(empty(tolerant.nullable(u8())), null);
  t.throws(() => empty(intolerant.nullable(u8())), e);
  t.deepEqual(empty(tolerant.nullable(u8(), { fixed: true })), null);
  t.throws(() => empty(intolerant.nullable(u8(), { fixed: true })), e);

  // Struct.
  t.throws(() => empty(tolerant.struct([['age', u8()]])), e);
  t.throws(() => empty(intolerant.struct([['age', u8()]])), e);
  t.deepEqual(empty(tolerant.struct([])), {});
  t.deepEqual(empty(intolerant.struct([])), {});

  // Enum.
  enum DummyEnum {}
  t.throws(() => empty(tolerant.enum(DummyEnum)), e);
  t.throws(() => empty(intolerant.enum(DummyEnum)), e);

  // DataEnum.
  type DummyDataEnum = { __kind: 'foo' };
  t.throws(() => empty(tolerant.dataEnum<DummyDataEnum>([['foo', unit()]])), e);
  t.throws(
    () => empty(intolerant.dataEnum<DummyDataEnum>([['foo', unit()]])),
    e
  );

  // Strings.
  t.throws(() => empty(tolerant.string()), e);
  t.throws(() => empty(intolerant.string()), e);
  t.throws(() => empty(tolerant.string({ size: 5 })), fixedError(5));
  t.throws(() => empty(intolerant.string({ size: 5 })), fixedError(5));
  t.is(empty(tolerant.string({ size: 0 })), '');
  t.is(empty(intolerant.string({ size: 0 })), '');

  // Bool.
  t.throws(() => empty(tolerant.bool()), e);
  t.throws(() => empty(intolerant.bool()), e);

  // Unit.
  t.is(empty(tolerant.unit()), undefined);
  t.is(empty(intolerant.unit()), undefined);

  // Numbers.
  t.throws(() => empty(tolerant.u8()), e);
  t.throws(() => empty(tolerant.u64()), e);
  t.throws(() => empty(intolerant.u8()), e);
  t.throws(() => empty(intolerant.u64()), e);

  // PublicKey.
  t.throws(() => empty(tolerant.publicKey()), e);
  t.throws(() => empty(intolerant.publicKey()), e);

  // Bytes.
  t.deepEqual(empty(tolerant.bytes()), new Uint8Array());
  t.deepEqual(empty(intolerant.bytes()), new Uint8Array());
  t.deepEqual(empty(tolerant.bytes({ size: 'variable' })), new Uint8Array());
  t.deepEqual(empty(intolerant.bytes({ size: 'variable' })), new Uint8Array());
  t.throws(() => empty(tolerant.bytes({ size: u8() })), e);
  t.throws(() => empty(intolerant.bytes({ size: u8() })), e);
  t.throws(() => empty(tolerant.bytes({ size: 5 })), fixedError(5));
  t.throws(() => empty(intolerant.bytes({ size: 5 })), fixedError(5));
});
