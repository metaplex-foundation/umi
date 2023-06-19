import test from 'ava';
import { Serializer } from '../src';

test('it can define serializers', async (t) => {
  const mySerializer: Serializer<string> = {
    description: 'mySerializer',
    fixedSize: 32,
    maxSize: 32,
    serialize: (value: string) => {
      const buffer = new Uint8Array(32).fill(0);
      const charCodes = [...value.slice(0, 32)].map((char) =>
        Math.min(char.charCodeAt(0), 255)
      );
      buffer.set(new Uint8Array(charCodes));
      return buffer;
    },
    deserialize: (buffer: Uint8Array, offset = 0) => {
      const slice = buffer.slice(offset, offset + 32);
      const str = [...slice]
        .map((charCode) => String.fromCharCode(charCode))
        .join('');
      return [str, offset + 32];
    },
  };

  t.is(mySerializer.description, 'mySerializer');
  t.is(mySerializer.fixedSize, 32);
  t.is(mySerializer.maxSize, 32);

  const expectedBuffer = new Uint8Array(32).fill(0);
  expectedBuffer.set(new Uint8Array([104, 101, 108, 108, 111]));
  t.deepEqual(mySerializer.serialize('hello'), expectedBuffer);
  t.deepEqual(
    mySerializer.deserialize(new Uint8Array([104, 101, 108, 108, 111])),
    ['hello', 32]
  );
});
