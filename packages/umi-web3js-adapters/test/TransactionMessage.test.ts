import {
  Instruction,
  lamports,
  publicKey,
  SdkError,
  Transaction,
  TransactionConfig,
  TransactionConfigInput,
  TransactionMessage,
  TRANSACTION_CONFIG_MAX,
} from '@metaplex-foundation/umi';
import {
  Message as Web3JsMessageLegacy,
  MessageV0 as Web3JsMessageV0,
  PublicKey as Web3JsPublicKey,
  Transaction as Web3JsLegacyTransaction,
} from '@solana/web3.js';
import test from 'ava';
import {
  compileTransactionMessage,
  fromWeb3JsMessage,
  toWeb3JsLegacyTransaction,
  toWeb3JsMessage,
  toWeb3JsMessageFromInput,
  toWeb3JsTransaction,
  Web3JsTransactionVersionError,
} from '../src';

const BLOCKHASH = '11111111111111111111111111111111';
const SYSTEM_PROGRAM = publicKey('11111111111111111111111111111111');
const PAYER = publicKey('AKnL4NNf3DGWZJS6cPknBuEGnVsV4A4m5tgebLHaRSZ9');
const RECIPIENT = publicKey('5Z6Ay5NEcbg3xhopc522sBCRXQujkTiuDRnHGfQdcnSf');

const transfer: Instruction = {
  programId: SYSTEM_PROGRAM,
  keys: [
    { pubkey: PAYER, isSigner: true, isWritable: true },
    { pubkey: RECIPIENT, isSigner: false, isWritable: true },
  ],
  data: new Uint8Array([2, 0, 0, 0, 64, 66, 15, 0, 0, 0, 0, 0]),
};
const baseInput = {
  payer: PAYER,
  instructions: [transfer],
  blockhash: BLOCKHASH,
};

const v1Message: TransactionMessage = {
  version: 1,
  header: {
    numRequiredSignatures: 1,
    numReadonlySignedAccounts: 0,
    numReadonlyUnsignedAccounts: 0,
  },
  accounts: [PAYER],
  blockhash: BLOCKHASH,
  instructions: [],
  addressLookupTables: [],
  transactionConfig: TRANSACTION_CONFIG_MAX,
};

const asTransaction = (message: TransactionMessage): Transaction => ({
  message,
  serializedMessage: new Uint8Array(),
  signatures: [new Uint8Array(64)],
});

test('it converts legacy and V0 messages from web3.js', (t) => {
  const legacy = fromWeb3JsMessage(
    Web3JsMessageLegacy.compile({
      payerKey: new Web3JsPublicKey(PAYER),
      instructions: [],
      recentBlockhash: BLOCKHASH,
    })
  );
  const v0 = fromWeb3JsMessage(
    Web3JsMessageV0.compile({
      payerKey: new Web3JsPublicKey(PAYER),
      instructions: [],
      recentBlockhash: BLOCKHASH,
    })
  );

  t.like(legacy, {
    version: 'legacy',
    accounts: [PAYER],
    blockhash: BLOCKHASH,
  });
  t.like(v0, { version: 0, accounts: [PAYER], addressLookupTables: [] });
  t.false('transactionConfig' in legacy);
  t.false('transactionConfig' in v0);
});

test('it cannot convert a web3.js V1 message', (t) => {
  const web3JsMessageV1 = {
    version: 1,
    header: v1Message.header,
    staticAccountKeys: [new Web3JsPublicKey(PAYER)],
    recentBlockhash: BLOCKHASH,
    compiledInstructions: [],
    addressTableLookups: [],
    transactionConfig: {},
  } as unknown as Web3JsMessageV0;

  t.throws(() => fromWeb3JsMessage(web3JsMessageV1), {
    instanceOf: Web3JsTransactionVersionError,
    message: /fromWeb3JsMessage.*V1.*umi\.transactions\.deserialize/,
  });
});

const compiledTransfer = {
  header: {
    numRequiredSignatures: 1,
    numReadonlySignedAccounts: 0,
    numReadonlyUnsignedAccounts: 1,
  },
  accounts: [PAYER, RECIPIENT, SYSTEM_PROGRAM],
  blockhash: BLOCKHASH,
  instructions: [
    { programIndex: 2, accountIndexes: [0, 1], data: transfer.data },
  ],
  addressLookupTables: [],
};

test('it compiles legacy and V0 inputs', (t) => {
  t.deepEqual(compileTransactionMessage({ ...baseInput, version: 'legacy' }), {
    version: 'legacy',
    ...compiledTransfer,
  });
  t.deepEqual(compileTransactionMessage({ ...baseInput, version: 0 }), {
    version: 0,
    ...compiledTransfer,
  });
  t.deepEqual(compileTransactionMessage(baseInput), {
    version: 0,
    ...compiledTransfer,
  });
});

test('it compiles V1 inputs like V0 messages carrying a transaction config', (t) => {
  const transactionConfig = {
    ...TRANSACTION_CONFIG_MAX,
    priorityFee: lamports(1_000),
  };

  const message = compileTransactionMessage({
    ...baseInput,
    version: 1,
    transactionConfig,
  });

  t.deepEqual(message, { version: 1, ...compiledTransfer, transactionConfig });
});

test('it refuses to compile a V1 input that lacks a required limit', (t) => {
  const compileWithConfig = (transactionConfig: TransactionConfig) =>
    compileTransactionMessage({
      ...baseInput,
      version: 1,
      transactionConfig: transactionConfig as TransactionConfigInput,
    });

  t.throws(() => compileWithConfig({ loadedAccountsDataSizeLimit: 32_768 }), {
    instanceOf: SdkError,
    message: /finite computeUnitLimit/,
  });
  t.throws(() => compileWithConfig({ computeUnitLimit: 200_000 }), {
    instanceOf: SdkError,
    message: /finite loadedAccountsDataSizeLimit/,
  });
  t.throws(
    () => compileWithConfig({ ...TRANSACTION_CONFIG_MAX, heapSize: 1024 }),
    { instanceOf: SdkError, message: /heap size/ }
  );
});

test('it cannot compile a V1 input with web3.js', (t) => {
  t.throws(
    () =>
      toWeb3JsMessageFromInput({
        ...baseInput,
        version: 1,
        transactionConfig: TRANSACTION_CONFIG_MAX,
      }),
    {
      instanceOf: Web3JsTransactionVersionError,
      message: /toWeb3JsMessageFromInput.*V1.*compileTransactionMessage/,
    }
  );
});

test('it cannot convert a V1 message or transaction to web3.js', (t) => {
  const expected = {
    instanceOf: Web3JsTransactionVersionError,
    message: /V1.*umi\.transactions\.serialize/,
  };
  t.throws(() => toWeb3JsMessage(v1Message), expected);
  t.throws(() => toWeb3JsTransaction(asTransaction(v1Message)), expected);
  t.throws(() => toWeb3JsLegacyTransaction(asTransaction(v1Message)), {
    ...expected,
    message: /toWeb3JsLegacyTransaction/,
  });
});

test('it still converts V0 transactions to legacy web3.js transactions', (t) => {
  const v0Message = compileTransactionMessage({ ...baseInput, version: 0 });
  const legacyTransaction = toWeb3JsLegacyTransaction(asTransaction(v0Message));
  t.true(legacyTransaction instanceof Web3JsLegacyTransaction);
  t.is(legacyTransaction.instructions.length, 1);
});
