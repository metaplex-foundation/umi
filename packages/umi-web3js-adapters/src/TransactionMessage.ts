import {
  assertValidTransactionConfigInput,
  base58,
  SdkError,
  TransactionInput,
  TransactionMessage,
  TransactionVersion,
} from '@metaplex-foundation/umi';
import {
  AddressLookupTableAccount as Web3JsAddressLookupTableAccount,
  Message as Web3JsMessageLegacy,
  MessageV0 as Web3JsMessageV0,
} from '@solana/web3.js';
import { Web3JsTransactionVersionError } from './errors';
import { toWeb3JsInstruction } from './Instruction';
import { fromWeb3JsPublicKey, toWeb3JsPublicKey } from './PublicKey';

export function fromWeb3JsMessage(
  message: Web3JsMessageLegacy | Web3JsMessageV0
): TransactionMessage {
  switch (message.version) {
    case 'legacy':
    case 0:
      return {
        version: message.version,
        header: message.header,
        accounts: message.staticAccountKeys.map(fromWeb3JsPublicKey),
        blockhash: message.recentBlockhash,
        instructions: message.compiledInstructions.map((instruction) => ({
          programIndex: instruction.programIdIndex,
          accountIndexes: instruction.accountKeyIndexes,
          data: new Uint8Array(instruction.data),
        })),
        addressLookupTables: message.addressTableLookups.map((lookup) => ({
          publicKey: fromWeb3JsPublicKey(lookup.accountKey),
          writableIndexes: lookup.writableIndexes,
          readonlyIndexes: lookup.readonlyIndexes,
        })),
      };
    default: {
      // Reached at runtime by the `MessageV1` of @solana/web3.js 1.99+,
      // which is outside the peer range and cannot serialize itself.
      const never: never = message;
      const { version } = never as { version: TransactionVersion };
      throw new Web3JsTransactionVersionError(
        'fromWeb3JsMessage',
        version,
        'Deserialize the wire bytes with `umi.transactions.deserialize` instead.'
      );
    }
  }
}

export function toWeb3JsMessage(
  message: TransactionMessage
): Web3JsMessageLegacy | Web3JsMessageV0 {
  switch (message.version) {
    case 'legacy':
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
    case 0:
      return new Web3JsMessageV0({
        header: message.header,
        staticAccountKeys: message.accounts.map(toWeb3JsPublicKey),
        recentBlockhash: message.blockhash,
        compiledInstructions: message.instructions.map((instruction) => ({
          programIdIndex: instruction.programIndex,
          accountKeyIndexes: instruction.accountIndexes,
          data: instruction.data,
        })),
        addressTableLookups: message.addressLookupTables.map((lookup) => ({
          accountKey: toWeb3JsPublicKey(lookup.publicKey),
          writableIndexes: lookup.writableIndexes,
          readonlyIndexes: lookup.readonlyIndexes,
        })),
      });
    case 1:
      throw new Web3JsTransactionVersionError(
        'toWeb3JsMessage',
        message.version
      );
    default: {
      const never: never = message.version;
      throw new SdkError(`Unsupported transaction version: ${never}.`);
    }
  }
}

export function toWeb3JsMessageFromInput(
  input: TransactionInput
): Web3JsMessageLegacy | Web3JsMessageV0 {
  switch (input.version) {
    case 'legacy':
      return Web3JsMessageLegacy.compile({
        payerKey: toWeb3JsPublicKey(input.payer),
        instructions: input.instructions.map(toWeb3JsInstruction),
        recentBlockhash: input.blockhash,
      });
    case 0:
    case undefined:
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
    case 1:
      throw new Web3JsTransactionVersionError(
        'toWeb3JsMessageFromInput',
        input.version,
        'Compile the input with `compileTransactionMessage` instead.'
      );
    default: {
      const never: never = input;
      const { version } = never as TransactionInput;
      throw new SdkError(`Unsupported transaction version: ${version}.`);
    }
  }
}

/**
 * Compiles a transaction input into a Umi message, whatever its version.
 */
export function compileTransactionMessage(
  input: TransactionInput
): TransactionMessage {
  switch (input.version) {
    case 'legacy':
    case 0:
    case undefined:
      return fromWeb3JsMessage(toWeb3JsMessageFromInput(input));
    case 1:
      assertValidTransactionConfigInput(input.transactionConfig);
      // V1 messages lay out their accounts exactly like V0 messages without
      // lookup tables, so @solana/web3.js 1.x compiles them as such.
      return {
        ...fromWeb3JsMessage(
          toWeb3JsMessageFromInput({
            version: 0,
            payer: input.payer,
            instructions: input.instructions,
            blockhash: input.blockhash,
          })
        ),
        version: 1,
        addressLookupTables: [],
        transactionConfig: input.transactionConfig,
      };
    default: {
      const never: never = input;
      const { version } = never as TransactionInput;
      throw new SdkError(`Unsupported transaction version: ${version}.`);
    }
  }
}
