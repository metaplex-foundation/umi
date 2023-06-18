import test from 'ava';
import { base16, bitArray } from '../src';

test('it can serialize bit arrays', (t) => {
  // Helper method to create array of booleans and bytes
  const a = (bits: string) => [...bits].map((bit) => bit === '1');
  const b = (hex: string) => base16.serialize(hex);

  // Single byte, all zeros.
  t.deepEqual(bitArray(1).serialize(a('00000000')), b('00'));
  t.deepEqual(bitArray(1).deserialize(b('00')), [a('00000000'), 1]);
  t.deepEqual(bitArray(1).deserialize(b('ff00'), 1), [a('00000000'), 2]);

  // Single byte, all ones.
  t.deepEqual(bitArray(1).serialize(a('11111111')), b('ff'));
  t.deepEqual(bitArray(1).deserialize(b('ff')), [a('11111111'), 1]);
  t.deepEqual(bitArray(1).deserialize(b('00ff'), 1), [a('11111111'), 2]);

  // Single byte, first 2 bits, forwards.
  t.deepEqual(bitArray(1).serialize(a('11000000')), b('c0'));
  t.deepEqual(bitArray(1).deserialize(b('c0')), [a('11000000'), 1]);
  t.deepEqual(bitArray(1).deserialize(b('ffc0'), 1), [a('11000000'), 2]);

  // Single byte, first 2 bits, backwards.
  t.deepEqual(bitArray(1, true).serialize(a('11000000')), b('03'));
  t.deepEqual(bitArray(1, true).deserialize(b('03')), [a('11000000'), 1]);
  t.deepEqual(bitArray(1, true).deserialize(b('ff03'), 1), [a('11000000'), 2]);

  // Multiple bytes, first 2 bits, forwards.
  const bitsA = '110000000000000000000000';
  t.deepEqual(bitArray(3).serialize(a(bitsA)), b('c00000'));
  t.deepEqual(bitArray(3).deserialize(b('c00000')), [a(bitsA), 3]);
  t.deepEqual(bitArray(3).deserialize(b('ffc00000'), 1), [a(bitsA), 4]);

  // Multiple bytes, first 2 bits, backwards.
  t.deepEqual(bitArray(3, true).serialize(a(bitsA)), b('000003'));
  t.deepEqual(bitArray(3, true).deserialize(b('000003')), [a(bitsA), 3]);
  t.deepEqual(bitArray(3, true).deserialize(b('ff000003'), 1), [a(bitsA), 4]);

  // Multiple bytes, first half bits, forwards.
  const bitsB = '111111111111000000000000';
  t.deepEqual(bitArray(3).serialize(a(bitsB)), b('fff000'));
  t.deepEqual(bitArray(3).deserialize(b('fff000')), [a(bitsB), 3]);
  t.deepEqual(bitArray(3).deserialize(b('00fff000'), 1), [a(bitsB), 4]);

  // Multiple bytes, first half bits, backwards.
  t.deepEqual(bitArray(3, true).serialize(a(bitsB)), b('000fff'));
  t.deepEqual(bitArray(3, true).deserialize(b('000fff')), [a(bitsB), 3]);
  t.deepEqual(bitArray(3, true).deserialize(b('ff000fff'), 1), [a(bitsB), 4]);

  // It pads missing boolean values with false.
  t.deepEqual(bitArray(1).serialize(a('101')), b('a0'));
  t.deepEqual(bitArray(1).deserialize(b('a0')), [a('10100000'), 1]);

  // It truncates array of booleans if it is too long.
  t.deepEqual(bitArray(1).serialize(a('000000001')), b('00'));
  t.deepEqual(bitArray(1).deserialize(b('00')), [a('00000000'), 1]);

  // It fails if the buffer is too short.
  t.throws(() => bitArray(3).deserialize(b('ff')), {
    message: (m) => m.includes('Serializer [bitArray] expected 3 bytes, got 1'),
  });
});
