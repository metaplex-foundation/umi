import test from 'ava';
import {
  createBrowserFileFromGenericFile,
  createGenericFile,
  createGenericFileFromBrowserFile,
  createGenericFileFromJson,
  getBytesFromGenericFiles,
  isGenericFile,
  parseJsonFromGenericFile,
} from '../src';

test('it can create a generic file from a string', (t) => {
  const file = createGenericFile('some content', 'my-file.txt');
  t.deepEqual(file.buffer, new TextEncoder().encode('some content'));
  t.is(file.fileName, 'my-file.txt');
  t.is(file.displayName, 'my-file.txt');
  t.is(typeof file.uniqueName, 'string');
  t.true(file.uniqueName.length > 0);
  t.is(file.contentType, null);
  t.is(file.extension, 'txt');
  t.deepEqual(file.tags, []);
});

test('it can create a generic file from a buffer', (t) => {
  const buffer = new Uint8Array([1, 2, 3]);
  const file = createGenericFile(buffer, 'bytes.bin');
  t.is(file.buffer, buffer);
  t.is(file.extension, 'bin');
});

test('it can create a generic file with custom options', (t) => {
  const file = createGenericFile('content', 'file.txt', {
    displayName: 'My File',
    uniqueName: 'unique-123',
    contentType: 'text/plain',
    extension: 'text',
    tags: [{ name: 'category', value: 'test' }],
  });
  t.is(file.displayName, 'My File');
  t.is(file.uniqueName, 'unique-123');
  t.is(file.contentType, 'text/plain');
  t.is(file.extension, 'text');
  t.deepEqual(file.tags, [{ name: 'category', value: 'test' }]);
});

test('it returns a null extension for file names without a dot', (t) => {
  const file = createGenericFile('content', 'no-extension');
  t.is(file.extension, null);
});

test('it uses the last dot to compute the extension', (t) => {
  const file = createGenericFile('content', 'archive.tar.gz');
  t.is(file.extension, 'gz');
});

test('it generates random unique names for different files', (t) => {
  const fileA = createGenericFile('a', 'a.txt');
  const fileB = createGenericFile('b', 'b.txt');
  t.not(fileA.uniqueName, fileB.uniqueName);
});

test('it can create a generic file from JSON', (t) => {
  const file = createGenericFileFromJson({ answer: 42 });
  t.is(file.fileName, 'inline.json');
  t.is(file.contentType, 'application/json');
  t.is(new TextDecoder().decode(file.buffer), '{"answer":42}');
});

test('it can create a generic file from JSON with a custom file name and options', (t) => {
  const file = createGenericFileFromJson({ answer: 42 }, 'custom.json', {
    contentType: 'application/json; charset=utf-8',
    displayName: 'Custom',
  });
  t.is(file.fileName, 'custom.json');
  t.is(file.displayName, 'Custom');
  t.is(file.contentType, 'application/json; charset=utf-8');
});

test('it can parse JSON content from a generic file', (t) => {
  const file = createGenericFileFromJson({ hello: 'world', n: 1 });
  t.deepEqual(parseJsonFromGenericFile(file), { hello: 'world', n: 1 });
});

test('it can create a browser file from a generic file and back', async (t) => {
  const original = createGenericFile('round trip', 'trip.txt');
  const browserFile = createBrowserFileFromGenericFile(original);
  t.true(browserFile instanceof File);
  t.is(browserFile.name, 'trip.txt');

  const roundTripped = await createGenericFileFromBrowserFile(browserFile);
  t.is(roundTripped.fileName, 'trip.txt');
  t.deepEqual(roundTripped.buffer, new TextEncoder().encode('round trip'));
});

test('it can create a generic file from a browser file with options', async (t) => {
  const browserFile = new File(['browser content'], 'browser.txt');
  const file = await createGenericFileFromBrowserFile(browserFile, {
    contentType: 'text/plain',
  });
  t.is(file.fileName, 'browser.txt');
  t.is(file.contentType, 'text/plain');
  t.is(new TextDecoder().decode(file.buffer), 'browser content');
});

test('it can compute the total bytes of a list of files', (t) => {
  const fileA = createGenericFile(new Uint8Array(10), 'a.bin');
  const fileB = createGenericFile(new Uint8Array(32), 'b.bin');
  t.is(getBytesFromGenericFiles(), 0);
  t.is(getBytesFromGenericFiles(fileA), 10);
  t.is(getBytesFromGenericFiles(fileA, fileB), 42);
});

test('it can identify generic files', (t) => {
  t.true(isGenericFile(createGenericFile('content', 'file.txt')));
  t.false(isGenericFile(null));
  t.false(isGenericFile(undefined));
  t.false(isGenericFile(42));
  t.false(isGenericFile('file.txt'));
  t.false(isGenericFile({ buffer: new Uint8Array(), fileName: 'a.txt' }));
});
