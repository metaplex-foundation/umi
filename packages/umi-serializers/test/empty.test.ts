import { none } from '@metaplex-foundation/umi-options';
import test, { ThrowsExpectation } from 'ava';
import {
  Serializer,
  array,
  bool,
  bytes,
  dataEnum,
  map,
  nullable,
  option,
  publicKey,
  scalarEnum,
  set,
  string,
  struct,
  tuple,
  u64,
  u8,
  unit,
} from '../src';

test('it can handle empty buffers', (t) => {
  const e: ThrowsExpectation = { name: 'DeserializingEmptyBufferError' };
  const fixedError = (expectedBytes: number): ThrowsExpectation => ({
    message: `Serializer [fixSerializer] expected ${expectedBytes} bytes, got 0.`,
  });
  const empty = (serializer: Serializer<any, any>) =>
    serializer.deserialize(new Uint8Array())[0];

  // Tuple.
  t.throws(() => empty(tuple([u8()])), e);
  t.deepEqual(empty(tuple([])), []);

  // Array.
  t.deepEqual(empty(array(u8())), []);
  t.deepEqual(empty(array(u8(), { size: 'remainder' })), []);
  t.throws(() => empty(array(u8(), { size: 5 })), e);
  t.deepEqual(empty(array(u8(), { size: 0 })), []);

  // Map.
  t.deepEqual(empty(map(u8(), u8())), new Map());
  t.deepEqual(empty(map(u8(), u8(), { size: 'remainder' })), new Map());
  t.throws(() => empty(map(u8(), u8(), { size: 5 })), e);
  t.deepEqual(empty(map(u8(), u8(), { size: 0 })), new Map());

  // Set.
  t.deepEqual(empty(set(u8())), new Set());
  t.deepEqual(empty(set(u8(), { size: 'remainder' })), new Set());
  t.throws(() => empty(set(u8(), { size: 5 })), e);
  t.deepEqual(empty(set(u8(), { size: 0 })), new Set());

  // Option.
  t.deepEqual(empty(option(u8())), none());
  t.deepEqual(empty(option(u8(), { fixed: true })), none());

  // Nullable.
  t.deepEqual(empty(nullable(u8())), null);
  t.deepEqual(empty(nullable(u8(), { fixed: true })), null);

  // Struct.
  t.throws(() => empty(struct([['age', u8()]])), e);
  t.deepEqual(empty(struct([])), {});

  // ScalarEnum.
  enum DummyEnum {}
  t.throws(() => empty(scalarEnum(DummyEnum)), e);

  // DataEnum.
  type DummyDataEnum = { __kind: 'foo' };
  t.throws(() => empty(dataEnum<DummyDataEnum>([['foo', unit()]])), e);

  // Strings.
  t.throws(() => empty(string()), e);
  t.throws(() => empty(string({ size: 5 })), fixedError(5));
  t.is(empty(string({ size: 0 })), '');

  // Bool.
  t.throws(() => empty(bool()), e);

  // Unit.
  t.is(empty(unit()), undefined);

  // Numbers.
  t.throws(() => empty(u8()), e);
  t.throws(() => empty(u64()), e);

  // PublicKey.
  t.throws(() => empty(publicKey()), e);

  // Bytes.
  t.deepEqual(empty(bytes()), new Uint8Array());
  t.deepEqual(empty(bytes({ size: 'variable' })), new Uint8Array());
  t.throws(() => empty(bytes({ size: u8() })), e);
  t.throws(() => empty(bytes({ size: 5 })), fixedError(5));
});
