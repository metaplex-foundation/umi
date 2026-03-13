import test from 'ava';
import {
  Context,
  createNullContext,
  defaultPublicKey,
  GpaBuilder,
  gpaBuilder,
  publicKey,
  publicKeyBytes,
  RpcAccount,
  sol,
} from '../src';
import { base58, Serializer } from '../src/serializers';

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
    memcmp: { offset: 42, bytes: publicKeyBytes(defaultPublicKey()) },
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

type Metadata = {
  name: string; // Size: 32
  symbol: string; // Size: 10
  creator: string; // Size: 32
};

type AccountWithNested = {
  authority: string; // Size: 32
  metadata: Metadata; // Size: 74 (32 + 10 + 32)
  amount: number; // Size: 8
};

test('it can register and filter nested struct fields', (t) => {
  // Register top-level fields first
  const builder = getTestGpaBuilder()
    .registerFieldsFromStruct<AccountWithNested>([
      ['authority', getTestSerializer<string>(1, 32)],
      ['metadata', getTestSerializer<Metadata>(2, 74)],
      ['amount', getTestSerializer<number>(3, 8)],
    ])
    // Register nested fields within metadata (starts at offset 32)
    .registerNestedFieldsFromStruct<Metadata>('metadata', 32, [
      ['name', getTestSerializer<string>(4, 32)],
      ['symbol', getTestSerializer<string>(5, 10)],
      ['creator', getTestSerializer<string>(6, 32)],
    ]);

  // Filter on top-level field still works
  t.deepEqual(builder.whereField('authority', 'test').options.filters?.[0], {
    memcmp: { offset: 0, bytes: new Uint8Array([1]) },
  });

  // Filter on nested field: metadata.name (offset = 32)
  t.deepEqual(
    builder.whereField('metadata.name', 'test').options.filters?.[0],
    {
      memcmp: { offset: 32, bytes: new Uint8Array([4]) },
    }
  );

  // Filter on nested field: metadata.symbol (offset = 32 + 32 = 64)
  t.deepEqual(
    builder.whereField('metadata.symbol', 'SYM').options.filters?.[0],
    {
      memcmp: { offset: 64, bytes: new Uint8Array([5]) },
    }
  );

  // Filter on nested field: metadata.creator (offset = 32 + 32 + 10 = 74)
  t.deepEqual(
    builder.whereField('metadata.creator', 'creator').options.filters?.[0],
    {
      memcmp: { offset: 74, bytes: new Uint8Array([6]) },
    }
  );
});

test('it can slice nested struct fields', (t) => {
  const builder = getTestGpaBuilder()
    .registerFieldsFromStruct<AccountWithNested>([
      ['authority', getTestSerializer<string>(1, 32)],
      ['metadata', getTestSerializer<Metadata>(2, 74)],
      ['amount', getTestSerializer<number>(3, 8)],
    ])
    .registerNestedFieldsFromStruct<Metadata>('metadata', 32, [
      ['name', getTestSerializer<string>(4, 32)],
      ['symbol', getTestSerializer<string>(5, 10)],
      ['creator', getTestSerializer<string>(6, 32)],
    ]);

  // Slice on nested field: metadata.name (offset = 32, size = 32)
  t.deepEqual(builder.sliceField('metadata.name').options.dataSlice, {
    offset: 32,
    length: 32,
  });

  // Slice on nested field: metadata.symbol (offset = 64, size = 10)
  t.deepEqual(builder.sliceField('metadata.symbol').options.dataSlice, {
    offset: 64,
    length: 10,
  });

  // Slice on nested field: metadata.creator (offset = 74, size = 32)
  t.deepEqual(builder.sliceField('metadata.creator').options.dataSlice, {
    offset: 74,
    length: 32,
  });
});

test('it handles nested fields after variable-length fields', (t) => {
  type NestedWithVariable = {
    fixedField: number; // Size: 8
    variableField: string[]; // Size: null
    afterVariable: number; // Size: 8
  };

  const builder = getTestGpaBuilder()
    .registerFieldsFromStruct<{ nested: NestedWithVariable }>([
      ['nested', getTestSerializer<NestedWithVariable>(1, null)],
    ])
    .registerNestedFieldsFromStruct<NestedWithVariable>('nested', 0, [
      ['fixedField', getTestSerializer<number>(2, 8)],
      ['variableField', getTestSerializer<string[]>(3, null)],
      ['afterVariable', getTestSerializer<number>(4, 8)],
    ]);

  // First nested field has fixed offset
  t.deepEqual(
    builder.whereField('nested.fixedField', 42).options.filters?.[0],
    {
      memcmp: { offset: 0, bytes: new Uint8Array([2]) },
    }
  );

  // Variable-length field has fixed offset (it's the second field)
  t.deepEqual(
    builder.whereField('nested.variableField', ['a', 'b']).options.filters?.[0],
    {
      memcmp: { offset: 8, bytes: new Uint8Array([3]) },
    }
  );

  // Field after variable-length field has null offset
  t.throws(() => builder.whereField('nested.afterVariable', 100), {
    message: (m) =>
      m.includes('Field [nested.afterVariable] does not have a fixed offset'),
  });

  // Can still filter with explicit offset
  t.deepEqual(
    builder.whereField('nested.afterVariable', 100, 50).options.filters?.[0],
    {
      memcmp: { offset: 50, bytes: new Uint8Array([4]) },
    }
  );
});

