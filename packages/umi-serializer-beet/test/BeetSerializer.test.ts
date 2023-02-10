import {
  base16,
  base58,
  DataEnumToSerializerTuple,
  none,
  publicKey as toPublicKey,
  Serializer,
  some,
  utf8,
} from '@metaplex-foundation/umi-core';
import { Keypair as Web3Keypair } from '@solana/web3.js';
import test, { ThrowsExpectation } from 'ava';
import {
  BeetSerializer,
  DeserializingEmptyBufferError,
  OperationNotSupportedError,
} from '../src';

test('it can serialize units', (t) => {
  const { unit } = new BeetSerializer();
  t.is(unit.description, 'unit');
  t.is(unit.fixedSize, 0);
  t.is(unit.maxSize, 0);
  t.is(s(unit, undefined), '');
  t.is(sd(unit, undefined), undefined);
  // eslint-disable-next-line no-void
  t.is(s(unit, void 0), '');
  // eslint-disable-next-line no-void
  t.is(sd(unit, void 0), void 0);
  t.is(d(unit, ''), undefined);
  t.is(d(unit, '00'), undefined);
  t.is(doffset(unit, '00'), 0);
  t.is(doffset(unit, '00', 1), 1);
});

test('it can serialize booleans', (t) => {
  const { bool, u32 } = new BeetSerializer();
  t.is(bool().description, 'bool(u8)');
  t.is(bool().fixedSize, 1);
  t.is(bool().maxSize, 1);
  t.is(s(bool(), false), '00');
  t.is(s(bool(), true), '01');
  t.is(d(bool(), '00'), false);
  t.is(d(bool(), '01'), true);
  t.is(d(bool(), '0001', 0), false);
  t.is(d(bool(), '0001', 1), true);
  t.is(sd(bool(), false), false);
  t.is(sd(bool(), true), true);
  t.is(doffset(bool(), '01'), 1);
  t.is(doffset(bool(), '0100'), 1);
  t.is(doffset(bool(), '0100', 1), 2);

  // Booleans with different sizes.
  t.is(bool(u32).description, 'bool(u32)');
  t.is(bool(u32).fixedSize, 4);
  t.is(bool(u32).maxSize, 4);
  t.is(s(bool(u32), false), '00000000');
  t.is(d(bool(u32), '00000000', 0), false);
  t.is(doffset(bool(u32), '00000000', 0), 4);
  t.is(s(bool(u32), true), '01000000');
  t.is(d(bool(u32), '01000000', 0), true);
  t.is(doffset(bool(u32), '01000000', 0), 4);

  // Booleans with custom descriptions.
  t.is(bool(undefined, 'My boolean').description, 'My boolean');
});

test('it can serialize u8 numbers', (t) => {
  const { u8 } = new BeetSerializer();
  t.is(u8.description, 'u8');
  t.is(u8.fixedSize, 1);
  t.is(u8.maxSize, 1);
  t.is(s(u8, 0), '00');
  t.is(s(u8, 42), '2a');
  t.is(s(u8, 255), 'ff');
  t.is(d(u8, '2aff', 0), 42);
  t.is(d(u8, '2aff', 1), 255);
  t.is(sd(u8, 0), 0);
  t.is(sd(u8, 42), 42);
  t.is(sd(u8, 255), 255);
  t.throws<RangeError>(() => s(u8, -1));
  t.throws<RangeError>(() => s(u8, 256));
  t.is(doffset(u8, '01'), 1);
  t.is(doffset(u8, '0101'), 1);
});

test('it can serialize u16 numbers', (t) => {
  const { u16 } = new BeetSerializer();
  t.is(u16.description, 'u16');
  t.is(u16.fixedSize, 2);
  t.is(u16.maxSize, 2);
  t.is(s(u16, 0), '0000');
  t.is(s(u16, 42), '2a00');
  t.is(s(u16, 255), 'ff00');
  t.is(s(u16, 256), '0001');
  t.is(s(u16, 65535), 'ffff');
  t.is(sd(u16, 0), 0);
  t.is(sd(u16, 42), 42);
  t.is(sd(u16, 65535), 65535);
  t.throws<RangeError>(() => s(u16, -1));
  t.throws<RangeError>(() => s(u16, 65536));
});

test('it can serialize u32 numbers', (t) => {
  const { u32 } = new BeetSerializer();
  const max = Number('0xffffffff');
  t.is(u32.description, 'u32');
  t.is(u32.fixedSize, 4);
  t.is(u32.maxSize, 4);
  t.is(s(u32, 0), '00000000');
  t.is(s(u32, 42), '2a000000');
  t.is(s(u32, 65536), '00000100');
  t.is(s(u32, max), 'ffffffff');
  t.is(sd(u32, 0), 0);
  t.is(sd(u32, 42), 42);
  t.is(sd(u32, max), max);
  t.throws<RangeError>(() => s(u32, -1));
  t.throws<RangeError>(() => s(u32, 4_294_967_296));
});

test('it can serialize u64 numbers', (t) => {
  const { u64 } = new BeetSerializer();
  const max = BigInt('0xffffffffffffffff');
  t.is(u64.description, 'u64');
  t.is(u64.fixedSize, 8);
  t.is(u64.maxSize, 8);
  t.is(s(u64, 0), '0000000000000000');
  t.is(s(u64, 42), '2a00000000000000');
  t.is(s(u64, 4_294_967_295), 'ffffffff00000000');
  t.is(s(u64, max), 'ffffffffffffffff');
  t.is(sd(u64, 0), 0n);
  t.is(sd(u64, 42), 42n);
  t.is(sd(u64, max), max);
  t.throws<RangeError>(() => s(u64, -1));
  t.throws<RangeError>(() => s(u64, max + 1n));
});

test('it can serialize u128 numbers', (t) => {
  const { u128 } = new BeetSerializer();
  const max = BigInt('0xffffffffffffffffffffffffffffffff');
  t.is(u128.description, 'u128');
  t.is(u128.fixedSize, 16);
  t.is(u128.maxSize, 16);
  t.is(s(u128, 0), '00000000000000000000000000000000');
  t.is(s(u128, 42), '2a000000000000000000000000000000');
  t.is(s(u128, max), 'ffffffffffffffffffffffffffffffff');
  t.is(sd(u128, 0), 0n);
  t.is(sd(u128, 42), 42n);
  t.is(sd(u128, max), max);
  t.throws<RangeError>(() => s(u128, -1));
  t.throws<RangeError>(() => s(u128, max + 1n));
});

