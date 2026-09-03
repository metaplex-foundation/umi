/* eslint-disable no-bitwise */
import {
  CompiledAddressLookupTable,
  CompiledInstruction,
  lamports,
  SdkError,
  SerializedTransaction,
  SerializedTransactionMessage,
  SolAmount,
  Transaction,
  TransactionConfig,
  TransactionFactoryInterface,
  TransactionInput,
  TransactionMessage,
  TransactionMessageHeader,
  TransactionVersion,
} from '@metaplex-foundation/umi';
import {
  array,
  base58,
  bytes,
  mapSerializer,
  mergeBytes,
  publicKey,
  Serializer,
  shortU16,
  string,
  struct,
  u16,
  u32,
  u64,
  u8,
} from '@metaplex-foundation/umi/serializers';
import { compileTransactionMessage } from '@metaplex-foundation/umi-web3js-adapters';

const TRANSACTION_VERSION_FLAG = 0x80;
const TRANSACTION_VERSION_MASK = 0x7f;
const TRANSACTION_V1_PREFIX = TRANSACTION_VERSION_FLAG | 1;
const V1_NUM_REQUIRED_SIGNATURES_OFFSET = 1;
const SIGNATURE_SIZE = 64;

type ConfigKey = keyof TransactionConfig;
type ConfigValue<K extends ConfigKey> = NonNullable<TransactionConfig[K]>;

const CONFIG_PRIORITY_FEE_BITS = 0b00011;
const CONFIG_FIELDS: {
  [K in ConfigKey]: { bits: number; serializer: Serializer<ConfigValue<K>> };
} = {
  priorityFee: {
    bits: CONFIG_PRIORITY_FEE_BITS,
    serializer: mapSerializer(
      u64(),
      (fee: SolAmount) => fee.basisPoints,
      lamports
    ),
  },
  computeUnitLimit: { bits: 0b00100, serializer: u32() },
  loadedAccountsDataSizeLimit: { bits: 0b01000, serializer: u32() },
  heapSize: { bits: 0b10000, serializer: u32() },
};
/**
 * The config fields of V1 messages in mask-bit order, which is also the
 * order of their values on the wire, see SIMD-0385.
 */
const CONFIG_KEYS: ConfigKey[] = [
  'priorityFee',
  'computeUnitLimit',
  'loadedAccountsDataSizeLimit',
  'heapSize',
];
const CONFIG_KNOWN_BITS = CONFIG_KEYS.reduce(
  (bits, key) => bits | CONFIG_FIELDS[key].bits,
  0
);

function serializeConfigField<K extends ConfigKey>(
  key: K,
  value: ConfigValue<K>
): Uint8Array {
  return CONFIG_FIELDS[key].serializer.serialize(value);
}

function deserializeConfigField<K extends ConfigKey>(
  key: K,
  buffer: Uint8Array,
  offset: number
): [ConfigValue<K>, number] {
  return CONFIG_FIELDS[key].serializer.deserialize(buffer, offset);
}

