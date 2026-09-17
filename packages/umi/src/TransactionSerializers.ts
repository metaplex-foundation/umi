/* eslint-disable no-bitwise */
import {
  array,
  base58,
  bytes,
  mapSerializer,
  publicKey,
  Serializer,
  shortU16,
  string,
  struct,
  u8,
} from '@metaplex-foundation/umi-serializers';
import { SdkError } from './errors';
import type {
  CompiledAddressLookupTable,
  CompiledInstruction,
  Transaction,
  TransactionMessage,
  TransactionVersion,
} from './Transaction';
import {
  getTransactionMessageHeaderSerializer,
  getTransactionV1MessageSerializer,
  getTransactionV1Serializer,
  TRANSACTION_V1_PREFIX,
} from './TransactionV1';

const TRANSACTION_VERSION_FLAG = 0x80;
const TRANSACTION_VERSION_MASK = 0x7f;

/**
 * Serializes and deserializes transactions of any version.
 * Legacy and V0 transactions are a short-vec of signatures followed by
 * the message, V1 transactions are the message followed by its signatures.
 * The version is read from the first byte when deserializing.
 * @category Transactions
 */
export const getTransactionSerializer = (): Serializer<Transaction> => {
  const legacyOrV0 = getLegacyOrV0TransactionSerializer();
  const v1 = getTransactionV1Serializer();
  return {
    description: 'Transaction',
    fixedSize: null,
    maxSize: null,
    serialize: (value: Transaction): Uint8Array =>
      (value.message.version === 1 ? v1 : legacyOrV0).serialize(value),
    deserialize: (buffer: Uint8Array, offset = 0): [Transaction, number] =>
      (buffer[offset] === TRANSACTION_V1_PREFIX ? v1 : legacyOrV0).deserialize(
        buffer,
        offset
      ),
  };
};

/**
 * Serializes and deserializes transaction messages of any version.
 * The version is read from the first byte when deserializing.
 * @category Transactions
 */
export const getTransactionMessageSerializer =
  (): Serializer<TransactionMessage> => ({
    description: 'TransactionMessage',
    fixedSize: null,
    maxSize: null,
    serialize: (value: TransactionMessage): Uint8Array =>
      getTransactionMessageSerializerForVersion(value.version).serialize(value),
    deserialize: (
      buffer: Uint8Array,
      offset = 0
    ): [TransactionMessage, number] => {
      const [version] = getTransactionVersionSerializer().deserialize(
        buffer,
        offset
      );
      return getTransactionMessageSerializerForVersion(version).deserialize(
        buffer,
        offset
      );
    },
  });

/** Legacy and V0 transactions: a short-vec of signatures then the message. */
const getLegacyOrV0TransactionSerializer = (): Serializer<Transaction> =>
  mapSerializer(
    struct<Omit<Transaction, 'message'>>([
      ['signatures', array(bytes({ size: 64 }), { size: shortU16() })],
      ['serializedMessage', bytes()],
    ]),
    (value: Transaction): Omit<Transaction, 'message'> => value,
    (value: Omit<Transaction, 'message'>): Transaction => ({
      ...value,
      message: getTransactionMessageSerializer().deserialize(
        value.serializedMessage
      )[0],
    })
  );

const getTransactionMessageSerializerForVersion = (
  version: TransactionVersion
): Serializer<TransactionMessage> =>
  version === 1
    ? getTransactionV1MessageSerializer()
    : struct<TransactionMessage, TransactionMessage>([
        ['version', getTransactionVersionSerializer()],
        ['header', getTransactionMessageHeaderSerializer()],
        ['accounts', array(publicKey(), { size: shortU16() })],
        ['blockhash', string({ encoding: base58, size: 32 })],
        [
          'instructions',
          array(getCompiledInstructionSerializer(), { size: shortU16() }),
        ],
        [
          'addressLookupTables',
          array(getCompiledAddressLookupTableSerializer(), {
            size: version === 'legacy' ? 0 : shortU16(),
          }),
        ],
      ]);

const getTransactionVersionSerializer = (): Serializer<TransactionVersion> => ({
  description: 'TransactionVersion',
  fixedSize: null,
  maxSize: 1,
  serialize: (value: TransactionVersion): Uint8Array => {
    if (value === 'legacy') return new Uint8Array([]);
    return new Uint8Array([TRANSACTION_VERSION_FLAG | value]);
  },
  deserialize: (
    buffer: Uint8Array,
    offset = 0
  ): [TransactionVersion, number] => {
    const slice = buffer.slice(offset);
    if (slice.length === 0 || (slice[0] & TRANSACTION_VERSION_FLAG) === 0) {
      return ['legacy', offset];
    }
    const version = slice[0] & TRANSACTION_VERSION_MASK;
    if (version > 1) {
      throw new SdkError(`Unsupported transaction version: ${version}.`);
    }
    return [version as TransactionVersion, offset + 1];
  },
});

const getCompiledInstructionSerializer = (): Serializer<CompiledInstruction> =>
  struct([
    ['programIndex', u8()],
    ['accountIndexes', array(u8(), { size: shortU16() })],
    ['data', bytes({ size: shortU16() })],
  ]);

const getCompiledAddressLookupTableSerializer =
  (): Serializer<CompiledAddressLookupTable> =>
    struct([
      ['publicKey', publicKey()],
      ['writableIndexes', array(u8(), { size: shortU16() })],
      ['readonlyIndexes', array(u8(), { size: shortU16() })],
    ]);