test('it can serialize i8 numbers', (t) => {
  const { i8 } = new BeetSerializer();
  t.is(i8.description, 'i8');
  t.is(i8.fixedSize, 1);
  t.is(i8.maxSize, 1);
  t.is(s(i8, 0), '00');
  t.is(s(i8, -0), '00');
  t.is(s(i8, -42), 'd6');
  t.is(s(i8, 42), '2a');
  t.is(s(i8, 127), '7f');
  t.is(sd(i8, 0), 0);
  t.is(sd(i8, -128), -128);
  t.is(sd(i8, 127), 127);
  t.throws<RangeError>(() => s(i8, -129));
  t.throws<RangeError>(() => s(i8, 128));
});

test('it can serialize i16 numbers', (t) => {
  const { i16 } = new BeetSerializer();
  t.is(i16.description, 'i16');
  t.is(i16.fixedSize, 2);
  t.is(i16.maxSize, 2);
  t.is(s(i16, 0), '0000');
  t.is(s(i16, -42), 'd6ff');
  t.is(s(i16, 42), '2a00');
  t.is(s(i16, 32767), 'ff7f');
  t.is(sd(i16, 0), 0);
  t.is(sd(i16, -32768), -32768);
  t.is(sd(i16, 32767), 32767);
  t.throws<RangeError>(() => s(i16, -32769));
  t.throws<RangeError>(() => s(i16, 32768));
});

test('it can serialize i32 numbers', (t) => {
  const { i32 } = new BeetSerializer();
  const max = Math.floor(Number('0xffffffff') / 2);
  t.is(i32.description, 'i32');
  t.is(i32.fixedSize, 4);
  t.is(i32.maxSize, 4);
  t.is(s(i32, 0), '00000000');
  t.is(s(i32, -42), 'd6ffffff');
  t.is(s(i32, 42), '2a000000');
  t.is(s(i32, max), 'ffffff7f');
  t.is(sd(i32, 0), 0);
  t.is(sd(i32, -max - 1), -max - 1);
  t.is(sd(i32, max), max);
  t.throws<RangeError>(() => s(i32, -max - 2));
  t.throws<RangeError>(() => s(i32, max + 1));
});

test('it can serialize i64 numbers', (t) => {
  const { i64 } = new BeetSerializer();
  const max = BigInt('0xffffffffffffffff') / 2n;
  t.is(i64.description, 'i64');
  t.is(i64.fixedSize, 8);
  t.is(i64.maxSize, 8);
  t.is(s(i64, 0), '0000000000000000');
  t.is(s(i64, -42), 'd6ffffffffffffff');
  t.is(s(i64, 42), '2a00000000000000');
  t.is(s(i64, max), 'ffffffffffffff7f');
  t.is(sd(i64, 0), 0n);
  t.is(sd(i64, -42), -42n);
  t.is(sd(i64, -max - 1n), -max - 1n);
  t.is(sd(i64, max), max);
  t.throws<RangeError>(() => s(i64, -max - 2n));
  t.throws<RangeError>(() => s(i64, max + 1n));
});

test('it can serialize i128 numbers', (t) => {
  const { i128 } = new BeetSerializer();
  const max = BigInt('0xffffffffffffffffffffffffffffffff') / 2n;
  t.is(i128.description, 'i128');
  t.is(i128.fixedSize, 16);
  t.is(i128.maxSize, 16);
  t.is(s(i128, 0), '00000000000000000000000000000000');
  t.is(s(i128, -42), 'd6ffffffffffffffffffffffffffffff');
  t.is(s(i128, 42), '2a000000000000000000000000000000');
  t.is(s(i128, max), 'ffffffffffffffffffffffffffffff7f');
  t.is(sd(i128, 0), 0n);
  t.is(sd(i128, -42), -42n);
  t.is(sd(i128, -max - 1n), -max - 1n);
  t.is(sd(i128, max), max);
  t.throws<RangeError>(() => s(i128, -max - 2n));
  t.throws<RangeError>(() => s(i128, max + 1n));
});

test('it cannot serialize float numbers', (t) => {
  const { f32, f64 } = new BeetSerializer();
  const throwExpectation = { name: 'OperationNotSupportedError' };
  t.throws<OperationNotSupportedError>(() => s(f32, 1.5), throwExpectation);
  t.throws<OperationNotSupportedError>(() => d(f32, '00'), throwExpectation);
  t.throws<OperationNotSupportedError>(() => s(f64, 42.6), throwExpectation);
  t.throws<OperationNotSupportedError>(() => d(f64, '00'), throwExpectation);
  t.is(f32.fixedSize, 4);
  t.is(f32.maxSize, 4);
  t.is(f64.fixedSize, 8);
  t.is(f64.maxSize, 8);
});

test('it can serialize strings', (t) => {
  const { string, u32, u8 } = new BeetSerializer();
  const getPrefix = (text: string) => d(u32, s(string(), text).slice(0, 8));
  t.is(string().description, 'string(u32, utf8)');
  t.is(string(undefined, undefined, 'My string').description, 'My string');
  t.is(string().fixedSize, null);
  t.is(string().maxSize, null);
  t.is(s(string(), ''), '00000000'); // 4-bytes prefix.
  t.is(s(string(), 'Hello World!'), '0c00000048656c6c6f20576f726c6421');
  t.is(getPrefix('Hello World!'), 12); // 12 bytes for 12 characters.
  t.is(s(string(), '語'), '03000000e8aa9e');
  t.is(getPrefix('語'), 3); // 3 bytes for 1 character.
  t.is(sd(string(), ''), '');
  t.is(sd(string(), 'Hello World!'), 'Hello World!');
  t.is(sd(string(), '語'), '語');
  t.is(doffset(string(), '0c00000048656c6c6f20576f726c6421'), 4 + 12);
  t.is(doffset(string(), '03000000e8aa9e'), 4 + 3);

  // Strings with different prefix lengths.
  t.is(string(u8).description, 'string(u8, utf8)');
  t.is(s(string(u8), 'ABC'), '03414243');
  t.is(d(string(u8), '03414243'), 'ABC');
  t.is(doffset(string(u8), '03414243'), 1 + 3);

  // Strings with different content serializers.
  t.is(string(u8, base58).description, 'string(u8, base58)');
  t.is(s(string(u8, base58), 'ABC'), '027893');
  t.is(d(string(u8, base58), '027893'), 'ABC');
  t.is(doffset(string(u8, base58), '027893'), 1 + 2);
});

