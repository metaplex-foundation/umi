import test from 'ava';
import { generateRandomString } from '../../src';

const DEFAULT_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

test('it generates a 20-character alphanumeric string by default', (t) => {
  const result = generateRandomString();
  t.is(result.length, 20);
  t.true([...result].every((char) => DEFAULT_ALPHABET.includes(char)));
});

test('it can generate a string of a custom length', (t) => {
  t.is(generateRandomString(0), '');
  t.is(generateRandomString(1).length, 1);
  t.is(generateRandomString(100).length, 100);
});

test('it can generate a string from a custom alphabet', (t) => {
  const result = generateRandomString(50, 'ab');
  t.is(result.length, 50);
  t.true([...result].every((char) => char === 'a' || char === 'b'));
});

test('it only uses the provided alphabet character', (t) => {
  t.is(generateRandomString(5, 'x'), 'xxxxx');
});

test('it generates different strings on subsequent calls', (t) => {
  // With 62^20 possibilities, a collision would indicate a broken generator.
  t.not(generateRandomString(), generateRandomString());
});
