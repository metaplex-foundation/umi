import test from 'ava';
import { base16, base58, Endian } from '@metaplex-foundation/umi';
import { createBeetSerializer } from '../src';
import { s, d } from './_helpers';

test('prefixed (de)serialization', (t) => {
  const { string, u8 } = createBeetSerializer();

  // Empty string.
  s(t, string(), '', '00000000'); // 4-bytes prefix.
  d(t, string(), '00000000', '', 4);

  // Hello World!
  s(t, string(), 'Hello World!', '0c00000048656c6c6f20576f726c6421');
  d(t, string(), '0c00000048656c6c6f20576f726c6421', 'Hello World!', 4 + 12);

  // Characters with different byte lengths.
  s(t, string(), '語', '03000000e8aa9e');
  d(t, string(), '03000000e8aa9e', '語', 7);
  d(t, string(), ['ff03000000e8aa9e', 1], '語', 8);

  // Different prefix lengths.
  s(t, string({ size: u8() }), 'ABC', '03414243');
  d(t, string({ size: u8() }), '03414243', 'ABC', 1 + 3);

  // Not enough bytes.
  t.throws(() => string({ size: u8() }).deserialize(base16.serialize('0341')), {
    message: (m) => m.includes('Serializer [string] expected 3 bytes, got 1.'),
  });
});

test('fixed (de)serialization', (t) => {
  const { string } = createBeetSerializer();
  const string5 = string({ size: 5 });
  const string12 = string({ size: 12 });

  // Hello World! (exact size).
  s(t, string12, 'Hello World!', '48656c6c6f20576f726c6421');
  d(t, string12, '48656c6c6f20576f726c6421', 'Hello World!', 12);

  // Empty string (padded).
  s(t, string5, '', '0000000000');
  d(t, string5, '0000000000', '', 5);

  // Characters with different byte lengths (padded).
  s(t, string5, '語', 'e8aa9e0000');
  d(t, string5, 'e8aa9e0000', '語', 5);

  // Hello World! (truncated).
  s(t, string5, 'Hello World!', '48656c6c6f');
  d(t, string5, '48656c6c6f', 'Hello', 5);
});

test('variable (de)serialization', (t) => {
  const { string } = createBeetSerializer();
  const variableString = string({ size: 'variable' });

  // Empty string.
  s(t, variableString, '', '');
  d(t, variableString, '', '', 0);

  // Hello World!
  s(t, variableString, 'Hello World!', '48656c6c6f20576f726c6421');
  d(t, variableString, '48656c6c6f20576f726c6421', 'Hello World!', 12);

  // Characters with different byte lengths.
  s(t, variableString, '語', 'e8aa9e');
  d(t, variableString, 'e8aa9e', '語', 3);
});

test('base58 (de)serialization', (t) => {
  const { string, u8 } = createBeetSerializer();

  // Prefixed.
  const prefixedString = string({ size: u8(), encoding: base58 });
  s(t, prefixedString, 'ABC', '027893');
  d(t, prefixedString, '027893', 'ABC', 1 + 2);

  // Fixed.
  const fixedString = string({ size: 5, encoding: base58 });
  s(t, fixedString, 'ABC', '7893000000');
  d(t, fixedString, '7893000000', 'EbzinYo', 5); // <- Base58 expect left padding.
  d(t, fixedString, '0000007893', '111ABC', 5); // <- And uses 1s for padding.

  // Variable.
  const variableString = string({ size: 'variable', encoding: base58 });
  s(t, variableString, 'ABC', '7893');
  d(t, variableString, '7893', 'ABC', 2);
});

test('description', (t) => {
  const { string, u16 } = createBeetSerializer();

  // Encoding.
  t.is(string().description, 'string(utf8; u32(le))');
  t.is(string({ encoding: base58 }).description, 'string(base58; u32(le))');

  // Size.
  t.is(string({ size: 42 }).description, 'string(utf8; 42)');
  t.is(string({ size: 'variable' }).description, 'string(utf8; variable)');
  t.is(string({ size: u16() }).description, 'string(utf8; u16(le))');
  t.is(
    string({ size: u16({ endian: Endian.Big }) }).description,
    'string(utf8; u16(be))'
  );

  // Custom.
  t.is(
    string({ description: 'My custom description' }).description,
    'My custom description'
  );
});

test('sizes', (t) => {
  const { string, u8 } = createBeetSerializer();
  t.is(string().fixedSize, null);
  t.is(string().maxSize, null);
  t.is(string({ size: u8() }).fixedSize, null);
  t.is(string({ size: u8() }).maxSize, null);
  t.is(string({ size: 'variable' }).fixedSize, null);
  t.is(string({ size: 'variable' }).maxSize, null);
  t.is(string({ size: 42 }).fixedSize, 42);
  t.is(string({ size: 42 }).maxSize, 42);
});
