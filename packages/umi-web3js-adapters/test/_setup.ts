import {
  AddressLookupTableAccount as Web3JsAddressLookupTableAccount,
  Keypair as Web3JsKeypair,
  Message as Web3JsLegacyMessage,
  MessageV0 as Web3JsV0Message,
  PublicKey as Web3JsPublicKey,
  SystemProgram,
  TransactionInstruction as Web3JsInstruction,
} from '@solana/web3.js';

/**
 * A valid blockhash-shaped value (32 zero bytes in base58).
 */
export const BLOCKHASH = '11111111111111111111111111111111';

/**
 * Generates a web3.js keypair.
 *
 * This helper is async even though web3.js v1 is synchronous here, so
 * that the same suite can validate the adapters against web3.js v3,
 * where key generation and signing are Promise-based. The same applies
 * to the `await`s on `sign`, `partialSign` and `serialize` in the
 * tests themselves.
 */
export const generateWeb3JsKeypair = async (): Promise<Web3JsKeypair> =>
  Web3JsKeypair.generate();

/**
 * Creates a system transfer instruction between two fresh keys.
 */
export const createWeb3JsTransferInstruction = (
  from: Web3JsPublicKey,
  to: Web3JsPublicKey
): Web3JsInstruction =>
  SystemProgram.transfer({
    fromPubkey: from,
    toPubkey: to,
    lamports: 1_000_000_000,
  });

/**
 * Compiles a legacy message wrapping a single transfer instruction.
 */
export const createWeb3JsLegacyMessage = (
  payer: Web3JsPublicKey,
  instruction: Web3JsInstruction
): Web3JsLegacyMessage =>
  Web3JsLegacyMessage.compile({
    payerKey: payer,
    instructions: [instruction],
    recentBlockhash: BLOCKHASH,
  });

/**
 * Creates an address lookup table account containing the given
 * addresses, using the same synthetic state the adapters rely on.
 */
export const createWeb3JsLookupTable = (
  key: Web3JsPublicKey,
  addresses: Web3JsPublicKey[]
): Web3JsAddressLookupTableAccount =>
  new Web3JsAddressLookupTableAccount({
    key,
    state: {
      addresses,
      authority: undefined,
      deactivationSlot: BigInt(`0x${'ff'.repeat(8)}`),
      lastExtendedSlot: 0,
      lastExtendedSlotStartIndex: 0,
    },
  });

/**
 * Compiles a V0 message wrapping a single transfer instruction,
 * optionally resolving accounts through the given lookup tables.
 */
export const createWeb3JsV0Message = (
  payer: Web3JsPublicKey,
  instruction: Web3JsInstruction,
  addressLookupTableAccounts?: Web3JsAddressLookupTableAccount[]
): Web3JsV0Message =>
  Web3JsV0Message.compile({
    payerKey: payer,
    instructions: [instruction],
    recentBlockhash: BLOCKHASH,
    addressLookupTableAccounts,
  });

/**
 * Normalizes Buffers and byte arrays for deep-equality assertions.
 */
export const bytes = (input: Uint8Array | number[]): Uint8Array =>
  new Uint8Array(input);
