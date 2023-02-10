import test from 'ava';
import { defaultProgramRepository } from '../src';

test('example test', async (t) => {
  t.is(typeof defaultProgramRepository, 'function');
});
