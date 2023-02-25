/* eslint-disable no-bitwise */
import {
  base58,
  CompiledAddressLookupTable,
  CompiledInstruction,
  Context,
  SerializedTransaction,
  SerializedTransactionMessage,
  Serializer,
  Transaction,
  TransactionFactoryInterface,
  TransactionInput,
  TransactionMessage,
  TransactionMessageHeader,
} from '@metaplex-foundation/umi-core';
import {
  fromWeb3JsMessage,
  fromWeb3JsTransaction,
  toWeb3JsMessageFromInput,
  toWeb3JsTransaction,
} from '@metaplex-foundation/umi-web3js-adapters';
import { VersionedTransaction as Web3JsTransaction } from '@solana/web3.js';

export class Web3JsTransactionFactory implements TransactionFactoryInterface {
  protected readonly context: Pick<Context, 'serializer'>;

  constructor(context: Web3JsTransactionFactory['context']) {
    this.context = context;
  }

  create(input: TransactionInput): Transaction {
    const web3JsMessage = toWeb3JsMessageFromInput(input);
    const message = fromWeb3JsMessage(web3JsMessage);
    const web3JsTransaction = new Web3JsTransaction(
      web3JsMessage,
      input.signatures
    );
    return {
      message,
      serializedMessage: this.serializeMessage(message),
      signatures: web3JsTransaction.signatures,
    };
  }

  serialize(transaction: Transaction): SerializedTransaction {
    return toWeb3JsTransaction(transaction).serialize();
  }

  deserialize(serializedTransaction: SerializedTransaction): Transaction {
    return fromWeb3JsTransaction(
      Web3JsTransaction.deserialize(serializedTransaction)
    );
  }

  serializeMessage(message: TransactionMessage): SerializedTransactionMessage {
    return this.getTransactionMessageSerializer().serialize(message);
  }

  deserializeMessage(
    serializedMessage: SerializedTransactionMessage
  ): TransactionMessage {
    return this.getTransactionMessageSerializer().deserialize(
      serializedMessage
    )[0];
  }

  getTransactionMessageSerializer(): Serializer<TransactionMessage> {
    const s = this.context.serializer;
    return s.struct<TransactionMessage, TransactionMessage>([
      // const MESSAGE_VERSION_0_PREFIX = 1 << 7;
      ['version', s.u8()], // TODO
      [
        'header',
        s.struct<TransactionMessageHeader, TransactionMessageHeader>([
          ['numRequiredSignatures', s.u8()],
          ['numReadonlySignedAccounts', s.u8()],
          ['numReadonlyUnsignedAccounts', s.u8()],
        ]),
      ],
      ['accounts', s.array(s.publicKey(), { size: shortU16() })],
      ['blockhash', s.string({ encoding: base58, size: 32 })],
      [
        'instructions',
        s.array(this.getCompiledInstructionSerializer(), { size: shortU16() }),
      ],
      [
        'addressLookupTables',
        s.array(this.getCompiledAddressLookupTableSerializer(), {
          size: shortU16(),
        }),
      ],
    ]);
  }

  getCompiledInstructionSerializer(): Serializer<CompiledInstruction> {
    const s = this.context.serializer;
    return s.struct<CompiledInstruction>([
      ['programIndex', s.u8()],
      ['accountIndexes', s.array(s.u8(), { size: shortU16() })],
      ['data', s.bytes({ size: shortU16() })],
    ]);
  }

  getCompiledAddressLookupTableSerializer(): Serializer<CompiledAddressLookupTable> {
    const s = this.context.serializer;
    return s.struct<CompiledAddressLookupTable>([
      ['publicKey', s.publicKey()],
      ['writableIndexes', s.array(s.u8(), { size: shortU16() })],
      ['readonlyIndexes', s.array(s.u8(), { size: shortU16() })],
    ]);
  }
}

/**
 * Same as u16, but serialized with 1 to 3 bytes.
 *
 * If the value is above 0x7f, the top bit is set and the remaining
 * value is stored in the next bytes. Each byte follows the same
 * pattern until the 3rd byte. The 3rd byte, if needed, uses
 * all 8 bits to store the last byte of the original value.
 */
export const shortU16 = (): Serializer<number> => ({
  description: 'shortU16',
  fixedSize: null,
  maxSize: 3,
  serialize: (value: number): Uint8Array => {
    const bytes = [] as number[];
    let remainingValue = value;
    for (;;) {
      let elem = remainingValue & 0x7f;
      remainingValue >>= 7;
      if (remainingValue === 0) {
        bytes.push(elem);
        break;
      } else {
        elem |= 0x80;
        bytes.push(elem);
      }
    }
    return new Uint8Array(bytes);
  },
  deserialize: (buffer: Uint8Array, offset = 0): [number, number] => {
    const bytes = [...buffer.slice(offset)];
    let len = 0;
    let size = 0;
    for (;;) {
      const elem = bytes.shift() as number;
      len |= (elem & 0x7f) << (size * 7);
      size += 1;
      if ((elem & 0x80) === 0) {
        break;
      }
    }
    return [len, offset + size];
  },
});
