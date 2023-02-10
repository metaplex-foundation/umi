import test from 'ava';
import { httpDownloader } from '../src';

test('example test', async (t) => {
  t.is(typeof httpDownloader, 'function');
});
