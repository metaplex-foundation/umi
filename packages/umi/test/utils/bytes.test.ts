import test from 'ava';
import { base10, base16, base58, base64, bitArray, utf8 } from '../../src';

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

test('it can serialize base 10 strings', (t) => {
  t.deepEqual(base10.serialize(''), new Uint8Array([]));
  t.deepEqual(base10.deserialize(new Uint8Array([])), ['', 0]);

  t.deepEqual(base10.serialize('0'), new Uint8Array([0]));
  t.deepEqual(base10.deserialize(new Uint8Array([0])), ['0', 1]);

  t.deepEqual(base10.serialize('000'), new Uint8Array([0, 0, 0]));
  t.deepEqual(base10.deserialize(new Uint8Array([0, 0, 0])), ['000', 3]);

  t.deepEqual(base10.serialize('1'), new Uint8Array([1]));
  t.deepEqual(base10.deserialize(new Uint8Array([1])), ['1', 1]);

  t.deepEqual(base10.serialize('42'), new Uint8Array([42]));
  t.deepEqual(base10.deserialize(new Uint8Array([42])), ['42', 1]);

  t.deepEqual(base10.serialize('1024'), new Uint8Array([4, 0]));
  t.deepEqual(base10.deserialize(new Uint8Array([4, 0])), ['1024', 2]);

  t.deepEqual(base10.serialize('65535'), new Uint8Array([255, 255]));
  t.deepEqual(base10.deserialize(new Uint8Array([255, 255])), ['65535', 2]);

  t.throws(() => base10.serialize('INVALID_INPUT'), {
    message: (m) =>
      m.includes('Expected a string of base 10, got [INVALID_INPUT].'),
  });
});

test('it can serialize base 16 strings', (t) => {
  t.deepEqual(base16.serialize(''), new Uint8Array([]));
  t.deepEqual(base16.deserialize(new Uint8Array([])), ['', 0]);

  t.deepEqual(base16.serialize('0'), new Uint8Array([0]));
  t.deepEqual(base16.serialize('00'), new Uint8Array([0]));
  t.deepEqual(base16.deserialize(new Uint8Array([0])), ['00', 1]);

  t.deepEqual(base16.serialize('1'), new Uint8Array([1]));
  t.deepEqual(base16.serialize('01'), new Uint8Array([1]));
  t.deepEqual(base16.deserialize(new Uint8Array([1])), ['01', 1]);

  t.deepEqual(base16.serialize('2a'), new Uint8Array([42]));
  t.deepEqual(base16.deserialize(new Uint8Array([42])), ['2a', 1]);

  t.deepEqual(base16.serialize('0400'), new Uint8Array([4, 0]));
  t.deepEqual(base16.deserialize(new Uint8Array([4, 0])), ['0400', 2]);

  t.deepEqual(base16.serialize('ffff'), new Uint8Array([255, 255]));
  t.deepEqual(base16.deserialize(new Uint8Array([255, 255])), ['ffff', 2]);

  t.throws(() => base16.serialize('INVALID_INPUT'), {
    message: (m) =>
      m.includes('Expected a string of base 16, got [INVALID_INPUT].'),
  });
});