test('it can serialize fixed strings', (t) => {
  const { fixedString } = new BeetSerializer();
  t.is(fixedString(42).description, 'fixedString(42, utf8)');
  t.is(fixedString(42, undefined, 'My string').description, 'My string');
  t.is(fixedString(42).fixedSize, 42);
  t.is(fixedString(42).maxSize, 42);

  // Fixed size.
  t.is(s(fixedString(12), 'Hello World!'), '48656c6c6f20576f726c6421');
  t.is(d(fixedString(12), '48656c6c6f20576f726c6421'), 'Hello World!');
  t.is(doffset(fixedString(12), '48656c6c6f20576f726c6421'), 12);
  t.is(sd(fixedString(12), 'Hello World!'), 'Hello World!');

  // Padding is added when the string is shorter than the fixed size.
  t.is(s(fixedString(12), ''), '0'.repeat(24));
  t.is(d(fixedString(12), '0'.repeat(24)), '');
  t.is(doffset(fixedString(12), '0'.repeat(24)), 12);
  t.is(s(fixedString(5), '語'), 'e8aa9e0000');
  t.is(d(fixedString(5), 'e8aa9e0000'), '語');
  t.is(doffset(fixedString(5), 'e8aa9e0000'), 5);

  // String is truncated when it is longer than the fixed size.
  t.is(s(fixedString(5), 'Hello World!'), '48656c6c6f');
  t.is(d(fixedString(5), '48656c6c6f20576f726c6421'), 'Hello');
  t.is(doffset(fixedString(5), '48656c6c6f20576f726c6421'), 5);
  t.is(sd(fixedString(5), 'Hello World!'), 'Hello');

  // Fixed strings with different content serializers.
  t.is(fixedString(5, base58).description, 'fixedString(5, base58)');
  t.is(s(fixedString(5, base58), 'ABC'), '7893000000');
  t.is(d(fixedString(5, base58), '7893000000'), 'EbzinYo'); // <- Base58 expect left padding.
  t.is(d(fixedString(5, base58), '0000007893'), '111ABC'); // <- And uses 1s for padding.
  t.is(doffset(fixedString(5, base58), '7893000000'), 5);
});

test('it can serialize bytes', (t) => {
  const { bytes } = new BeetSerializer();
  t.is(bytes.description, 'bytes');
  t.is(bytes.fixedSize, null);
  t.is(s(bytes, new Uint8Array([0])), '00');
  t.is(s(bytes, new Uint8Array([42, 255])), '2aff');
  t.deepEqual(sd(bytes, new Uint8Array([42, 255])), new Uint8Array([42, 255]));
  t.is(doffset(bytes, '2aff00'), 3);
});

test('it can serialize public keys', (t) => {
  const { publicKey } = new BeetSerializer();
  t.is(publicKey.description, 'publicKey');
  t.is(publicKey.fixedSize, 32);
  t.is(publicKey.maxSize, 32);
  const generatedPubKey = toPublicKey(
    Web3Keypair.generate().publicKey.toBytes()
  );
  const pubKeyString = '4HM9LW2rm3SR2ZdBiFK3D21ENmQWpqEJEhx1nfgcC3r9';
  const pubKey = toPublicKey(pubKeyString);
  const pubKeyHex = base16.deserialize(pubKey.bytes)[0];
  t.is(
    s(publicKey, generatedPubKey),
    base16.deserialize(generatedPubKey.bytes)[0]
  );
  t.is(s(publicKey, pubKeyString), pubKeyHex);
  t.is(s(publicKey, pubKey), pubKeyHex);
  t.deepEqual(sd(publicKey, pubKeyString), pubKey);
  t.deepEqual(sd(publicKey, pubKey), pubKey);
  t.deepEqual(sd(publicKey, generatedPubKey), generatedPubKey);
  const throwExpectation = {
    message: (m: string) => m.includes('Invalid public key'),
  };
  t.throws(() => s(publicKey, ''), throwExpectation);
  t.throws(() => s(publicKey, 'x'), throwExpectation);
  t.throws(() => s(publicKey, 'x'.repeat(32)), throwExpectation);
  t.is(doffset(publicKey, pubKeyHex), 32);
});

test('it can serialize tuples', (t) => {
  const { tuple, u8, u64, string, i16 } = new BeetSerializer();

  // Description matches the tuple definition.
  t.is(tuple([u8]).description, 'tuple(u8)');
  t.is(
    tuple([u8, string(), i16]).description,
    'tuple(u8, string(u32, utf8), i16)'
  );

  // Description can be overridden.
  t.is(tuple([u8], 'my tuple').description, 'my tuple');

  // Example with a single element.
  const single = tuple([u8]);
  t.is(single.fixedSize, 1);
  t.is(single.maxSize, 1);
  t.is(s(single, [42]), '2a');
  t.deepEqual(sd(single, [1]), [1]);
  t.is(doffset(single, '2a'), 1);

  // Example with two numbers.
  const twoNumbers = tuple([u8, i16]);
  t.is(twoNumbers.fixedSize, 1 + 2);
  t.is(s(twoNumbers, [0, -42]), '00d6ff');
  t.deepEqual(sd(twoNumbers, [1, -2]), [1, -2]);
  t.is(doffset(twoNumbers, '00d6ff'), 3);

  // More examples.
  t.deepEqual(sd(tuple([]), []), []);
  t.deepEqual(sd(tuple([string(), u8]), ['Hello', 42]), ['Hello', 42]);
  t.deepEqual(sd(tuple([string(), string()]), ['a', 'b']), ['a', 'b']);
  t.deepEqual(sd(tuple([u8, string(), u8]), [1, '語', 2]), [1, '語', 2]);
  t.is(tuple([]).fixedSize, 0);
  t.is(tuple([string(), u8]).fixedSize, null);

  // Example with different From and To types.
  const tU8U64 = tuple<[number, number | bigint], [number, bigint]>([u8, u64]);
  t.deepEqual(s(tU8U64, [1, 2]), '010200000000000000');
  t.deepEqual(s(tU8U64, [1, 2n]), '010200000000000000');
  t.deepEqual(s(tU8U64, [1, 2n ** 63n]), '010000000000000080');
  t.deepEqual(d(tU8U64, '010200000000000000'), [1, 2n]);
  t.deepEqual(d(tU8U64, '010000000000000080'), [1, 2n ** 63n]);
  t.notDeepEqual(d(tU8U64, '010200000000000000'), [1, 2]);

  // Invalid input.
  t.throws(() => s(tuple([u8]), [] as any), {
    message: (m: string) =>
      m.includes('Expected tuple to have 1 items but got 0.'),
  });
  t.throws(() => s(tuple([u8, string()]), [1, 2, 'three'] as any), {
    message: (m: string) =>
      m.includes('Expected tuple to have 2 items but got 3.'),
  });
});

