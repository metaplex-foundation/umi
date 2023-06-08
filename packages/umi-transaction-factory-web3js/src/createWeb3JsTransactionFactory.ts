/* eslint-disable no-bitwise */
import {
  base58,
  CompiledAddressLookupTable,
  CompiledInstruction,
  Context,
  mapSerializer,
  SdkError,
  SerializedTransaction,
  SerializedTransactionMessage,
  Serializer,
  Transaction,
  TransactionFactoryInterface,
  TransactionInput,
  TransactionMessage,
  TransactionMessageHeader,
  TransactionVersion,
} from '@metaplex-foundation/umi';
import { shortU16 } from '@metaplex-foundation/umi-serializer-data-view';
import {
  fromWeb3JsMessage,
  toWeb3JsMessageFromInput,
} from '@metaplex-foundation/umi-web3js-adapters';
import { VersionedTransaction as Web3JsTransaction } from '@solana/web3.js';

const TRANSACTION_VERSION_FLAG = 0x80;
const TRANSACTION_VERSION_MASK = 0x7f;

export function createWeb3JsTransactionFactory(
  context: Pick<Context, 'serializer'>
): TransactionFactoryInterface {
  const create = (input: TransactionInput): Transaction => {
    const web3JsMessage = toWeb3JsMessageFromInput(input);
    const message = fromWeb3JsMessage(web3JsMessage);
    const web3JsTransaction = new Web3JsTransaction(
      web3JsMessage,
      input.signatures
    );
    return {
      message,
      serializedMessage: serializeMessage(message),
      signatures: web3JsTransaction.signatures,
    };
  };

  const serialize = (transaction: Transaction): SerializedTransaction =>
    getTransactionSerializer().serialize(transaction);

  const deserialize = (
    serializedTransaction: SerializedTransaction
  ): Transaction =>
    getTransactionSerializer().deserialize(serializedTransaction)[0];

  const serializeMessage = (
    message: TransactionMessage
  ): SerializedTransactionMessage =>
    getTransactionMessageSerializer().serialize(message);

  const deserializeMessage = (
    serializedMessage: SerializedTransactionMessage
  ): TransactionMessage =>
    getTransactionMessageSerializer().deserialize(serializedMessage)[0];

  const getTransactionSerializer = (): Serializer<Transaction> => {
    const s = context.serializer;
    return {
      ...mapSerializer(
        s.struct<Omit<Transaction, 'message'>>([
          ['signatures', s.array(s.bytes({ size: 64 }), { size: shortU16() })],
          ['serializedMessage', s.bytes()],
        ]),
        (value: Transaction): Omit<Transaction, 'message'> => value,
        (value: Omit<Transaction, 'message'>): Transaction => ({
          ...value,
          message: deserializeMessage(value.serializedMessage),
        })
      ),
      description: 'Transaction',
    };
  };

  const getTransactionMessageSerializer =
    (): Serializer<TransactionMessage> => ({
      description: 'TransactionMessage',
      fixedSize: null,
      maxSize: null,
      serialize: (value: TransactionMessage): Uint8Array => {
        const serializer = getTransactionMessageSerializerForVersion(
          value.version
        );
        return serializer.serialize(value);
      },
      deserialize: (
        bytes: Uint8Array,
        offset = 0
      ): [TransactionMessage, number] => {
        const [version] = getTransactionVersionSerializer().deserialize(
          bytes,
          offset
        );
        const serializer = getTransactionMessageSerializerForVersion(version);
        return serializer.deserialize(bytes, offset);
      },
    });

  const getTransactionMessageSerializerForVersion = (
    version: TransactionVersion
  ): Serializer<TransactionMessage> => {
    const s = context.serializer;
    return s.struct<TransactionMessage, TransactionMessage>([
      ['version', getTransactionVersionSerializer()],
      ['header', getTransactionMessageHeaderSerializer()],
      ['accounts', s.array(s.publicKey(), { size: shortU16() })],
      ['blockhash', s.string({ encoding: base58, size: 32 })],
      [
        'instructions',
        s.array(getCompiledInstructionSerializer(), { size: shortU16() }),
      ],
      [
        'addressLookupTables',
        s.array(getCompiledAddressLookupTableSerializer(), {
          size: version === 'legacy' ? 0 : shortU16(),
        }),
      ],
    ]);
  };

  const getTransactionVersionSerializer =
    (): Serializer<TransactionVersion> => ({
      description: 'TransactionVersion',
      fixedSize: null,
      maxSize: 1,
      serialize: (value: TransactionVersion): Uint8Array => {
        if (value === 'legacy') return new Uint8Array([]);
        return new Uint8Array([TRANSACTION_VERSION_FLAG | value]);
      },
      deserialize: (
        bytes: Uint8Array,
        offset = 0
      ): [TransactionVersion, number] => {
        const slice = bytes.slice(offset);
        if (slice.length === 0 || (slice[0] & TRANSACTION_VERSION_FLAG) === 0) {
          return ['legacy', offset];
        }
        const version = slice[0] & TRANSACTION_VERSION_MASK;
        if (version > 0) {
          throw new SdkError(`Unsupported transaction version: ${version}.`);
        }
        return [version as TransactionVersion, offset + 1];
      },
    });

  const getTransactionMessageHeaderSerializer =
    (): Serializer<TransactionMessageHeader> => {
      const s = context.serializer;
      return s.struct([
        ['numRequiredSignatures', s.u8()],
        ['numReadonlySignedAccounts', s.u8()],
        ['numReadonlyUnsignedAccounts', s.u8()],
      ]);
    };

  const getCompiledInstructionSerializer =
    (): Serializer<CompiledInstruction> => {
      const s = context.serializer;
      return s.struct([
        ['programIndex', s.u8()],
        ['accountIndexes', s.array(s.u8(), { size: shortU16() })],
        ['data', s.bytes({ size: shortU16() })],
      ]);
    };

  const getCompiledAddressLookupTableSerializer =
    (): Serializer<CompiledAddressLookupTable> => {
      const s = context.serializer;
      return s.struct([
        ['publicKey', s.publicKey()],
        ['writableIndexes', s.array(s.u8(), { size: shortU16() })],
        ['readonlyIndexes', s.array(s.u8(), { size: shortU16() })],
      ]);
    };

  return {
    create,
    serialize,
    deserialize,
    serializeMessage,
    deserializeMessage,
  };
}