test('it can chain multiple nested struct registrations', (t) => {
  type Inner = {
    value: number; // Size: 4
  };

  type Outer = {
    inner: Inner; // Size: 4
    flag: boolean; // Size: 1
  };

  type Root = {
    header: number; // Size: 8
    outer: Outer; // Size: 5
  };

  const builder = getTestGpaBuilder()
    .registerFieldsFromStruct<Root>([
      ['header', getTestSerializer<number>(1, 8)],
      ['outer', getTestSerializer<Outer>(2, 5)],
    ])
    .registerNestedFieldsFromStruct<Outer>('outer', 8, [
      ['inner', getTestSerializer<Inner>(3, 4)],
      ['flag', getTestSerializer<boolean>(4, 1)],
    ])
    .registerNestedFieldsFromStruct<Inner>('outer.inner', 8, [
      ['value', getTestSerializer<number>(5, 4)],
    ]);

  // Top-level field
  t.deepEqual(builder.whereField('header', 123).options.filters?.[0], {
    memcmp: { offset: 0, bytes: new Uint8Array([1]) },
  });

  // First-level nested field: outer.flag (offset = 8 + 4 = 12)
  t.deepEqual(builder.whereField('outer.flag', true).options.filters?.[0], {
    memcmp: { offset: 12, bytes: new Uint8Array([4]) },
  });

  // Second-level nested field: outer.inner.value (offset = 8)
  t.deepEqual(
    builder.whereField('outer.inner.value', 42).options.filters?.[0],
    {
      memcmp: { offset: 8, bytes: new Uint8Array([5]) },
    }
  );
});

// Valid base58 public keys for testing.
const testKey1 = publicKey('11111111111111111111111111111111');
const testKey2 = publicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const testKey3 = publicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

test('safeGetDeserialized returns all accounts when none fail', async (t) => {
  const rpcAccounts = [createTestRpcAccount(testKey1)];
  const builder = getGpaBuilderWithAccounts(rpcAccounts).deserializeUsing(
    (account) => ({ publicKey: account.publicKey, value: 'ok' })
  );

  const results = await builder.safeGetDeserialized();
  t.is(results.length, 1);
  t.truthy(results[0].account);
  t.falsy(results[0].error);
  t.is(results[0].account!.value, 'ok');
  t.is(results[0].rpcAccount.publicKey, testKey1);
});

test('safeGetDeserialized collects failures and still returns successful accounts', async (t) => {
  const rpcAccounts = [
    createTestRpcAccount(testKey1),
    createTestRpcAccount(testKey2),
    createTestRpcAccount(testKey3),
  ];

  const builder = getGpaBuilderWithAccounts(rpcAccounts).deserializeUsing(
    (account) => {
      if (account.publicKey === testKey2) {
        throw new Error('Corrupted account');
      }
      return { publicKey: account.publicKey, value: 'ok' };
    }
  );

  const results = await builder.safeGetDeserialized();
  t.is(results.length, 3);

  // First account succeeds
  t.truthy(results[0].account);
  t.falsy(results[0].error);

  // Second account fails with SdkError
  t.falsy(results[1].account);
  t.truthy(results[1].error);
  t.is(results[1].rpcAccount.publicKey, testKey2);
  t.is(results[1].error!.name, 'SdkError');
  t.true(results[1].error!.message.includes(`Cannot deserialize account ${testKey2}`));

  // Third account succeeds
  t.truthy(results[2].account);
  t.falsy(results[2].error);
});

test('safeGetDeserialized returns raw accounts when no deserialize callback is set', async (t) => {
  const rpcAccounts = [createTestRpcAccount(testKey1)];
  const builder = getGpaBuilderWithAccounts(rpcAccounts);

  const results = await builder.safeGetDeserialized();
  t.is(results.length, 1);
  t.truthy(results[0].account);
  t.falsy(results[0].error);
  t.is(results[0].rpcAccount.publicKey, testKey1);
});

test('safeGetDeserialized handles all accounts failing', async (t) => {
  const rpcAccounts = [
    createTestRpcAccount(testKey1),
    createTestRpcAccount(testKey2),
  ];

  const builder = getGpaBuilderWithAccounts(rpcAccounts).deserializeUsing(
    () => {
      throw new Error('Cannot deserialize');
    }
  );

  const results = await builder.safeGetDeserialized();
  t.is(results.length, 2);
  t.truthy(results[0].error);
  t.falsy(results[0].account);
  t.truthy(results[1].error);
  t.falsy(results[1].account);
});

function createTestRpcAccount(pubkey: ReturnType<typeof publicKey>): RpcAccount {
  return {
    publicKey: pubkey,
    data: new Uint8Array([1, 2, 3]),
    executable: false,
    owner: defaultPublicKey(),
    lamports: sol(0),
  };
}

function getGpaBuilderWithAccounts(accounts: RpcAccount[]): GpaBuilder {
  const context: Pick<Context, 'rpc'> = {
    rpc: {
      ...createNullContext().rpc,
      getProgramAccounts: async () => accounts,
    },
  };
  return gpaBuilder(context, defaultPublicKey());
}

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
