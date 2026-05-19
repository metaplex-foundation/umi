import test from 'ava';
import {
  Account,
  Context,
  createNullContext,
  defaultPublicKey,
  fetchAllMixedAccounts,
  MaybeRpcAccount,
  PublicKey,
  publicKey,
  RpcAccount,
  safeFetchAllMixedAccounts,
  sol,
} from '../src';

type FooData = { kind: 'foo'; value: number };
type BarData = { kind: 'bar'; label: string };
type FooAccount = Account<FooData>;
type BarAccount = Account<BarData>;

const fooKey = publicKey('LorisCg1FTs89a32VSrFskYDgiRbNQzct1WxyZb7nuA');
const barKey = publicKey('11111111111111111111111111111111');

function rpcAccount(pubkey: PublicKey): RpcAccount {
  return {
    publicKey: pubkey,
    data: new Uint8Array(),
    executable: false,
    owner: defaultPublicKey(),
    lamports: sol(0),
  };
}

function existingAccount(pubkey: PublicKey): MaybeRpcAccount {
  return { exists: true, ...rpcAccount(pubkey) };
}

function missingAccount(pubkey: PublicKey): MaybeRpcAccount {
  return { exists: false, publicKey: pubkey };
}

function makeContext(accounts: MaybeRpcAccount[]): Pick<Context, 'rpc'> {
  return {
    rpc: {
      ...createNullContext().rpc,
      getAccounts: async () => accounts,
    },
  };
}

const deserializeFoo = (raw: RpcAccount): FooAccount => ({
  kind: 'foo',
  value: 1,
  publicKey: raw.publicKey,
  header: raw,
});

const deserializeBar = (raw: RpcAccount): BarAccount => ({
  kind: 'bar',
  label: 'b',
  publicKey: raw.publicKey,
  header: raw,
});

test('fetchAllMixedAccounts deserializes each account with its own deserializer', async (t) => {
  const context = makeContext([
    existingAccount(fooKey),
    existingAccount(barKey),
  ]);

  const [foo, bar] = await fetchAllMixedAccounts(context, [
    { publicKey: fooKey, deserialize: deserializeFoo },
    { publicKey: barKey, deserialize: deserializeBar },
  ]);

  // Type-level: TS should narrow `foo` to FooAccount and `bar` to BarAccount.
  t.is(foo.kind, 'foo');
  t.is(foo.value, 1);
  t.is(bar.kind, 'bar');
  t.is(bar.label, 'b');
});

test('fetchAllMixedAccounts throws if any account is missing', async (t) => {
  const context = makeContext([
    existingAccount(fooKey),
    missingAccount(barKey),
  ]);

  await t.throwsAsync(() =>
    fetchAllMixedAccounts(context, [
      { publicKey: fooKey, deserialize: deserializeFoo },
      { publicKey: barKey, deserialize: deserializeBar },
    ])
  );
});

test('safeFetchAllMixedAccounts returns null for missing accounts', async (t) => {
  const context = makeContext([
    existingAccount(fooKey),
    missingAccount(barKey),
  ]);

  const [foo, bar] = await safeFetchAllMixedAccounts(context, [
    { publicKey: fooKey, deserialize: deserializeFoo },
    { publicKey: barKey, deserialize: deserializeBar },
  ]);

  t.truthy(foo);
  t.is(foo?.kind, 'foo');
  t.is(bar, null);
});

test('safeFetchAllMixedAccounts deserializes all when every account exists', async (t) => {
  const context = makeContext([
    existingAccount(fooKey),
    existingAccount(barKey),
  ]);

  const [foo, bar] = await safeFetchAllMixedAccounts(context, [
    { publicKey: fooKey, deserialize: deserializeFoo },
    { publicKey: barKey, deserialize: deserializeBar },
  ]);

  t.is(foo?.kind, 'foo');
  t.is(bar?.label, 'b');
});

test('fetchAllMixedAccounts preserves input order in the result tuple', async (t) => {
  const context = makeContext([
    existingAccount(barKey),
    existingAccount(fooKey),
  ]);

  const [bar, foo] = await fetchAllMixedAccounts(context, [
    { publicKey: barKey, deserialize: deserializeBar },
    { publicKey: fooKey, deserialize: deserializeFoo },
  ]);

  t.is(bar.kind, 'bar');
  t.is(foo.kind, 'foo');
});

test('fetchAllMixedAccounts result tuple has per-element types (type-level)', async (t) => {
  const context = makeContext([
    existingAccount(fooKey),
    existingAccount(barKey),
  ]);

  const [foo, bar] = await fetchAllMixedAccounts(context, [
    { publicKey: fooKey, deserialize: deserializeFoo },
    { publicKey: barKey, deserialize: deserializeBar },
  ]);

  // These assignments must compile: tuple inference narrows each position
  // to its deserializer's return type rather than a union.
  const fooTyped: FooAccount = foo;
  const barTyped: BarAccount = bar;
  // @ts-expect-error - foo is FooAccount, not BarAccount.
  const wrong: BarAccount = foo;

  t.is(fooTyped.kind, 'foo');
  t.is(barTyped.kind, 'bar');
  t.truthy(wrong);
});

test('safeFetchAllMixedAccounts result tuple has per-element types (type-level)', async (t) => {
  const context = makeContext([
    existingAccount(fooKey),
    missingAccount(barKey),
  ]);

  const [foo, bar] = await safeFetchAllMixedAccounts(context, [
    { publicKey: fooKey, deserialize: deserializeFoo },
    { publicKey: barKey, deserialize: deserializeBar },
  ]);

  const fooTyped: FooAccount | null = foo;
  const barTyped: BarAccount | null = bar;
  // @ts-expect-error - foo is FooAccount | null, not BarAccount | null.
  const wrong: BarAccount | null = foo;

  t.truthy(fooTyped);
  t.is(barTyped, null);
  t.truthy(wrong);
});
