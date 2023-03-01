import test from 'ava';
import { chunk, uniqueBy, zipMap } from '../../src';

test('it can chunk arrays', (t) => {
  const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const result = chunk(arr, 3);
  t.deepEqual(result, [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]);
});

test('it can zip elements of two arrays into one', (t) => {
  const arr1 = [1, 2, 3, 4, 5, 6];
  const arr2 = ['A', 'B', 'C', 'D', 'E'];
  const result = zipMap(arr1, arr2, (a, b) => a.toString() + (b ?? 'null'));
  t.deepEqual(result, ['1A', '2B', '3C', '4D', '5E', '6null']);
});

test('it can remove item duplicates using a custom callback', (t) => {
  const array = [
    { id: 0, value: 'a' },
    { id: 1, value: 'b' },
    { id: 2, value: 'c' },
    { id: 1, value: 'd' },
    { id: 0, value: 'e' },
  ];
  const result = uniqueBy(array, (a, b) => a.id === b.id);
  t.deepEqual(result, [
    { id: 0, value: 'a' },
    { id: 1, value: 'b' },
    { id: 2, value: 'c' },
  ]);
});
