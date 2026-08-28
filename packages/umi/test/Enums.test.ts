import test from 'ava';
// Import for side effects so the module is loaded at runtime,
// even though it only contains type definitions.
import '../src/Enums';
import type {
  DataEnum,
  GetDataEnumKind,
  GetDataEnumKindContent,
  ScalarEnum,
} from '../src/Enums';

enum Direction {
  Left,
  Right,
}

type WebPageEvent =
  | { __kind: 'pageview'; url: string }
  | { __kind: 'click'; x: number; y: number };

test('ScalarEnum accepts enum variants, numbers and enum objects', (t) => {
  const fromVariant: ScalarEnum<Direction> = Direction.Right;
  const fromNumber: ScalarEnum<Direction> = 0;
  const fromObject: ScalarEnum<Direction> = Direction;

  t.is(fromVariant, Direction.Right);
  t.is(fromNumber, Direction.Left);
  t.is((fromObject as typeof Direction).Left, Direction.Left);
});

test('DataEnum variants are discriminated by their __kind attribute', (t) => {
  const event: DataEnum & WebPageEvent = {
    __kind: 'pageview',
    url: 'https://example.com',
  };
  t.is(event.__kind, 'pageview');
});

test('GetDataEnumKind extracts a variant with its discriminator', (t) => {
  const click: GetDataEnumKind<WebPageEvent, 'click'> = {
    __kind: 'click',
    x: 12,
    y: 34,
  };
  t.deepEqual(click, { __kind: 'click', x: 12, y: 34 });
});

test('GetDataEnumKindContent extracts a variant without its discriminator', (t) => {
  const clickContent: GetDataEnumKindContent<WebPageEvent, 'click'> = {
    x: 12,
    y: 34,
  };
  t.deepEqual(clickContent, { x: 12, y: 34 });
  t.false('__kind' in clickContent);
});