test('it can serialize base 58 strings', (t) => {
  t.deepEqual(base58.serialize(''), new Uint8Array([]));
  t.deepEqual(base58.deserialize(new Uint8Array([])), ['', 0]);

  t.deepEqual(base58.serialize('1'), new Uint8Array([0]));
  t.deepEqual(base58.deserialize(new Uint8Array([0])), ['1', 1]);

  t.deepEqual(base58.serialize('2'), new Uint8Array([1]));
  t.deepEqual(base58.deserialize(new Uint8Array([1])), ['2', 1]);

  t.deepEqual(base58.serialize('11'), new Uint8Array([0, 0]));
  t.deepEqual(base58.deserialize(new Uint8Array([0, 0])), ['11', 2]);

  const zeroes32 = new Uint8Array(Array(32).fill(0));
  t.deepEqual(base58.serialize('1'.repeat(32)), zeroes32);
  t.deepEqual(base58.deserialize(zeroes32), ['1'.repeat(32), 32]);

  t.deepEqual(base58.serialize('j'), new Uint8Array([42]));
  t.deepEqual(base58.deserialize(new Uint8Array([42])), ['j', 1]);

  t.deepEqual(base58.serialize('Jf'), new Uint8Array([4, 0]));
  t.deepEqual(base58.deserialize(new Uint8Array([4, 0])), ['Jf', 2]);

  t.deepEqual(base58.serialize('LUv'), new Uint8Array([255, 255]));
  t.deepEqual(base58.deserialize(new Uint8Array([255, 255])), ['LUv', 2]);

  const pubkey = 'LorisCg1FTs89a32VSrFskYDgiRbNQzct1WxyZb7nuA';
  const bytes = new Uint8Array([
    5, 19, 4, 94, 5, 47, 73, 25, 182, 8, 150, 61, 231, 60, 102, 110, 6, 114,
    224, 110, 40, 20, 10, 184, 65, 191, 241, 204, 131, 161, 120, 181,
  ]);
  t.deepEqual(base58.serialize(pubkey), bytes);
  t.deepEqual(base58.deserialize(bytes), [pubkey, 32]);

  t.throws(() => base58.serialize('INVALID_INPUT'), {
    message: (m) =>
      m.includes('Expected a string of base 58, got [INVALID_INPUT].'),
  });
});

test('it can serialize base 64 strings', (t) => {
  t.deepEqual(base64.serialize(''), new Uint8Array([]));
  t.deepEqual(base64.deserialize(new Uint8Array([])), ['', 0]);

  t.deepEqual(base64.serialize('AA'), new Uint8Array([0]));
  t.deepEqual(base64.serialize('AA=='), new Uint8Array([0]));
  t.deepEqual(base64.deserialize(new Uint8Array([0])), ['AA==', 1]);

  t.deepEqual(base64.serialize('AQ=='), new Uint8Array([1]));
  t.deepEqual(base64.deserialize(new Uint8Array([1])), ['AQ==', 1]);

  t.deepEqual(base64.serialize('Kg'), new Uint8Array([42]));
  t.deepEqual(base64.deserialize(new Uint8Array([42])), ['Kg==', 1]);

  const sentence = 'TWFueSBoYW5kcyBtYWtlIGxpZ2h0IHdvcmsu';
  const bytes = new Uint8Array([
    77, 97, 110, 121, 32, 104, 97, 110, 100, 115, 32, 109, 97, 107, 101, 32,
    108, 105, 103, 104, 116, 32, 119, 111, 114, 107, 46,
  ]);
  t.deepEqual(base64.serialize(sentence), bytes);
  t.deepEqual(base64.deserialize(bytes), [sentence, 27]);

  t.throws(() => base64.serialize('INVALID_INPUT'), {
    message: (m) =>
      m.includes('Expected a string of base 64, got [INVALID_INPUT].'),
  });

  t.throws(() => base64.serialize('A'), {
    message: (m) => m.includes('Expected a string of base 64, got [A].'),
  });

  const base64TokenData =
    'AShNrkm2joOHhfQnRCzfSbrtDUkUcJSS7PJryR4PPjsnyyIWxL0ESVFoE7QWBowtz2B/iTtUGdb2EEyKbLuN5gEAAAAAAAAAAQAAAGCtpnOhgF7t+dM8By+nG51mKI9Dgb0RtO/6xvPX1w52AgAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const base16TokenData =
    '01284dae49b68e838785f427442cdf49baed0d4914709492ecf26bc91e0f3e3b27cb2216c4bd0449516813b416068c2dcf607f893b5419d6f6104c8a6cbb8de601000000000000000100000060ada673a1805eedf9d33c072fa71b9d66288f4381bd11b4effac6f3d7d70e76020000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

  t.deepEqual(
    base16.deserialize(base64.serialize(base64TokenData))[0],
    base16TokenData
  );
  t.deepEqual(
    base64.deserialize(base16.serialize(base16TokenData))[0],
    base64TokenData
  );
});

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