test('it can serialize vectors', (t) => {
  const { vec, u8, u64, string } = new BeetSerializer();

  // Description matches the vec definition.
  t.is(vec(u8).description, 'vec(u8)');
  t.is(vec(string()).description, 'vec(string(u32, utf8))');

  // Description can be overridden.
  t.is(vec(u8, undefined, 'my vec').description, 'my vec');

  // Example with numbers.
  const number = vec(u8);
  t.is(number.fixedSize, null);
  t.is(number.maxSize, null);
  t.is(s(number, []), '00000000');
  t.is(s(number, [42]), '010000002a');
  t.is(s(number, [1, 2, 3]), '03000000010203');
  t.deepEqual(d(number, 'ff010000002a', 1), [42]);
  t.deepEqual(sd(number, [42]), [42]);
  t.deepEqual(sd(number, [1, 2, 3]), [1, 2, 3]);
  t.is(doffset(number, '010000002a'), 4 + 1);
  t.is(doffset(number, '03000000010203'), 4 + 3);

  // More examples.
  t.deepEqual(sd(vec(string()), []), []);
  t.deepEqual(sd(vec(string()), ['a', 'b', '語']), ['a', 'b', '語']);

  // Example with different From and To types.
  const vecU64 = vec<number | bigint, bigint>(u64);
  t.deepEqual(s(vecU64, [2]), '010000000200000000000000');
  t.deepEqual(d(vecU64, '010000000200000000000000'), [2n]);
});

test('it can serialize arrays', (t) => {
  const { array, u8, u64, string } = new BeetSerializer();

  // Description matches the vec definition.
  t.is(array(u8, 5).description, 'array(u8; 5)');
  t.is(array(string(), 1).description, 'array(string(u32, utf8); 1)');

  // Description can be overridden.
  t.is(array(u8, 10, 'my array').description, 'my array');

  // Example with a single item.
  const single = array(u8, 1);
  t.is(single.fixedSize, 1);
  t.is(single.maxSize, 1);
  t.is(s(single, [1]), '01');
  t.is(s(single, [42]), '2a');
  t.deepEqual(d(single, 'ff2a', 1), [42]);
  t.deepEqual(sd(single, [42]), [42]);
  t.is(doffset(single, '2a'), 1);
  t.is(doffset(single, 'ff2a', 1), 2);

  // More examples.
  t.deepEqual(sd(array(string(), 0), []), []);
  t.deepEqual(sd(array(string(), 1), ['Hello']), ['Hello']);
  t.deepEqual(sd(array(string(), 3), ['a', 'b', '語']), ['a', 'b', '語']);
  t.deepEqual(sd(array(u8, 5), [1, 2, 3, 4, 5]), [1, 2, 3, 4, 5]);
  t.is(array(u8, 0).fixedSize, 0);
  t.is(array(u8, 5).fixedSize, 5);
  t.is(array(u64, 3).fixedSize, 24);
  t.is(array(string(), 0).fixedSize, 0);
  t.is(array(string(), 1).fixedSize, null);
  t.is(array(string(), 5).fixedSize, null);

  // Example with different From and To types.
  const arrayU64 = array<number | bigint, bigint>(u64, 1);
  t.deepEqual(s(arrayU64, [2]), '0200000000000000');
  t.deepEqual(d(arrayU64, '0200000000000000'), [2n]);

  // Invalid input.
  t.throws(() => s(array(u8, 1), []), {
    message: (m: string) =>
      m.includes('Expected array to have 1 items but got 0.'),
  });
  t.throws(() => s(array(string(), 2), ['a', 'b', 'c']), {
    message: (m: string) =>
      m.includes('Expected array to have 2 items but got 3.'),
  });
});

test('it can serialize maps', (t) => {
  const { map, u8, u64, string } = new BeetSerializer();

  // Description matches the vec definition.
  t.is(map(u8, u8).description, 'map(u8, u8)');
  t.is(map(string(), u8).description, 'map(string(u32, utf8), u8)');

  // Description can be overridden.
  t.is(map(string(), string(), undefined, 'my map').description, 'my map');

  // Examples with numbers.
  const numberMap = map(u8, u8);
  t.is(numberMap.fixedSize, null);
  t.is(numberMap.maxSize, null);
  t.is(s(numberMap, new Map()), '00000000');
  t.is(s(numberMap, new Map([[1, 2]])), '010000000102');
  t.deepEqual(d(numberMap, '010000000102'), new Map([[1, 2]]));
  t.deepEqual(sd(numberMap, new Map()), new Map());
  t.deepEqual(sd(numberMap, new Map([[1, 2]])), new Map([[1, 2]]));
  t.is(doffset(numberMap, '00000000'), 4);
  t.is(doffset(numberMap, '010000000102'), 4 + 2);
  t.is(doffset(numberMap, 'ff010000000102', 1), 1 + 4 + 2);

  // Example with strings and numbers.
  const letterMap = map(string(), u8);
  t.is(s(letterMap, new Map()), '00000000');
  const letters = new Map([
    ['a', 1],
    ['b', 2],
  ]);
  t.is(
    s(letterMap, letters),
    '02000000' + // 2 items.
      '0100000061' + // String 'a'.
      '01' + // Number 1.
      '0100000062' + // String 'b'.
      '02' // Number 2.
  );
  t.deepEqual(d(letterMap, 'ff00000000', 1), new Map());
  t.deepEqual(sd(letterMap, new Map()), new Map());
  t.deepEqual(sd(letterMap, letters), letters);
  t.is(doffset(letterMap, '00000000'), 4);

  // Example with different From and To types.
  const mapU8U64 = map<number, number | bigint, number, bigint>(u8, u64);
  t.deepEqual(s(mapU8U64, new Map().set(42, 2)), '010000002a0200000000000000');
  t.deepEqual(d(mapU8U64, '010000002a0200000000000000'), new Map().set(42, 2n));
});

