/* eslint-disable import/no-extraneous-dependencies */
import {
  CompiledAddressLookupTable,
  Context,
  EddsaInterface,
  Keypair,
  Pda,
  PublicKey,
  RpcInterface,
  Signer,
  Transaction,
  TransactionFactoryInterface,
  TransactionMessage,
  Umi,
  UmiPlugin,
  WrappedInstruction,
  createBaseUmi,
  createNullRpc,
  generateSigner,
  generatedSignerIdentity,
  lamports,
  publicKey,
  uniquePublicKeys,
} from '../src';
import { base10, utf8 } from '../src/serializers';

export const createUmi = (): Umi =>
  createBaseUmi().use(generatedSignerIdentity());

let mockKeypairCounter = 0;

const mockKeypairFromSeed = (seed: Uint8Array): Keypair => {
  const secretKey = new Uint8Array(64);
  secretKey.set(seed.slice(0, 32));
  secretKey.set(seed.slice(0, 32), 32);
  return { publicKey: publicKey(seed.slice(0, 32)), secretKey };
};

/**
 * A deterministic, non-cryptographic Eddsa mock.
 * - Keypairs use the first 32 bytes of the secret key as the public key bytes.
 * - Signatures are 64 bytes: the public key bytes followed by
 *   the first 32 bytes of the message (zero-padded).
 */
export const mockEddsa = (): EddsaInterface => ({
  generateKeypair: () => {
    mockKeypairCounter += 1;
    const seed = new Uint8Array(32).fill(7);
    // eslint-disable-next-line no-bitwise
    seed[0] = mockKeypairCounter & 0xff;
    // eslint-disable-next-line no-bitwise
    seed[1] = (mockKeypairCounter >> 8) & 0xff;
    return mockKeypairFromSeed(seed);
  },
  createKeypairFromSecretKey: (secretKey) => ({
    publicKey: publicKey(secretKey.slice(0, 32)),
    secretKey,
  }),
  createKeypairFromSeed: (seed) => mockKeypairFromSeed(seed),
  isOnCurve: () => true,
  findPda: (programId, seeds) => [programId, 255 - seeds.length] as Pda,
  sign: (message, keypair) => {
    const signature = new Uint8Array(64);
    signature.set(keypair.secretKey.slice(0, 32));
    signature.set(message.slice(0, 32), 32);
    return signature;
  },
  verify: (message, signature, key) => {
    const expectedStart = publicKey(signature.slice(0, 32));
    const expectedEnd = signature.slice(32, 32 + Math.min(message.length, 32));
    const messageStart = message.slice(0, 32);
    return (
      expectedStart === key &&
      expectedEnd.every((byte, index) => byte === messageStart[index])
    );
  },
});

const serializeMockMessage = (message: TransactionMessage): Uint8Array =>
  utf8.serialize(
    JSON.stringify(message, (key, value) =>
      value instanceof Uint8Array ? Array.from(value) : value
    )
  );

/**
 * A simplified transaction factory that compiles messages
 * into a JSON-based wire format. Sizes grow with content
 * so size-based methods behave realistically.
 */
