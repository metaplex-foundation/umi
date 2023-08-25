import test from 'ava';
import { base16, base64 } from '../src';

test('it can serialize base 64 strings', (t) => {
  t.deepEqual(base64.serialize(''), new Uint8Array([]));
  t.deepEqual(base64.serialize('A'), new Uint8Array([]));
  t.deepEqual(base64.deserialize(new Uint8Array([])), ['', 0]);

  t.deepEqual(base64.serialize('AA'), new Uint8Array([0]));
  t.deepEqual(base64.serialize('AA='), new Uint8Array([0]));
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