test('it can serialize sets', (t) => {
  const { set, u8, u64, string } = new BeetSerializer();

  // Description matches the vec definition.
  t.is(set(u8).description, 'set(u8)');
  t.is(set(string()).description, 'set(string(u32, utf8))');

  // Description can be overridden.
  t.is(set(string(), undefined, 'my set').description, 'my set');

  // Examples with numbers.
  t.is(set(u8).fixedSize, null);
  t.is(set(u8).maxSize, null);
  t.is(s(set(u8), new Set()), '00000000');
  t.is(s(set(u8), new Set([1, 2, 3])), '03000000010203');
  t.deepEqual(d(set(u8), '03000000010203'), new Set([1, 2, 3]));
  t.deepEqual(sd(set(u8), new Set()), new Set());
  t.deepEqual(sd(set(u8), new Set([1, 2, 3])), new Set([1, 2, 3]));
  t.is(doffset(set(u8), '00000000'), 4);
  t.is(doffset(set(u8), '03000000010203'), 4 + 3);
  t.is(doffset(set(u8), 'ff03000000010203', 1), 1 + 4 + 3);

  // Example with strings.
  t.is(s(set(string()), new Set()), '00000000');
  t.is(
    s(set(string()), new Set(['a', 'b', 'c'])),
    '03000000' + // 3 items.
      '0100000061' + // String 'a'.
      '0100000062' + // String 'b'.
      '0100000063' // String 'b'.
  );
  t.deepEqual(d(set(string()), 'ff00000000', 1), new Set());
  t.deepEqual(sd(set(string()), new Set()), new Set());
  t.deepEqual(sd(set(string()), new Set(['語'])), new Set(['語']));

  // Example with different From and To types.
  const setU64 = set<number | bigint, bigint>(u64);
  t.deepEqual(s(setU64, new Set([2])), '010000000200000000000000');
  t.deepEqual(d(setU64, '010000000200000000000000'), new Set([2n]));
});

test('it can serialize options', (t) => {
  const { option, unit, u8, u32, u64, string } = new BeetSerializer();

  // Description matches the option definition.
  t.is(option(u8).description, 'option(u8)');
  t.is(option(string()).description, 'option(string(u32, utf8))');

  // Description can be overridden.
  t.is(option(string(), undefined, 'my option').description, 'my option');

  // Fixed size.
  t.is(option(unit).fixedSize, 1);
  t.is(option(u8).fixedSize, null);
  t.is(option(u64).fixedSize, null);
  t.is(option(string()).fixedSize, null);

  // Max size.
  t.is(option(unit).maxSize, 1);
  t.is(option(u8).maxSize, 1 + 1);
  t.is(option(u64).maxSize, 1 + 8);
  t.is(option(string()).maxSize, null);

  // Examples with none.
  t.is(s(option(u8), none()), '00');
  t.is(s(option(string()), none<string>()), '00');
  t.deepEqual(d(option(u8), '00'), none());
  t.deepEqual(d(option(u8), 'ffff00', 2), none());
  t.deepEqual(sd(option(u8), none()), none());

  // Examples with numbers.
  t.is(s(option(u8), some(42)), '012a');
  t.deepEqual(d(option(u8), '012a'), some(42));
  t.deepEqual(d(option(u8), 'ff012a', 1), some(42));
  t.deepEqual(sd(option(u8), some(0)), some(0));
  t.deepEqual(sd(option(u8), some(1)), some(1));
  t.is(doffset(option(u8), '012a'), 1 + 1);
  t.is(doffset(option(u8), 'ffffffff012a', 4), 4 + 1 + 1);

  // Example with strings.
  t.deepEqual(sd(option(string()), some('Hello')), some('Hello'));
  t.deepEqual(sd(option(string()), some('語')), some('語'));

  // Example with different From and To types.
  const optionU64 = option<number | bigint, bigint>(u64);
  t.deepEqual(s(optionU64, some(2)), '010200000000000000');
  t.deepEqual(d(optionU64, '010200000000000000'), some(2n));

  // Custom prefix serializer
  t.is(option(u8, u32).fixedSize, null);
  t.is(option(u8, u32).maxSize, 4 + 1);
  t.is(s(option(u8, u32), some(42)), '010000002a');
  t.deepEqual(d(option(u8, u32), '010000002a'), some(42));
});

test('it can serialize fixed options', (t) => {
  const { fixedOption, unit, u8, u32, u64, string } = new BeetSerializer();

  // Description matches the fixed option definition.
  t.is(fixedOption(u8).description, 'fixedOption(u8)');

  // Description can be overridden.
  t.is(fixedOption(u8, undefined, 'my option').description, 'my option');

  // Fixed options must have fixed size.
  t.is(fixedOption(unit).fixedSize, 1);
  t.is(fixedOption(unit).maxSize, 1);
  t.is(fixedOption(u8).fixedSize, 1 + 1);
  t.is(fixedOption(u8).maxSize, 1 + 1);
  t.is(fixedOption(u64).fixedSize, 1 + 8);
  t.is(fixedOption(u64).maxSize, 1 + 8);
  t.throws(() => fixedOption(string()), {
    message: (m: string) =>
      m.includes('fixedOption can only be used with fixed size serializers'),
  });

  // Examples with some.
  t.is(s(fixedOption(u64), some(42)), '012a00000000000000');
  t.deepEqual(d(fixedOption(u64), '012a00000000000000'), some(42n));
  t.deepEqual(doffset(fixedOption(u64), '012a00000000000000'), 1 + 8);
  t.deepEqual(d(fixedOption(u64), 'ffff012a00000000000000', 2), some(42n));
  t.deepEqual(sd(fixedOption(u64), some(42n)), some(42n));

  // Examples with none.
  t.is(s(fixedOption(u64), none()), '000000000000000000');
  t.deepEqual(d(fixedOption(u64), '000000000000000000'), none());
  t.deepEqual(doffset(fixedOption(u64), '000000000000000000'), 1 + 8);
  t.deepEqual(d(fixedOption(u64), 'ffff000000000000000000', 2), none());
  t.deepEqual(sd(fixedOption(u64), none()), none());

  // Example with different From and To types.
  const optionU64 = fixedOption<number | bigint, bigint>(u64);
  t.deepEqual(s(optionU64, some(2)), '010200000000000000');
  t.deepEqual(d(optionU64, '010200000000000000'), some(2n));

  // Custom prefix serializer
  t.is(fixedOption(u8, u32).fixedSize, 4 + 1);
  t.is(fixedOption(u8, u32).maxSize, 4 + 1);
  t.is(s(fixedOption(u8, u32), some(42)), '010000002a');
  t.deepEqual(d(fixedOption(u8, u32), '010000002a'), some(42));
});

