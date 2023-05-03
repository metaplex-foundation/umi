import test from 'ava';
import { createDataViewSerializer } from '../src';
import { s, d } from './_helpers';

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

test('numerical enum (de)serialization', (t) => {
  const { enum: scalarEnum, u64 } = createDataViewSerializer();

  // Bad.
  s(t, scalarEnum(Feedback), Feedback.BAD, '00');
  s(t, scalarEnum(Feedback), 'BAD', '00');
  s(t, scalarEnum(Feedback), '0', '00');
  s(t, scalarEnum(Feedback), 0, '00');
  d(t, scalarEnum(Feedback), '00', Feedback.BAD, 1);
  d(t, scalarEnum(Feedback), ['ffff00', 2], Feedback.BAD, 3);

  // Good.
  s(t, scalarEnum(Feedback), Feedback.GOOD, '01');
  s(t, scalarEnum(Feedback), 'GOOD', '01');
  s(t, scalarEnum(Feedback), '1', '01');
  s(t, scalarEnum(Feedback), 1, '01');
  d(t, scalarEnum(Feedback), '01', Feedback.GOOD, 1);
  d(t, scalarEnum(Feedback), ['ffff01', 2], Feedback.GOOD, 3);

  // Custom size.
  const u64Feedback = scalarEnum(Feedback, { size: u64() });
  s(t, u64Feedback, Feedback.GOOD, '0100000000000000');
  d(t, u64Feedback, '0100000000000000', Feedback.GOOD, 8);

  // Invalid examples.
  t.throws(() => scalarEnum(Feedback).serialize('Missing'), {
    message: (m: string) =>
      m.includes(
        'Invalid enum variant. Got "Missing", expected one of [0, 1, BAD, GOOD] ' +
          'or a number between 0 and 1'
      ),
  });
  t.throws(() => scalarEnum(Feedback).deserialize(new Uint8Array([2])), {
    message: /Invalid enum variant\. Got "2"/,
  });
});

test('lexical enum (de)serialization', (t) => {
  const { enum: scalarEnum } = createDataViewSerializer();

  // Up.
  s(t, scalarEnum(Direction), Direction.UP, '00');
  s(t, scalarEnum(Direction), 'Up' as Direction, '00');
  s(t, scalarEnum(Direction), 'UP' as Direction, '00');
  d(t, scalarEnum(Direction), '00', Direction.UP, 1);
  d(t, scalarEnum(Direction), ['ffff00', 2], Direction.UP, 3);

  // Down.
  s(t, scalarEnum(Direction), Direction.DOWN, '01');
  s(t, scalarEnum(Direction), 'Down' as Direction, '01');
  s(t, scalarEnum(Direction), 'DOWN' as Direction, '01');
  d(t, scalarEnum(Direction), '01', Direction.DOWN, 1);
  d(t, scalarEnum(Direction), ['ffff01', 2], Direction.DOWN, 3);

  // Left.
  s(t, scalarEnum(Direction), Direction.LEFT, '02');
  s(t, scalarEnum(Direction), 'Left' as Direction, '02');
  s(t, scalarEnum(Direction), 'LEFT' as Direction, '02');
  d(t, scalarEnum(Direction), '02', Direction.LEFT, 1);
  d(t, scalarEnum(Direction), ['ffff02', 2], Direction.LEFT, 3);

  // Right.
  s(t, scalarEnum(Direction), Direction.RIGHT, '03');
  s(t, scalarEnum(Direction), 'Right' as Direction, '03');
  s(t, scalarEnum(Direction), 'RIGHT' as Direction, '03');
  d(t, scalarEnum(Direction), '03', Direction.RIGHT, 1);
  d(t, scalarEnum(Direction), ['ffff03', 2], Direction.RIGHT, 3);

  // Invalid examples.
  t.throws(() => scalarEnum(Direction).serialize('Diagonal' as any), {
    message: (m: string) =>
      m.includes(
        'Invalid enum variant. Got "Diagonal", expected one of ' +
          '[UP, DOWN, LEFT, RIGHT, Up, Down, Left, Right] ' +
          'or a number between 0 and 3'
      ),
  });
  t.throws(() => scalarEnum(Direction).deserialize(new Uint8Array([4])), {
    message: /Invalid enum variant\. Got "4"/,
  });
});

test('description', (t) => {
  const { enum: scalarEnum, u32 } = createDataViewSerializer();
  t.is(scalarEnum(Empty).description, 'enum(; u8)');
  t.is(scalarEnum(Feedback).description, 'enum(BAD, GOOD; u8)');
  t.is(
    scalarEnum(Feedback, { size: u32() }).description,
    'enum(BAD, GOOD; u32(le))'
  );
  t.is(scalarEnum(Direction).description, 'enum(Up, Down, Left, Right; u8)');
  t.is(
    scalarEnum(Direction, { description: 'my enum' }).description,
    'my enum'
  );
});

test('sizes', (t) => {
  const { enum: scalarEnum, u32 } = createDataViewSerializer();
  t.is(scalarEnum(Empty).fixedSize, 1);
  t.is(scalarEnum(Empty).maxSize, 1);
  t.is(scalarEnum(Feedback).fixedSize, 1);
  t.is(scalarEnum(Feedback).maxSize, 1);
  t.is(scalarEnum(Direction).fixedSize, 1);
  t.is(scalarEnum(Direction).maxSize, 1);
  t.is(scalarEnum(Feedback, { size: u32() }).fixedSize, 4);
  t.is(scalarEnum(Feedback, { size: u32() }).maxSize, 4);
});