export const mockTransactions = (): TransactionFactoryInterface => ({
  create: (input) => {
    const signerKeys = uniquePublicKeys([
      input.payer,
      ...input.instructions.flatMap((ix) =>
        ix.keys.filter((key) => key.isSigner).map((key) => key.pubkey)
      ),
    ]);
    const otherKeys = uniquePublicKeys([
      ...input.instructions.flatMap((ix) =>
        ix.keys.filter((key) => !key.isSigner).map((key) => key.pubkey)
      ),
      ...input.instructions.map((ix) => ix.programId),
    ]).filter((key) => !signerKeys.includes(key));
    const accounts = [...signerKeys, ...otherKeys];
    const addressLookupTables: CompiledAddressLookupTable[] =
      input.version !== 'legacy' && input.addressLookupTables
        ? input.addressLookupTables.map((lut) => ({
            publicKey: lut.publicKey,
            writableIndexes: [],
            readonlyIndexes: [],
          }))
        : [];
    const message: TransactionMessage = {
      version: input.version ?? 0,
      header: {
        numRequiredSignatures: signerKeys.length,
        numReadonlySignedAccounts: 0,
        numReadonlyUnsignedAccounts: otherKeys.length,
      },
      accounts,
      blockhash: input.blockhash,
      instructions: input.instructions.map((ix) => ({
        programIndex: accounts.indexOf(ix.programId),
        accountIndexes: ix.keys.map((key) => accounts.indexOf(key.pubkey)),
        data: ix.data,
      })),
      addressLookupTables,
    };
    return {
      message,
      serializedMessage: serializeMockMessage(message),
      signatures:
        input.signatures ??
        signerKeys.map(() => new Uint8Array(64)),
    };
  },
  serialize: (transaction) => {
    const signatures = transaction.signatures.flatMap((signature) => [
      ...signature,
    ]);
    return new Uint8Array([
      transaction.signatures.length,
      ...signatures,
      ...transaction.serializedMessage,
    ]);
  },
  deserialize: () => {
    throw new Error('Not implemented in mockTransactions.');
  },
  serializeMessage: (message) => serializeMockMessage(message),
  deserializeMessage: () => {
    throw new Error('Not implemented in mockTransactions.');
  },
});

export const MOCK_BLOCKHASH = 'GfVcyD4kkTrj4bKc7WA9sZCin9JDbdT4Zkd3EittNR1W';

/**
 * An RPC mock that supports the methods used by transaction
 * builders and records the transactions it sends.
 */
export const mockRpc = (
  history: { sent: Transaction[]; confirmed: Uint8Array[] } = {
    sent: [],
    confirmed: [],
  }
): RpcInterface => ({
  ...createNullRpc(),
  getLatestBlockhash: async () => ({
    blockhash: MOCK_BLOCKHASH,
    lastValidBlockHeight: 42,
  }),
  getRent: async (bytes) => lamports(BigInt(bytes) * 10n),
  sendTransaction: async (transaction) => {
    history.sent.push(transaction);
    return transaction.signatures[0] ?? new Uint8Array(64);
  },
  confirmTransaction: async (signature) => {
    history.confirmed.push(signature);
    return { context: { slot: 123 }, value: { err: null } };
  },
});

/** A Umi plugin that installs the mock Eddsa interface only. */
export const mockEddsaUmiPlugin = (): UmiPlugin => ({
  install(umi) {
    umi.eddsa = mockEddsa();
  },
});

/** Creates a Umi instance with mock eddsa, transactions and rpc interfaces. */
export const createMockUmi = (
  rpcHistory?: { sent: Transaction[]; confirmed: Uint8Array[] }
): Umi =>
  createBaseUmi()
    .use({
      install(umi) {
        umi.eddsa = mockEddsa();
        umi.transactions = mockTransactions();
        umi.rpc = mockRpc(rpcHistory);
      },
    })
    .use(generatedSignerIdentity());

export const mockInstruction = (): WrappedInstruction => ({
  instruction: {
    programId: publicKey('11111111111111111111111111111111'),
    keys: [
      {
        pubkey: publicKey('LorisCg1FTs89a32VSrFskYDgiRbNQzct1WxyZb7nuA'),
        isSigner: false,
        isWritable: true,
      },
    ],
    data: new Uint8Array(),
  },
  bytesCreatedOnChain: 0,
  signers: [],
});

export const transferSol = (
  context: Pick<Context, 'eddsa'>,
  params: {
    from?: Signer;
    to?: PublicKey;
    lamports?: number | bigint;
  } = {}
): WrappedInstruction => {
  const from = params.from ?? generateSigner(context);
  const to = params.to ?? generateSigner(context).publicKey;
  const lamports = BigInt(params.lamports ?? 1_000_000_000);
  const keys = [
    { pubkey: from.publicKey, isSigner: true, isWritable: true },
    { pubkey: to, isSigner: false, isWritable: true },
  ];

  return {
    instruction: {
      programId: publicKey('11111111111111111111111111111111'),
      keys,
      data: base10.serialize(lamports.toString()),
    },
    bytesCreatedOnChain: 0,
    signers: [from],
  };
};