export function createWeb3JsTransactionFactory(): TransactionFactoryInterface {
  const create = (input: TransactionInput): Transaction => {
    const message = compileTransactionMessage(input);
    const { numRequiredSignatures } = message.header;
    const signatures =
      input.signatures ??
      Array.from(
        { length: numRequiredSignatures },
        () => new Uint8Array(SIGNATURE_SIZE)
      );
    if (signatures.length !== numRequiredSignatures) {
      throw new SdkError(
        `Expected ${numRequiredSignatures} signatures but got ${signatures.length}.`
      );
    }
    return {
      message,
      serializedMessage: serializeMessage(message),
      signatures,
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
    const legacyOrV0 = getLegacyOrV0TransactionSerializer();
    const v1 = getV1TransactionSerializer();
    return {
      description: 'Transaction',
      fixedSize: null,
      maxSize: null,
      serialize: (value: Transaction): Uint8Array => {
        switch (value.message.version) {
          case 'legacy':
          case 0:
            return legacyOrV0.serialize(value);
          case 1:
            return v1.serialize(value);
          default: {
            const never: never = value.message.version;
            throw new SdkError(`Unsupported transaction version: ${never}.`);
          }
        }
      },
      deserialize: (buffer: Uint8Array, offset = 0): [Transaction, number] =>
        // Like @solana/web3.js, only an envelope starting with the V1 prefix
        // is V1; a legacy or V0 envelope starts with its shortU16 signature
        // count, which only reads as that prefix for 129+ signatures.
        (buffer[offset] === TRANSACTION_V1_PREFIX
          ? v1
          : legacyOrV0
        ).deserialize(buffer, offset),
    };
  };

  const getLegacyOrV0TransactionSerializer = (): Serializer<Transaction> =>
    mapSerializer(
      struct<Omit<Transaction, 'message'>>([
        [
          'signatures',
          array(bytes({ size: SIGNATURE_SIZE }), { size: shortU16() }),
        ],
        ['serializedMessage', bytes()],
      ]),
      (value: Transaction): Omit<Transaction, 'message'> => value,
      (value: Omit<Transaction, 'message'>): Transaction => ({
        ...value,
        message: deserializeMessage(value.serializedMessage),
      })
    );

  const getV1TransactionSerializer = (): Serializer<Transaction> => ({
    description: 'TransactionV1',
    fixedSize: null,
    maxSize: null,
    serialize: (value: Transaction): Uint8Array => {
      if (value.serializedMessage[0] !== TRANSACTION_V1_PREFIX) {
        throw new SdkError(
          'The serialized message of a V1 transaction must start with the V1 prefix.'
        );
      }
      const numRequiredSignatures =
        value.serializedMessage[V1_NUM_REQUIRED_SIGNATURES_OFFSET];
      if (value.signatures.length !== numRequiredSignatures) {
        throw new SdkError(
          `Expected ${numRequiredSignatures} signatures but got ${value.signatures.length}.`
        );
      }
      return mergeBytes([
        value.serializedMessage,
        ...value.signatures.map((signature) =>
          bytes({ size: SIGNATURE_SIZE }).serialize(signature)
        ),
      ]);
    },
    deserialize: (buffer: Uint8Array, offset = 0): [Transaction, number] => {
      const [message, messageEnd] =
        getV1TransactionMessageSerializer().deserialize(buffer, offset);
      const [signatures, end] = array(bytes({ size: SIGNATURE_SIZE }), {
        size: message.header.numRequiredSignatures,
      }).deserialize(buffer, messageEnd);
      if (end !== buffer.length) {
        throw new SdkError(
          `Unexpected ${
            buffer.length - end
          } trailing bytes after the signatures of the V1 transaction.`
        );
      }
      return [
        {
          message,
          serializedMessage: buffer.slice(offset, messageEnd),
          signatures,
        },
        end,
      ];
    },
  });

  const getTransactionMessageSerializer =
    (): Serializer<TransactionMessage> => ({
      description: 'TransactionMessage',
      fixedSize: null,
      maxSize: null,
      serialize: (value: TransactionMessage): Uint8Array =>
        getTransactionMessageSerializerForVersion(value.version).serialize(
          value
        ),
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

  const getTransactionMessageSerializerForVersion = (
    version: TransactionVersion
  ): Serializer<TransactionMessage> => {
    switch (version) {
      case 'legacy':
      case 0:
        return getLegacyOrV0TransactionMessageSerializer(version);
      case 1:
        return getV1TransactionMessageSerializer();
      default: {
        const never: never = version;
        throw new SdkError(`Unsupported transaction version: ${never}.`);
      }
    }
  };

  const getLegacyOrV0TransactionMessageSerializer = (
    version: 'legacy' | 0
  ): Serializer<TransactionMessage> =>
    mapSerializer(
      struct<TransactionMessage, TransactionMessage>([
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
      ]),
      (value: TransactionMessage): TransactionMessage => {
        if (value.transactionConfig !== undefined) {
          throw new SdkError(
            'Transaction configs are only supported by V1 transactions.'
          );
        }
        return value;
      }
    );

  /** The wire format of V1 messages as defined by SIMD-0385. */
  const getV1TransactionMessageSerializer =
    (): Serializer<TransactionMessage> => {
      const versionSerializer = getTransactionVersionSerializer();
      const headerSerializer = getTransactionMessageHeaderSerializer();
      const blockhashSerializer = string({ encoding: base58, size: 32 });
      const publicKeySerializer = publicKey();
      return {
        description: 'TransactionMessageV1',
        fixedSize: null,
        maxSize: null,
        serialize: (value: TransactionMessage): Uint8Array => {
          if (value.addressLookupTables.length > 0) {
            throw new SdkError(
              'Address lookup tables are not supported by V1 transactions.'
            );
          }
          const config = value.transactionConfig ?? {};
          const configFields = CONFIG_KEYS.flatMap((key) => {
            const fieldValue = config[key];
            return fieldValue === undefined
              ? []
              : [
                  {
                    bits: CONFIG_FIELDS[key].bits,
                    bytes: serializeConfigField(key, fieldValue),
                  },
                ];
          });
          return mergeBytes([
            versionSerializer.serialize(1),
            headerSerializer.serialize(value.header),
            u32().serialize(
              configFields.reduce((mask, field) => mask | field.bits, 0)
            ),
            blockhashSerializer.serialize(value.blockhash),
            u8().serialize(value.instructions.length),
            u8().serialize(value.accounts.length),
            ...value.accounts.map((account) =>
              publicKeySerializer.serialize(account)
            ),
            ...configFields.map((field) => field.bytes),
            ...value.instructions.map((instruction) =>
              mergeBytes([
                u8().serialize(instruction.programIndex),
                u8().serialize(instruction.accountIndexes.length),
                u16().serialize(instruction.data.length),
              ])
            ),
            ...value.instructions.map((instruction) =>
              mergeBytes([
                array(u8(), {
                  size: instruction.accountIndexes.length,
                }).serialize(instruction.accountIndexes),
                instruction.data,
              ])
            ),
          ]);
        },
        deserialize: (
          buffer: Uint8Array,
          offset = 0
        ): [TransactionMessage, number] => {
          let cursor = offset;
          const read = <From, To extends From>(
            serializer: Serializer<From, To>
          ): To => {
            const [value, next] = serializer.deserialize(buffer, cursor);
            cursor = next;
            return value;
          };

          const version = read(versionSerializer);
          if (version !== 1) {
            throw new SdkError(
              `Expected a V1 message but got a version ${version} one.`
            );
          }
          const header = read(headerSerializer);
          const configMask = read(u32());
          if ((configMask & ~CONFIG_KNOWN_BITS) !== 0) {
            throw new SdkError(
              'Unexpected bits set in the transaction config mask.'
            );
          }
          const priorityFeeBits = configMask & CONFIG_PRIORITY_FEE_BITS;
          if (
            priorityFeeBits !== 0 &&
            priorityFeeBits !== CONFIG_PRIORITY_FEE_BITS
          ) {
            throw new SdkError(
              'Expected both or neither of the priority fee bits to be set in the transaction config mask.'
            );
          }
          const blockhash = read(blockhashSerializer);
          const numInstructions = read(u8());
          const numAccounts = read(u8());
          const accounts = Array.from({ length: numAccounts }, () =>
            read(publicKeySerializer)
          );

          const transactionConfig: TransactionConfig = {};
          const readConfigField = <K extends ConfigKey>(key: K): void => {
            const [fieldValue, next] = deserializeConfigField(
              key,
              buffer,
              cursor
            );
            transactionConfig[key] = fieldValue;
            cursor = next;
          };
          CONFIG_KEYS.filter(
            (key) => (configMask & CONFIG_FIELDS[key].bits) !== 0
          ).forEach(readConfigField);

          const instructionHeaders = Array.from(
            { length: numInstructions },
            () => ({
              programIndex: read(u8()),
              numAccountIndexes: read(u8()),
              dataLength: read(u16()),
            })
          );
          const instructions = instructionHeaders.map(
            ({ programIndex, numAccountIndexes, dataLength }) => ({
              programIndex,
              accountIndexes: Array.from(
                read(bytes({ size: numAccountIndexes }))
              ),
              data: read(bytes({ size: dataLength })),
            })
          );

          return [
            {
              version: 1,
              header,
              accounts,
              blockhash,
              instructions,
              addressLookupTables: [],
              transactionConfig,
            },
            cursor,
          ];
        },
      };
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

  const getTransactionMessageHeaderSerializer =
    (): Serializer<TransactionMessageHeader> =>
      struct([
        ['numRequiredSignatures', u8()],
        ['numReadonlySignedAccounts', u8()],
        ['numReadonlyUnsignedAccounts', u8()],
      ]);

  const getCompiledInstructionSerializer =
    (): Serializer<CompiledInstruction> =>
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

  return {
    create,
    serialize,
    deserialize,
    serializeMessage,
    deserializeMessage,
  };
}
