import test from 'ava';
import { fixSerializer, reverseSerializer } from '../src';
import { base16 } from './_setup';

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
