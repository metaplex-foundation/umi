import {
  base58,
  getTransactionV1MessageSerializer,
  lamports,
  TransactionConfig,
  TransactionInput,
  TransactionMessage,
} from '@metaplex-foundation/umi';
import {
  AddressLookupTableAccount as Web3JsAddressLookupTableAccount,
  Message as Web3JsMessageLegacy,
  MessageV0 as Web3JsMessageV0,
  MessageV1 as Web3JsMessageV1,
  TransactionConfig as Web3JsTransactionConfig,
  VersionedMessage as Web3JsVersionedMessage,
} from '@solana/web3.js';
import { toWeb3JsInstruction } from './Instruction';
import { fromWeb3JsPublicKey, toWeb3JsPublicKey } from './PublicKey';

/**
 * A `MessageV1` that can be serialized.
 *
 * `@solana/web3.js` can only deserialize V1 messages, so this
 * subclass serializes them using Umi's own codec. This is what
 * allows wallet adapters and other web3.js consumers to sign
 * and send V1 transactions created by Umi.
 */
export class SerializableMessageV1 extends Web3JsMessageV1 {
  serialize(): Uint8Array {
    return getTransactionV1MessageSerializer().serialize(
      fromWeb3JsMessage(this)
    );
  }
}

export function fromWeb3JsMessage(
  message: Web3JsVersionedMessage
): TransactionMessage {
  const common = {
    header: message.header,
    accounts: message.staticAccountKeys.map(fromWeb3JsPublicKey),
    blockhash: message.recentBlockhash,
    instructions: message.compiledInstructions.map((instruction) => ({
      programIndex: instruction.programIdIndex,
      accountIndexes: instruction.accountKeyIndexes,
      data: new Uint8Array(instruction.data),
    })),
  };
  if (message.version === 1) {
    return {
      version: 1,
      ...common,
      addressLookupTables: [],
      transactionConfig: fromWeb3JsTransactionConfig(message.transactionConfig),
    };
  }
  return {
    version: message.version,
    ...common,
    addressLookupTables: message.addressTableLookups.map((lookup) => ({
      publicKey: fromWeb3JsPublicKey(lookup.accountKey),
      writableIndexes: lookup.writableIndexes,
      readonlyIndexes: lookup.readonlyIndexes,
    })),
  };
}

export function toWeb3JsMessage(
  message: TransactionMessage
): Web3JsVersionedMessage {
  if (message.version === 'legacy') {
    return new Web3JsMessageLegacy({
      header: message.header,
      accountKeys: message.accounts.map(toWeb3JsPublicKey),
      recentBlockhash: message.blockhash,
      instructions: message.instructions.map((instruction) => ({
        programIdIndex: instruction.programIndex,
        accounts: instruction.accountIndexes,
        data: base58.deserialize(instruction.data)[0],
      })),
    });
  }

  const compiledInstructions = message.instructions.map((instruction) => ({
    programIdIndex: instruction.programIndex,
    accountKeyIndexes: instruction.accountIndexes,
    data: instruction.data,
  }));

  if (message.version === 1) {
    return new SerializableMessageV1({
      header: message.header,
      staticAccountKeys: message.accounts.map(toWeb3JsPublicKey),
      recentBlockhash: message.blockhash,
      compiledInstructions,
      transactionConfig: toWeb3JsTransactionConfig(message.transactionConfig),
    });
  }

  return new Web3JsMessageV0({
    header: message.header,
    staticAccountKeys: message.accounts.map(toWeb3JsPublicKey),
    recentBlockhash: message.blockhash,
    compiledInstructions,
    addressTableLookups: message.addressLookupTables.map((lookup) => ({
      accountKey: toWeb3JsPublicKey(lookup.publicKey),
      writableIndexes: lookup.writableIndexes,
      readonlyIndexes: lookup.readonlyIndexes,
    })),
  });
}

export function toWeb3JsMessageFromInput(
  input: TransactionInput
): Web3JsVersionedMessage {
  if (input.version === 'legacy' || input.version === 1) {
    const legacyMessage = Web3JsMessageLegacy.compile({
      payerKey: toWeb3JsPublicKey(input.payer),
      instructions: input.instructions.map(toWeb3JsInstruction),
      recentBlockhash: input.blockhash,
    });
    if (input.version === 'legacy') {
      return legacyMessage;
    }
    // V1 messages lay out their accounts exactly like legacy messages.
    return new SerializableMessageV1({
      header: legacyMessage.header,
      staticAccountKeys: legacyMessage.staticAccountKeys,
      recentBlockhash: legacyMessage.recentBlockhash,
      compiledInstructions: legacyMessage.compiledInstructions,
      transactionConfig: toWeb3JsTransactionConfig(input.transactionConfig),
    });
  }

  return Web3JsMessageV0.compile({
    payerKey: toWeb3JsPublicKey(input.payer),
    instructions: input.instructions.map(toWeb3JsInstruction),
    recentBlockhash: input.blockhash,
    addressLookupTableAccounts: input.addressLookupTables?.map(
      (account) =>
        new Web3JsAddressLookupTableAccount({
          key: toWeb3JsPublicKey(account.publicKey),
          state: {
            addresses: account.addresses.map(toWeb3JsPublicKey),
            authority: undefined,
            deactivationSlot: BigInt(`0x${'ff'.repeat(8)}`),
            lastExtendedSlot: 0,
            lastExtendedSlotStartIndex: 0,
          },
        })
    ),
  });
}

export function fromWeb3JsTransactionConfig(
  config: Web3JsTransactionConfig
): TransactionConfig {
  const transactionConfig: TransactionConfig = {};
  if (config.priorityFee != null) {
    transactionConfig.priorityFee = lamports(config.priorityFee);
  }
  if (config.computeUnitLimit != null) {
    transactionConfig.computeUnitLimit = config.computeUnitLimit;
  }
  if (config.loadedAccountsDataSizeLimit != null) {
    transactionConfig.loadedAccountsDataSizeLimit =
      config.loadedAccountsDataSizeLimit;
  }
  if (config.heapSize != null) {
    transactionConfig.heapSize = config.heapSize;
  }
  return transactionConfig;
}

export function toWeb3JsTransactionConfig(
  config: TransactionConfig = {}
): Web3JsTransactionConfig {
  return {
    computeUnitLimit: config.computeUnitLimit ?? null,
    heapSize: config.heapSize ?? null,
    loadedAccountsDataSizeLimit: config.loadedAccountsDataSizeLimit ?? null,
    priorityFee:
      config.priorityFee === undefined
        ? null
        : Number(config.priorityFee.basisPoints),
  };
}
