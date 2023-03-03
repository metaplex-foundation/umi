import test from 'ava';
import {
  base58,
  createNullContext,
  defaultPublicKey,
  GpaBuilder,
  gpaBuilder,
  RpcAccount,
  Serializer,
} from '../src';

test('it can add a data slice', (t) => {
  let builder = getTestGpaBuilder().slice(42, 10);
  t.deepEqual(builder.options.dataSlice, { offset: 42, length: 10 });

  builder = getTestGpaBuilder().slice(0, 0);
  t.deepEqual(builder.options.dataSlice, { offset: 0, length: 0 });

  builder = getTestGpaBuilder().withoutData();
  t.deepEqual(builder.options.dataSlice, { offset: 0, length: 0 });
});

test('it can add data size filters', (t) => {
  const builder = getTestGpaBuilder().whereSize(42);
  t.deepEqual(builder.options.filters?.[0], { dataSize: 42 });
});

test('it can add memcmp filters', (t) => {
  let builder = getTestGpaBuilder().where(42, 'Banana');
  t.deepEqual(builder.options.filters?.[0], {
    memcmp: { offset: 42, bytes: base58.serialize('Banana') },
  });

  builder = getTestGpaBuilder().where(42, 123);
  t.deepEqual(builder.options.filters?.[0], {
    memcmp: { offset: 42, bytes: new Uint8Array([123]) },
  });

  builder = getTestGpaBuilder().where(42, 123n);
  t.deepEqual(builder.options.filters?.[0], {
    memcmp: { offset: 42, bytes: new Uint8Array([123]) },
  });

  builder = getTestGpaBuilder().where(42, true);
  t.deepEqual(builder.options.filters?.[0], {
    memcmp: { offset: 42, bytes: new Uint8Array([1]) },
  });

  builder = getTestGpaBuilder().where(42, false);
  t.deepEqual(builder.options.filters?.[0], {
    memcmp: { offset: 42, bytes: new Uint8Array([0]) },
  });

  builder = getTestGpaBuilder().where(42, new Uint8Array([1, 2, 3]));
  t.deepEqual(builder.options.filters?.[0], {
    memcmp: { offset: 42, bytes: new Uint8Array([1, 2, 3]) },
  });

  builder = getTestGpaBuilder().where(42, defaultPublicKey());
  t.deepEqual(builder.options.filters?.[0], {
    memcmp: { offset: 42, bytes: defaultPublicKey().bytes },
  });
});

type Person = {
  age: number; // Size: 1
  name: string; // Size: 32
  balances: (number | bigint)[]; // Size: null
  id: number | bigint; // Size: 8
};

test('it can add memcmp filters from fields', (t) => {
  const builder = getPersonGpaBuilder();

  // Age (offset = 0, identifier = 1).
  t.deepEqual(builder.whereField('age', 28).options.filters?.[0], {
    memcmp: { offset: 0, bytes: new Uint8Array([1]) },
  });

  // Name (offset = 1, identifier = 2).
  t.deepEqual(builder.whereField('name', 'Alice').options.filters?.[0], {
    memcmp: { offset: 1, bytes: new Uint8Array([2]) },
  });

  // Balances (offset = 33, identifier = 3).
  t.deepEqual(builder.whereField('balances', [1, 2, 3]).options.filters?.[0], {
    memcmp: { offset: 33, bytes: new Uint8Array([3]) },
  });

  // ID (offset = null, identifier = 4).
  t.throws(() => builder.whereField('id', 999), {
    message: (m) => m.includes('Field [id] does not have a fixed offset'),
  });

  // ID (offset = null, identifier = 4) with explicit offset.
  t.deepEqual(builder.whereField('id', 999, 42).options.filters?.[0], {
    memcmp: { offset: 42, bytes: new Uint8Array([4]) },
  });
});

test('it can add a data slice using a field', (t) => {
  const builder = getPersonGpaBuilder();

  // Age (offset = 0, size = 1).
  t.deepEqual(builder.sliceField('age').options.dataSlice, {
    offset: 0,
    length: 1,
  });

  // Name (offset = 1, size = 32).
  t.deepEqual(builder.sliceField('name').options.dataSlice, {
    offset: 1,
    length: 32,
  });

  // Balances (offset = 33, size = null).
  t.throws(() => builder.sliceField('balances'), {
    message: (m) =>
      m.includes('Cannot slice field [balances] because its size is variable.'),
  });

  // ID (offset = null, size = 8).
  t.throws(() => builder.sliceField('id'), {
    message: (m) => m.includes('Field [id] does not have a fixed offset'),
  });

  // ID (offset = null, size = 8) with explicit offset.
  t.deepEqual(builder.sliceField('id', 42).options.dataSlice, {
    offset: 42,
    length: 8,
  });
});

function getTestGpaBuilder(): GpaBuilder {
  return gpaBuilder(createNullContext(), defaultPublicKey());
}

function getPersonGpaBuilder(): GpaBuilder<RpcAccount, Person> {
  return getTestGpaBuilder().registerFieldsFromStruct<Person>([
    ['age', getTestSerializer<number>(1, 1)],
    ['name', getTestSerializer<string>(2, 32)],
    ['balances', getTestSerializer<(number | bigint)[], bigint[]>(3, null)],
    ['id', getTestSerializer<number | bigint, bigint>(4, 8)],
  ]);
}

function getTestSerializer<T, U extends T = T>(
  identifier: number,
  size: number | null
): Serializer<T, U> {
  return {
    description: 'test',
    fixedSize: size,
    maxSize: size,
    serialize: () => new Uint8Array([identifier]),
    deserialize: (bytes) => [{} as U, bytes.length],
  };
}