test('it can serialize nullables', (t) => {
  const { nullable, unit, u8, u32, u64, string } = new BeetSerializer();

  // Description matches the nullable definition.
  t.is(nullable(u8).description, 'nullable(u8)');
  t.is(nullable(string()).description, 'nullable(string(u32, utf8))');

  // Description can be overridden.
  t.is(nullable(string(), undefined, 'my nullable').description, 'my nullable');

  // Fixed size.
  t.is(nullable(unit).fixedSize, 1);
  t.is(nullable(u8).fixedSize, null);
  t.is(nullable(u64).fixedSize, null);
  t.is(nullable(string()).fixedSize, null);

  // Max size.
  t.is(nullable(unit).maxSize, 1);
  t.is(nullable(u8).maxSize, 1 + 1);
  t.is(nullable(u64).maxSize, 1 + 8);
  t.is(nullable(string()).maxSize, null);

  // Examples with numbers.
  t.is(s(nullable(u8), null), '00');
  t.is(s(nullable(u8), 42), '012a');
  t.is(d(nullable(u8), '012a'), 42);
  t.is(d(nullable(u8), 'ff012a', 1), 42);
  t.is(d(nullable(u8), 'ffff00', 2), null);
  t.is(sd(nullable(u8), null), null);
  t.is(sd(nullable(u8), 0), 0);
  t.is(sd(nullable(u8), 1), 1);
  t.is(doffset(nullable(u8), '012a'), 1 + 1);
  t.is(doffset(nullable(u8), 'ffffffff012a', 4), 4 + 1 + 1);

  // More examples.
  t.is(sd(nullable(string()), null), null);
  t.is(sd(nullable(string()), 'Hello'), 'Hello');
  t.is(sd(nullable(string()), '語'), '語');

  // Example with different From and To types.
  const nullableU64 = nullable<number | bigint, bigint>(u64);
  t.deepEqual(s(nullableU64, 2), '010200000000000000');
  t.deepEqual(d(nullableU64, '010200000000000000'), 2n);

  // Custom prefix serializer
  t.is(nullable(u8, u32).fixedSize, null);
  t.is(nullable(u8, u32).maxSize, 4 + 1);
  t.is(s(nullable(u8, u32), 42), '010000002a');
  t.is(d(nullable(u8, u32), '010000002a'), 42);
});

test('it can serialize fixed nullables', (t) => {
  const { fixedNullable, unit, u8, u32, u64, string } = new BeetSerializer();

  // Description matches the fixed nullable definition.
  t.is(fixedNullable(u8).description, 'fixedNullable(u8)');

  // Description can be overridden.
  t.is(fixedNullable(u8, undefined, 'my nullable').description, 'my nullable');

  // Fixed nullables must have fixed size.
  t.is(fixedNullable(unit).fixedSize, 1);
  t.is(fixedNullable(unit).maxSize, 1);
  t.is(fixedNullable(u8).fixedSize, 1 + 1);
  t.is(fixedNullable(u8).maxSize, 1 + 1);
  t.is(fixedNullable(u64).fixedSize, 1 + 8);
  t.is(fixedNullable(u64).maxSize, 1 + 8);
  t.throws(() => fixedNullable(string()), {
    message: (m: string) =>
      m.includes('fixedNullable can only be used with fixed size serializers'),
  });

  // Examples with some.
  t.is(s(fixedNullable(u64), 42), '012a00000000000000');
  t.deepEqual(d(fixedNullable(u64), '012a00000000000000'), 42n);
  t.deepEqual(doffset(fixedNullable(u64), '012a00000000000000'), 1 + 8);
  t.deepEqual(d(fixedNullable(u64), 'ffff012a00000000000000', 2), 42n);
  t.deepEqual(sd(fixedNullable(u64), 42n), 42n);

  // Examples with none.
  t.is(s(fixedNullable(u64), null), '000000000000000000');
  t.deepEqual(d(fixedNullable(u64), '000000000000000000'), null);
  t.deepEqual(doffset(fixedNullable(u64), '000000000000000000'), 1 + 8);
  t.deepEqual(d(fixedNullable(u64), 'ffff000000000000000000', 2), null);
  t.deepEqual(sd(fixedNullable(u64), null), null);

  // Example with different From and To types.
  const optionU64 = fixedNullable<number | bigint, bigint>(u64);
  t.deepEqual(s(optionU64, 2), '010200000000000000');
  t.deepEqual(d(optionU64, '010200000000000000'), 2n);

  // Custom prefix serializer
  t.is(fixedNullable(u8, u32).fixedSize, 4 + 1);
  t.is(fixedNullable(u8, u32).maxSize, 4 + 1);
  t.is(s(fixedNullable(u8, u32), 42), '010000002a');
  t.deepEqual(d(fixedNullable(u8, u32), '010000002a'), 42);
});

test('it can serialize structs', (t) => {
  const { struct, option, u8, u64, string } = new BeetSerializer();

  // Description matches the vec definition.
  const person = struct([
    ['name', string()],
    ['age', u8],
  ]);
  t.is(struct([['age', u8]]).description, 'struct(age: u8)');
  t.is(person.description, 'struct(name: string(u32, utf8), age: u8)');

  // Description can be overridden.
  t.is(struct([['age', u8]], 'my struct').description, 'my struct');

  // Fixed and max sizes.
  t.is(person.fixedSize, null);
  t.is(person.maxSize, null);
  t.is(struct([]).fixedSize, 0);
  t.is(struct([]).maxSize, 0);
  t.is(struct([['age', u8]]).fixedSize, 1);
  t.is(struct([['age', u8]]).maxSize, 1);
  t.is(struct([['age', option(u8)]]).fixedSize, null);
  t.is(struct([['age', option(u8)]]).maxSize, 2);
  const fixedPerson = struct([
    ['age', u8],
    ['balance', u64],
  ]);
  t.is(fixedPerson.fixedSize, 9);
  t.is(fixedPerson.maxSize, 9);

  // More examples.
  t.is(s(struct([]), {}), '');
  const alice = { name: 'Alice', age: 32 };
  t.is(s(person, alice), '05000000416c69636520');
  t.deepEqual(d(person, '05000000416c69636520'), alice);
  t.deepEqual(d(person, 'ff05000000416c69636520', 1), alice);
  t.deepEqual(sd(person, alice), alice);
  t.deepEqual(sd(person, { age: 1, name: 'Bob' }), { name: 'Bob', age: 1 });
  t.deepEqual(sd(person, { age: 1, name: 'Bob', dob: '1995-06-01' } as any), {
    name: 'Bob',
    age: 1,
  });

  // Example with different From and To types.
  const structU64 = struct<{ value: number | bigint }, { value: bigint }>([
    ['value', u64],
  ]);
  t.deepEqual(s(structU64, { value: 2 }), '0200000000000000');
  t.deepEqual(d(structU64, '0200000000000000'), { value: 2n });
});

