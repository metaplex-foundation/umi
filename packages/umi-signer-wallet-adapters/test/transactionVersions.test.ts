import type { TransactionVersion } from '@metaplex-foundation/umi';
import test from 'ava';
import {
  getLatestSupportedTransactionVersion,
  getSupportedTransactionVersions,
  OperationNotSupportedByWalletAdapterError,
} from '../src';

const adapter = (versions: TransactionVersion[] | null) => ({
  supportedTransactionVersions: versions === null ? null : new Set(versions),
});

// Like StandardWalletAdapter: the versions come from a getter that merges the
// sign-and-send and sign lists, and `wallet` is the wallet-standard wallet.
const standardAdapter = (options: {
  signTransaction?: unknown[];
  signAndSendTransaction?: unknown[];
  connected?: boolean;
  canSign?: boolean;
}) => {
  const features: Record<string, unknown> = {};
  if (options.signTransaction) {
    features['solana:signTransaction'] = {
      supportedTransactionVersions: options.signTransaction,
    };
  }
  if (options.signAndSendTransaction) {
    features['solana:signAndSendTransaction'] = {
      supportedTransactionVersions: options.signAndSendTransaction,
    };
  }
  class StandardLikeAdapter {
    readonly wallet = { features };

    readonly publicKey = options.connected ? 'somePublicKey' : null;

    signTransaction?: () => void =
      options.canSign === false ? undefined : () => {};

    get supportedTransactionVersions() {
      return new Set(
        (options.signAndSendTransaction ??
          options.signTransaction) as TransactionVersion[]
      );
    }
  }
  return new StandardLikeAdapter();
};

test('it returns the latest version a wallet adapter supports', (t) => {
  t.is(getLatestSupportedTransactionVersion(adapter(['legacy', 0, 1])), 1);
  t.is(getLatestSupportedTransactionVersion(adapter([1])), 1);
  t.is(getLatestSupportedTransactionVersion(adapter(['legacy', 0])), 0);
  t.is(getLatestSupportedTransactionVersion(adapter(['legacy'])), 'legacy');
});

test('it treats wallets that advertise no versions as legacy-only', (t) => {
  t.is(getLatestSupportedTransactionVersion(adapter(null)), 'legacy');
  t.is(getLatestSupportedTransactionVersion(adapter([])), 'legacy');
  t.is(getLatestSupportedTransactionVersion({}), 'legacy');
  t.deepEqual([...getSupportedTransactionVersions(adapter(null))], ['legacy']);
});

test('it reads the selected adapter from the useWallet() state', (t) => {
  t.is(
    getLatestSupportedTransactionVersion({
      wallet: { adapter: adapter(['legacy', 0, 1]) },
    }),
    1
  );
  t.is(
    getLatestSupportedTransactionVersion({
      wallet: { adapter: standardAdapter({ signTransaction: [0, 1] }) },
    }),
    1
  );
  t.is(getLatestSupportedTransactionVersion({ wallet: null }), 'legacy');
});

test('it reads the signTransaction feature over the merged adapter list', (t) => {
  // Sign-and-send supports V1 but signing does not: Umi only signs.
  const signOnlyV0 = standardAdapter({
    signTransaction: ['legacy', 0],
    signAndSendTransaction: ['legacy', 0, 1],
  });
  t.is(signOnlyV0.supportedTransactionVersions.has(1), true);
  t.is(getLatestSupportedTransactionVersion(signOnlyV0), 0);

  // And the other way around.
  const signV1 = standardAdapter({
    signTransaction: ['legacy', 0, 1],
    signAndSendTransaction: ['legacy', 0],
  });
  t.is(getLatestSupportedTransactionVersion(signV1), 1);
});

test('it falls back to the adapter list without a signTransaction feature', (t) => {
  const wallet = standardAdapter({ signAndSendTransaction: ['legacy', 0] });
  t.is(getLatestSupportedTransactionVersion(wallet), 0);
});

test('it ignores versions it does not know', (t) => {
  const wallet = standardAdapter({ signTransaction: [0, 2, 'v9'] });
  t.deepEqual([...getSupportedTransactionVersions(wallet)], [0]);
});

test('it throws if a connected wallet cannot sign transactions', (t) => {
  const wallet = standardAdapter({
    signTransaction: ['legacy', 0, 1],
    connected: true,
    canSign: false,
  });
  t.throws(() => getLatestSupportedTransactionVersion(wallet), {
    instanceOf: OperationNotSupportedByWalletAdapterError,
  });
  t.throws(
    () => getLatestSupportedTransactionVersion({ wallet: { adapter: wallet } }),
    {
      instanceOf: OperationNotSupportedByWalletAdapterError,
    }
  );

  // Before connecting, the versions are still readable.
  const disconnected = standardAdapter({
    signTransaction: ['legacy', 0, 1],
    canSign: false,
  });
  t.is(getLatestSupportedTransactionVersion(disconnected), 1);
});
