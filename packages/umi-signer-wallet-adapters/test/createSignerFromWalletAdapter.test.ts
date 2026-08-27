import { createBaseUmi, Transaction } from '@metaplex-foundation/umi';
import { fromWeb3JsTransaction } from '@metaplex-foundation/umi-web3js-adapters';
import {
  Keypair as Web3JsKeypair,
  MessageV0 as Web3JsMessageV0,
  SystemProgram,
  VersionedTransaction as Web3JsVersionedTransaction,
} from '@solana/web3.js';
import test from 'ava';
import {
  createSignerFromWalletAdapter,
  OperationNotSupportedByWalletAdapterError,
  UninitializedWalletAdapterError,
  WalletAdapter,
  walletAdapterIdentity,
  walletAdapterPayer,
} from '../src';

/**
 * A wallet adapter test double backed by a real web3.js keypair, so
 * signatures are genuine and conversions round-trip through the same
 * transaction classes real wallets receive.
 */
const createMockWalletAdapter = (keypair: Web3JsKeypair) => {
  const received: unknown[] = [];
  const walletAdapter: WalletAdapter = {
    publicKey: keypair.publicKey,
    signMessage: async (message) =>
      // Real wallets sign arbitrary bytes; for the delegation test we
      // only need a deterministic, observable transformation.
      new Uint8Array([...message].reverse()),
    signTransaction: async (transaction) => {
      received.push(transaction);
      if (transaction instanceof Web3JsVersionedTransaction) {
        transaction.sign([keypair]);
      }
      return transaction;
    },
    signAllTransactions: async (transactions) => {
      transactions.forEach((transaction) => {
        if (transaction instanceof Web3JsVersionedTransaction) {
          transaction.sign([keypair]);
        }
      });
      return transactions;
    },
  };
  return { walletAdapter, received };
};

const createUnsignedTransaction = (payer: Web3JsKeypair): Transaction => {
  const receiver = Web3JsKeypair.generate();
  const message = Web3JsMessageV0.compile({
    payerKey: payer.publicKey,
    instructions: [
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: receiver.publicKey,
        lamports: 1_000,
      }),
    ],
    recentBlockhash: '11111111111111111111111111111111',
  });
  return fromWeb3JsTransaction(new Web3JsVersionedTransaction(message));
};

test('it exposes the wallet public key as a umi public key', (t) => {
  const keypair = Web3JsKeypair.generate();
  const { walletAdapter } = createMockWalletAdapter(keypair);
  const signer = createSignerFromWalletAdapter(walletAdapter);
  t.is(keypair.publicKey.toBase58(), signer.publicKey);
});

test('it throws when reading the public key of an uninitialized wallet', (t) => {
  const signer = createSignerFromWalletAdapter({ publicKey: null });
  t.throws(() => signer.publicKey, {
    instanceOf: UninitializedWalletAdapterError,
  });
});

test('it delegates message signing to the wallet', async (t) => {
  const { walletAdapter } = createMockWalletAdapter(Web3JsKeypair.generate());
  const signer = createSignerFromWalletAdapter(walletAdapter);
  const signature = await signer.signMessage(new Uint8Array([1, 2, 3]));
  t.deepEqual(signature, new Uint8Array([3, 2, 1]));
});

test('it signs a transaction through the wallet as a versioned transaction', async (t) => {
  const keypair = Web3JsKeypair.generate();
  const { walletAdapter, received } = createMockWalletAdapter(keypair);
  const signer = createSignerFromWalletAdapter(walletAdapter);
  const unsigned = createUnsignedTransaction(keypair);

  const signed = await signer.signTransaction(unsigned);

  // The wallet received the same class real wallet adapters receive.
  t.is(received.length, 1);
  t.true(received[0] instanceof Web3JsVersionedTransaction);

  // The returned umi transaction carries the wallet's real signature.
  t.is(signed.signatures.length, 1);
  const reference = new Web3JsVersionedTransaction(
    Web3JsMessageV0.deserialize(unsigned.serializedMessage)
  );
  reference.sign([keypair]);
  t.deepEqual(signed.signatures[0], reference.signatures[0]);
});

test('it signs multiple transactions preserving order', async (t) => {
  const keypair = Web3JsKeypair.generate();
  const { walletAdapter } = createMockWalletAdapter(keypair);
  const signer = createSignerFromWalletAdapter(walletAdapter);
  const [first, second] = [
    createUnsignedTransaction(keypair),
    createUnsignedTransaction(keypair),
  ];

  const signed = await signer.signAllTransactions([first, second]);
  t.is(signed.length, 2);
  t.deepEqual(signed[0].serializedMessage, first.serializedMessage);
  t.deepEqual(signed[1].serializedMessage, second.serializedMessage);
  signed.forEach((transaction) => {
    t.is(transaction.signatures.length, 1);
    t.notDeepEqual(transaction.signatures[0], new Uint8Array(64));
  });
});

test('it reports unsupported operations explicitly', async (t) => {
  const signer = createSignerFromWalletAdapter({
    publicKey: Web3JsKeypair.generate().publicKey,
  });
  await t.throwsAsync(() => signer.signMessage(new Uint8Array()), {
    instanceOf: OperationNotSupportedByWalletAdapterError,
  });
  await t.throwsAsync(
    () => signer.signTransaction(createUnsignedTransaction(Web3JsKeypair.generate())),
    { instanceOf: OperationNotSupportedByWalletAdapterError }
  );
  await t.throwsAsync(() => signer.signAllTransactions([]), {
    instanceOf: OperationNotSupportedByWalletAdapterError,
  });
});

test('the identity and payer plugins install the wallet signer', (t) => {
  const keypair = Web3JsKeypair.generate();
  const { walletAdapter } = createMockWalletAdapter(keypair);

  const asIdentity = createBaseUmi().use(walletAdapterIdentity(walletAdapter));
  t.is(keypair.publicKey.toBase58(), asIdentity.identity.publicKey);
  t.is(keypair.publicKey.toBase58(), asIdentity.payer.publicKey);

  const asPayerOnly = createBaseUmi().use(walletAdapterPayer(walletAdapter));
  t.is(keypair.publicKey.toBase58(), asPayerOnly.payer.publicKey);
});