test('it can serialize enums', (t) => {
  const { enum: scalarEnum } = new BeetSerializer();
  enum Empty {}
  enum Feedback {
    BAD,
    GOOD,
  }
  enum Direction {
    UP = 'Up',
    DOWN = 'Down',
    LEFT = 'Left',
    RIGHT = 'Right',
  }

  // Description matches the vec definition.
  t.is(scalarEnum(Empty).description, 'enum()');
  t.is(scalarEnum(Feedback).description, 'enum(BAD, GOOD)');
  t.is(scalarEnum(Direction).description, 'enum(Up, Down, Left, Right)');

  // Description can be overridden.
  t.is(scalarEnum(Direction, 'my enum').description, 'my enum');

  // Simple scalar enums.
  t.is(scalarEnum(Feedback).fixedSize, 1);
  t.is(s(scalarEnum(Feedback), 'BAD'), '00');
  t.is(s(scalarEnum(Feedback), '0'), '00');
  t.is(s(scalarEnum(Feedback), 0), '00');
  t.is(s(scalarEnum(Feedback), Feedback.BAD), '00');
  t.is(d(scalarEnum(Feedback), '00'), 0);
  t.is(d(scalarEnum(Feedback), '00'), Feedback.BAD);
  t.is(sd(scalarEnum(Feedback), Feedback.BAD), Feedback.BAD);
  t.is(sd(scalarEnum(Feedback), 0), 0);
  t.is(s(scalarEnum(Feedback), 'GOOD'), '01');
  t.is(s(scalarEnum(Feedback), '1'), '01');
  t.is(s(scalarEnum(Feedback), 1), '01');
  t.is(s(scalarEnum(Feedback), Feedback.GOOD), '01');
  t.is(d(scalarEnum(Feedback), '01'), 1);
  t.is(d(scalarEnum(Feedback), '01'), Feedback.GOOD);
  t.is(sd(scalarEnum(Feedback), Feedback.GOOD), Feedback.GOOD);
  t.is(sd(scalarEnum(Feedback), 1), 1);
  t.is(doffset(scalarEnum(Feedback), '01'), 1);
  t.is(doffset(scalarEnum(Feedback), 'ff01', 1), 2);

  // Scalar enums with string values.
  t.is(scalarEnum(Direction).fixedSize, 1);
  t.is(s(scalarEnum(Direction), Direction.UP), '00');
  t.is(s(scalarEnum(Direction), Direction.DOWN), '01');
  t.is(s(scalarEnum(Direction), Direction.LEFT), '02');
  t.is(s(scalarEnum(Direction), Direction.RIGHT), '03');
  t.is(d(scalarEnum(Direction), '00'), Direction.UP);
  t.is(d(scalarEnum(Direction), '01'), Direction.DOWN);
  t.is(d(scalarEnum(Direction), '02'), Direction.LEFT);
  t.is(d(scalarEnum(Direction), '03'), Direction.RIGHT);
  t.is(sd(scalarEnum(Direction), Direction.UP), Direction.UP);
  t.is(sd(scalarEnum(Direction), Direction.DOWN), Direction.DOWN);
  t.is(sd(scalarEnum(Direction), Direction.LEFT), Direction.LEFT);
  t.is(sd(scalarEnum(Direction), Direction.RIGHT), Direction.RIGHT);
  t.is(sd(scalarEnum(Direction), Direction.UP), 'Up' as Direction);
  t.is(sd(scalarEnum(Direction), Direction.DOWN), 'Down' as Direction);
  t.is(sd(scalarEnum(Direction), Direction.LEFT), 'Left' as Direction);
  t.is(sd(scalarEnum(Direction), Direction.RIGHT), 'Right' as Direction);
  t.is(s(scalarEnum(Direction), Direction.RIGHT), '03');
  t.is(s(scalarEnum(Direction), 'Right' as Direction), '03');
  t.is(s(scalarEnum(Direction), 'RIGHT' as Direction), '03');
  t.is(s(scalarEnum(Direction), 3 as unknown as Direction), '03');

  // Invalid examples.
  t.throws(() => s(scalarEnum(Feedback), 'Missing'), {
    message: (m: string) =>
      m.includes(
        'Invalid enum variant. Got "Missing", expected one of [BAD, GOOD, 0, 1]'
      ),
  });
  t.throws(() => s(scalarEnum(Direction), 'Diagonal' as any), {
    message: (m: string) =>
      m.includes(
        'Invalid enum variant. Got "Diagonal", expected one of [Up, Down, Left, Right]'
      ),
  });
});

test('it can serialize data enums', (t) => {
  const serializer = new BeetSerializer();
  const { dataEnum, struct, tuple, array } = serializer;
  const { string, u8, u32, u16, u64, unit, bool } = serializer;
  type WebEvent =
    | { __kind: 'PageLoad' } // Empty variant.
    | { __kind: 'Click'; x: number; y: number } // Struct variant.
    | { __kind: 'KeyPress'; fields: [string] } // Tuple variant.
    | { __kind: 'PageUnload' }; // Empty variant (using empty struct).
  const webEvent: DataEnumToSerializerTuple<WebEvent, WebEvent> = [
    ['PageLoad', unit],
    [
      'Click',
      struct<{ x: number; y: number }>([
        ['x', u8],
        ['y', u8],
      ]),
    ],
    ['KeyPress', struct<{ fields: [string] }>([['fields', tuple([string()])]])],
    ['PageUnload', struct<{}>([])],
  ];

  // Description matches the vec definition.
  t.is(
    dataEnum(webEvent).description,
    'dataEnum(' +
      'PageLoad: unit, ' +
      'Click: struct(x: u8, y: u8), ' +
      'KeyPress: struct(fields: tuple(string(u32, utf8))), ' +
      'PageUnload: struct()' +
      ')'
  );

  // Description can be overridden.
  t.is(
    dataEnum(webEvent, undefined, 'my data enum').description,
    'my data enum'
  );

  // Empty variants.
  const pageLoad: WebEvent = { __kind: 'PageLoad' };
  const pageUnload: WebEvent = { __kind: 'PageUnload' };
  t.is(s(dataEnum(webEvent), pageLoad), '00');
  t.deepEqual(sd(dataEnum(webEvent), pageLoad), pageLoad);
  t.deepEqual(sd(dataEnum(webEvent), pageUnload), pageUnload);
  t.deepEqual(d(dataEnum(webEvent), '00'), pageLoad);
  t.deepEqual(d(dataEnum(webEvent), 'ff00', 1), pageLoad);
  t.is(doffset(dataEnum(webEvent), '00'), 1);
  t.is(doffset(dataEnum(webEvent), 'ff00', 1), 2);

  // Struct variants.
  const click = (x: number, y: number): WebEvent => ({ __kind: 'Click', x, y });
  t.is(s(dataEnum(webEvent), click(0, 0)), '010000');
  t.is(s(dataEnum(webEvent), click(1, 2)), '010102');
  t.deepEqual(sd(dataEnum(webEvent), click(1, 2)), click(1, 2));
  t.deepEqual(d(dataEnum(webEvent), '010003'), click(0, 3));
  t.deepEqual(d(dataEnum(webEvent), 'ff010003', 1), click(0, 3));
  t.is(doffset(dataEnum(webEvent), '010003'), 3);
  t.is(doffset(dataEnum(webEvent), 'ff010003', 1), 4);

  // Tuple variants.
  const press = (k: string): WebEvent => ({ __kind: 'KeyPress', fields: [k] });
  t.is(s(dataEnum(webEvent), press('')), '0200000000');
  t.is(s(dataEnum(webEvent), press('1')), '020100000031');
  t.is(s(dataEnum(webEvent), press('enter')), '0205000000656e746572');
  t.deepEqual(sd(dataEnum(webEvent), press('')), press(''));
  t.deepEqual(sd(dataEnum(webEvent), press('1')), press('1'));
  t.deepEqual(sd(dataEnum(webEvent), press('語')), press('語'));
  t.deepEqual(sd(dataEnum(webEvent), press('enter')), press('enter'));
  t.deepEqual(d(dataEnum(webEvent), '020100000032'), press('2'));
  t.deepEqual(d(dataEnum(webEvent), 'ff020100000032', 1), press('2'));
  t.is(doffset(dataEnum(webEvent), '020100000032'), 6);
  t.is(doffset(dataEnum(webEvent), 'ff020100000032', 1), 7);

  // Invalid examples.
  t.throws(() => s(dataEnum(webEvent), { __kind: 'Missing' } as any), {
    message: (m: string) =>
      m.includes(
        'Invalid data enum variant. Got "Missing", ' +
          'expected one of [PageLoad, Click, KeyPress, PageUnload]'
      ),
  });
  t.throws(() => d(dataEnum(webEvent), '04'), {
    message: (m: string) =>
      m.includes(
        'Data enum index "4" is out of range. Index should be between 0 and 3.'
      ),
  });

  // Example with different From and To types.
  type FromType = { __kind: 'A' } | { __kind: 'B'; value: number | bigint };
  type ToType = { __kind: 'A' } | { __kind: 'B'; value: bigint };
  const dataEnumU64 = dataEnum<FromType, ToType>([
    ['A', unit],
    [
      'B',
      struct<{ value: bigint | number }, { value: bigint }>([['value', u64]]),
    ],
  ]);
  t.deepEqual(s(dataEnumU64, { __kind: 'B', value: 2 }), '010200000000000000');
  t.deepEqual(d(dataEnumU64, '010200000000000000'), { __kind: 'B', value: 2n });

  // Fixed Sizes are null if the variants are not all the same size.
  t.is(dataEnum(webEvent).fixedSize, null);
  t.is(dataEnumU64.fixedSize, null);

  // Max Sizes are null if at least one variant does not have a max size.
  t.is(dataEnum(webEvent).maxSize, null);
  t.is(dataEnumU64.maxSize, 9);

  // Sizes are fixed if all variants are the same size.
  type SameSizeVariants =
    | { __kind: 'A'; value: number }
    | { __kind: 'B'; x: number; y: number }
    | { __kind: 'C'; items: Array<boolean> };
  const dataEnumSameSizeVariants: DataEnumToSerializerTuple<
    SameSizeVariants,
    SameSizeVariants
  > = [
    ['A', struct<any>([['value', u16]])],
    [
      'B',
      struct<any>([
        ['x', u8],
        ['y', u8],
      ]),
    ],
    ['C', struct<any>([['items', array(bool(), 2)]])],
  ];
  t.is(dataEnum(dataEnumSameSizeVariants).fixedSize, 1 + 2);
  t.is(dataEnum(dataEnumSameSizeVariants).maxSize, 1 + 2);

  // Custom prefix serializer with fixed size.
  t.is(dataEnum(dataEnumSameSizeVariants, u32).fixedSize, 4 + 2);
  t.is(
    s(dataEnum(dataEnumSameSizeVariants, u32), { __kind: 'A', value: 42 }),
    '000000002a00'
  );
  t.deepEqual(d(dataEnum(dataEnumSameSizeVariants, u32), '000000002a00'), {
    __kind: 'A',
    value: 42,
  });
});

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

/** Serialize as a hex string. */
function s<T, U extends T = T>(
  serializer: Serializer<T, U>,
  value: T extends T ? T : never
): string {
  return base16.deserialize(serializer.serialize(value))[0];
}

/** Deserialize from a hex string. */
function d<T, U extends T = T>(
  serializer: Serializer<T, U>,
  value: string,
  offset = 0
): T {
  const bytes = base16.serialize(value);
  return serializer.deserialize(bytes, offset)[0];
}

/** Deserialize from a hex string and get the new offset. */
function doffset<T, U extends T = T>(
  serializer: Serializer<T, U>,
  value: string,
  offset = 0
): number {
  const bytes = base16.serialize(value);
  return serializer.deserialize(bytes, offset)[1];
}

/** Serialize and deserialize. */
function sd<T, U extends T = T>(
  serializer: Serializer<T, U>,
  value: T extends T ? T : never
): U {
  return d(serializer, s(serializer, value)) as U;
}
