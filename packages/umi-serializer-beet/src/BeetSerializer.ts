import {
  ArrayLikeSerializerSize,
  ArraySerializerOptions,
  DataEnum,
  DataEnumToSerializerTuple,
  isSome,
  MapSerializerOptions,
  mergeBytes,
  none,
  Nullable,
  NumberSerializer,
  Option,
  publicKey,
  PublicKey,
  PublicKeyInput,
  ScalarEnum,
  Serializer,
  SerializerInterface,
  SetSerializerOptions,
  some,
  StructToSerializerTuple,
  TupleSerializerOptions,
  utf8,
  WrapInSerializer,
} from '@metaplex-foundation/umi-core';
import {
  BeetSerializerError,
  DeserializingEmptyBufferError,
  OperationNotSupportedError,
} from './errors';
import { i128, i16, i32, i64, i8, u128, u16, u32, u64, u8 } from './numbers';

export class BeetSerializer implements SerializerInterface {
  constructor(
    protected readonly options: {
      /** @defaultValue `true` */
      tolerateEmptyBuffers?: boolean;
    } = {}
  ) {}

  tuple<T extends any[], U extends T = T>(
    items: WrapInSerializer<[...T], [...U]>,
    options: TupleSerializerOptions = {}
  ): Serializer<T, U> {
    const itemDescriptions = items.map((item) => item.description).join(', ');
    return {
      description: options.description ?? `tuple(${itemDescriptions})`,
      fixedSize: sumSerializerSizes(items.map((item) => item.fixedSize)),
      maxSize: sumSerializerSizes(items.map((item) => item.maxSize)),
      serialize: (value: T) => {
        if (value.length !== items.length) {
          throw new BeetSerializerError(
            `Expected tuple to have ${items.length} items but got ${value.length}.`
          );
        }
        return mergeBytes(
          items.map((item, index) => item.serialize(value[index]))
        );
      },
      deserialize: (bytes: Uint8Array, offset = 0) => {
        const values = [] as any as U;
        items.forEach((serializer) => {
          const [newValue, newOffset] = serializer.deserialize(bytes, offset);
          values.push(newValue);
          offset = newOffset;
        });
        return [values, offset];
      },
    };
  }

  array<T, U extends T = T>(
    item: Serializer<T, U>,
    options: ArraySerializerOptions = {}
  ): Serializer<T[], U[]> {
    const size = options.size ?? u32();
    return {
      description:
        options.description ??
        `array(${item.description}; ${getSizeDescription(size)})`,
      fixedSize: getSizeFromChildren(size, [item.fixedSize]),
      maxSize: getSizeFromChildren(size, [item.maxSize]),
      serialize: (value: T[]) => {
        if (typeof size === 'number' && value.length !== size) {
          throw new BeetSerializerError(
            `Expected array to have ${size} items but got ${value.length}.`
          );
        }
        return mergeBytes([
          getSizePrefix(size, value.length),
          ...value.map((v) => item.serialize(v)),
        ]);
      },
      deserialize: (bytes: Uint8Array, offset = 0) => {
        if (typeof size === 'object' && bytes.slice(offset).length === 0) {
          return this.handleEmptyBuffer<U[]>('array', [], offset);
        }
        const [resolvedSize, newOffset] = getResolvedSize(
          size,
          [item.fixedSize],
          bytes,
          offset
        );
        offset = newOffset;
        const values: U[] = [];
        for (let i = 0; i < resolvedSize; i += 1) {
          const [value, newOffset] = item.deserialize(bytes, offset);
          values.push(value);
          offset = newOffset;
        }
        return [values, offset];
      },
    };
  }

  map<TK, TV, UK extends TK = TK, UV extends TV = TV>(
    key: Serializer<TK, UK>,
    value: Serializer<TV, UV>,
    options: MapSerializerOptions = {}
  ): Serializer<Map<TK, TV>, Map<UK, UV>> {
    const size = options.size ?? u32();
    return {
      description:
        options.description ??
        `map(${key.description}, ${value.description}; ${getSizeDescription(
          size
        )})`,
      fixedSize: getSizeFromChildren(size, [key.fixedSize, value.fixedSize]),
      maxSize: getSizeFromChildren(size, [key.maxSize, value.maxSize]),
      serialize: (map: Map<TK, TV>) => {
        if (typeof size === 'number' && map.size !== size) {
          throw new BeetSerializerError(
            `Expected map to have ${size} items but got ${map.size}.`
          );
        }
        const itemBytes = Array.from(map, ([k, v]) =>
          mergeBytes([key.serialize(k), value.serialize(v)])
        );
        return mergeBytes([getSizePrefix(size, map.size), ...itemBytes]);
      },
      deserialize: (bytes: Uint8Array, offset = 0) => {
        const map: Map<UK, UV> = new Map();
        if (typeof size === 'object' && bytes.length === 0) {
          return this.handleEmptyBuffer('map', map, offset);
        }
        const [resolvedSize, newOffset] = getResolvedSize(
          size,
          [key.fixedSize, value.fixedSize],
          bytes,
          offset
        );
        offset = newOffset;
        for (let i = 0; i < resolvedSize; i += 1) {
          const [deserializedKey, kOffset] = key.deserialize(bytes, offset);
          offset = kOffset;
          const [deserializedValue, vOffset] = value.deserialize(bytes, offset);
          offset = vOffset;
          map.set(deserializedKey, deserializedValue);
        }
        return [map, offset];
      },
    };
  }

  set<T, U extends T = T>(
    item: Serializer<T, U>,
    options: SetSerializerOptions = {}
  ): Serializer<Set<T>, Set<U>> {
    const size = options.size ?? u32();
    return {
      description:
        options.description ??
        `set(${item.description}; ${getSizeDescription(size)})`,
      fixedSize: getSizeFromChildren(size, [item.fixedSize]),
      maxSize: getSizeFromChildren(size, [item.maxSize]),
      serialize: (set: Set<T>) => {
        if (typeof size === 'number' && set.size !== size) {
          throw new BeetSerializerError(
            `Expected set to have ${size} items but got ${set.size}.`
          );
        }
        const itemBytes = Array.from(set, (value) => item.serialize(value));
        return mergeBytes([getSizePrefix(size, set.size), ...itemBytes]);
      },
      deserialize: (bytes: Uint8Array, offset = 0) => {
        const set: Set<U> = new Set();
        if (typeof size === 'object' && bytes.length === 0) {
          return this.handleEmptyBuffer('set', set, offset);
        }
        const [resolvedSize, newOffset] = getResolvedSize(
          size,
          [item.fixedSize],
          bytes,
          offset
        );
        offset = newOffset;
        for (let i = 0; i < resolvedSize; i += 1) {
          const [value, newOffset] = item.deserialize(bytes, offset);
          offset = newOffset;
          set.add(value);
        }
        return [set, offset];
      },
    };
  }

  option<T, U extends T = T>(
    itemSerializer: Serializer<T, U>,
    prefix?: NumberSerializer,
    description?: string
  ): Serializer<Option<T>, Option<U>> {
    const prefixSeralizer = prefix ?? u8();
    return {
      description: description ?? `option(${itemSerializer.description})`,
      fixedSize:
        itemSerializer.fixedSize === 0 ? prefixSeralizer.maxSize : null,
      maxSize: sumSerializerSizes([
        prefixSeralizer.maxSize,
        itemSerializer.maxSize,
      ]),
      serialize: (option: Option<T>) => {
        const prefixByte = prefixSeralizer.serialize(Number(isSome(option)));
        const itemBytes = isSome(option)
          ? itemSerializer.serialize(option.value)
          : new Uint8Array();
        return mergeBytes([prefixByte, itemBytes]);
      },
      deserialize: (bytes: Uint8Array, offset = 0) => {
        if (bytes.length === 0) {
          return this.handleEmptyBuffer<Option<U>>('option', none(), offset);
        }
        const [isSome, prefixOffset] = prefixSeralizer.deserialize(
          bytes,
          offset
        );
        offset = prefixOffset;
        if (isSome === 0) {
          return [none(), offset];
        }
        const [value, newOffset] = itemSerializer.deserialize(bytes, offset);
        offset = newOffset;
        return [some(value), offset];
      },
    };
  }

  fixedOption<T, U extends T = T>(
    itemSerializer: Serializer<T, U>,
    prefix?: NumberSerializer,
    description?: string
  ): Serializer<Option<T>, Option<U>> {
    const prefixSeralizer = prefix ?? u8();
    if (
      itemSerializer.fixedSize === null ||
      prefixSeralizer.fixedSize === null
    ) {
      throw new BeetSerializerError(
        'fixedOption can only be used with fixed size serializers'
      );
    }
    return {
      description: description ?? `fixedOption(${itemSerializer.description})`,
      fixedSize: prefixSeralizer.fixedSize + itemSerializer.fixedSize,
      maxSize: prefixSeralizer.fixedSize + itemSerializer.fixedSize,
      serialize: (option: Option<T>) => {
        const fixedSize = itemSerializer.fixedSize as number;
        const prefixByte = prefixSeralizer.serialize(Number(isSome(option)));
        const itemBytes = isSome(option)
          ? itemSerializer.serialize(option.value).slice(0, fixedSize)
          : new Uint8Array(fixedSize).fill(0);
        return mergeBytes([prefixByte, itemBytes]);
      },
      deserialize: (bytes: Uint8Array, offset = 0) => {
        if (bytes.length === 0) {
          return this.handleEmptyBuffer<Option<U>>(
            'fixedOption',
            none(),
            offset
          );
        }
        const [isSome] = prefixSeralizer.deserialize(bytes, offset);
        offset += prefixSeralizer.fixedSize as number;
        const newOffset = offset + (itemSerializer.fixedSize as number);
        if (isSome === 0) {
          return [none(), newOffset];
        }
        const [value] = itemSerializer.deserialize(bytes, offset);
        return [some(value), newOffset];
      },
    };
  }

  nullable<T, U extends T = T>(
    itemSerializer: Serializer<T, U>,
    prefix?: NumberSerializer,
    description?: string
  ): Serializer<Nullable<T>, Nullable<U>> {
    const prefixSeralizer = prefix ?? u8();
    return {
      description: description ?? `nullable(${itemSerializer.description})`,
      fixedSize:
        itemSerializer.fixedSize === 0 ? prefixSeralizer.maxSize : null,
      maxSize: sumSerializerSizes([
        prefixSeralizer.maxSize,
        itemSerializer.maxSize,
      ]),
      serialize: (option: Nullable<T>) => {
        const prefixByte = prefixSeralizer.serialize(Number(option !== null));
        const itemBytes =
          option !== null ? itemSerializer.serialize(option) : new Uint8Array();
        return mergeBytes([prefixByte, itemBytes]);
      },
      deserialize: (bytes: Uint8Array, offset = 0) => {
        if (bytes.length === 0) {
          return this.handleEmptyBuffer('nullable', null, offset);
        }
        const [isSome, prefixOffset] = prefixSeralizer.deserialize(
          bytes,
          offset
        );
        offset = prefixOffset;
        if (isSome === 0) {
          return [null, offset];
        }
        const [value, newOffset] = itemSerializer.deserialize(bytes, offset);
        offset = newOffset;
        return [value, offset];
      },
    };
  }

  fixedNullable<T, U extends T = T>(
    itemSerializer: Serializer<T, U>,
    prefix?: NumberSerializer,
    description?: string
  ): Serializer<Nullable<T>, Nullable<U>> {
    const prefixSeralizer = prefix ?? u8();
    if (
      itemSerializer.fixedSize === null ||
      prefixSeralizer.fixedSize === null
    ) {
      throw new BeetSerializerError(
        'fixedNullable can only be used with fixed size serializers'
      );
    }
    return {
      description:
        description ?? `fixedNullable(${itemSerializer.description})`,
      fixedSize: prefixSeralizer.fixedSize + itemSerializer.fixedSize,
      maxSize: prefixSeralizer.fixedSize + itemSerializer.fixedSize,
      serialize: (option: Nullable<T>) => {
        const fixedSize = itemSerializer.fixedSize as number;
        const prefixByte = prefixSeralizer.serialize(Number(option !== null));
        const itemBytes =
          option !== null
            ? itemSerializer.serialize(option).slice(0, fixedSize)
            : new Uint8Array(fixedSize).fill(0);
        return mergeBytes([prefixByte, itemBytes]);
      },
      deserialize: (bytes: Uint8Array, offset = 0) => {
        if (bytes.length === 0) {
          return this.handleEmptyBuffer('fixedNullable', null, offset);
        }
        const [isSome] = prefixSeralizer.deserialize(bytes, offset);
        offset += prefixSeralizer.fixedSize as number;
        const newOffset = offset + (itemSerializer.fixedSize as number);
        if (isSome === 0) {
          return [null, newOffset];
        }
        const [value] = itemSerializer.deserialize(bytes, offset);
        return [value, newOffset];
      },
    };
  }

  struct<T extends object, U extends T = T>(
    fields: StructToSerializerTuple<T, U>,
    description?: string
  ): Serializer<T, U> {
    const fieldDescriptions = fields
      .map(([name, serializer]) => `${String(name)}: ${serializer.description}`)
      .join(', ');
    return {
      description: description ?? `struct(${fieldDescriptions})`,
      fixedSize: sumSerializerSizes(fields.map(([, field]) => field.fixedSize)),
      maxSize: sumSerializerSizes(fields.map(([, field]) => field.maxSize)),
      serialize: (struct: T) => {
        const fieldBytes = fields.map(([key, serializer]) =>
          serializer.serialize(struct[key])
        );
        return mergeBytes(fieldBytes);
      },
      deserialize: (bytes: Uint8Array, offset = 0) => {
        const struct: Partial<U> = {};
        fields.forEach(([key, serializer]) => {
          const [value, newOffset] = serializer.deserialize(bytes, offset);
          offset = newOffset;
          struct[key] = value;
        });
        return [struct as U, offset];
      },
    };
  }

  enum<T>(
    constructor: ScalarEnum<T> & {},
    description?: string
  ): Serializer<T> {
    const enumValues = Object.values(constructor);
    const isNumericEnum = enumValues.some((v) => typeof v === 'number');
    const valueDescriptions = enumValues
      .filter((v) => typeof v === 'string')
      .join(', ');
    function getVariantKeyValue(value: T): [keyof ScalarEnum<T>, number] {
      if (typeof value === 'number') {
        return [enumValues[value], value];
      }
      const variantValue = constructor[value as keyof ScalarEnum<T>];
      if (typeof variantValue === 'number') {
        return [value as keyof ScalarEnum<T>, variantValue];
      }
      const indexOfValue = enumValues.indexOf(variantValue);
      if (indexOfValue >= 0) {
        return [variantValue as keyof ScalarEnum<T>, indexOfValue];
      }
      return [value as keyof ScalarEnum<T>, enumValues.indexOf(value)];
    }
    function checkVariantExists(variantKey: keyof ScalarEnum<T>): void {
      if (!enumValues.includes(variantKey)) {
        throw new BeetSerializerError(
          `Invalid enum variant. Got "${variantKey}", expected one of ` +
            `[${enumValues.join(', ')}]`
        );
      }
    }
    return {
      description: description ?? `enum(${valueDescriptions})`,
      fixedSize: 1,
      maxSize: 1,
      serialize: (value: T) => {
        const [variantKey, variantValue] = getVariantKeyValue(value);
        checkVariantExists(variantKey);
        return u8().serialize(variantValue);
      },
      deserialize: (bytes: Uint8Array, offset = 0) => {
        if (bytes.length === 0) {
          throw new DeserializingEmptyBufferError('enum');
        }
        const [value, newOffset] = u8().deserialize(bytes, offset);
        offset = newOffset;
        const [variantKey, variantValue] = getVariantKeyValue(value as T);
        checkVariantExists(variantKey);
        return [(isNumericEnum ? variantValue : variantKey) as T, offset];
      },
    };
  }

  dataEnum<T extends DataEnum, U extends T = T>(
    variants: DataEnumToSerializerTuple<T, U>,
    prefix?: NumberSerializer,
    description?: string
  ): Serializer<T, U> {
    const prefixSeralizer = prefix ?? u8();
    const fieldDescriptions = variants
      .map(
        ([name, serializer]) =>
          `${String(name)}${serializer ? `: ${serializer.description}` : ''}`
      )
      .join(', ');
    const allVariantHaveTheSameFixedSize = variants.every(
      (one, i, all) => one[1].fixedSize === all[0][1].fixedSize
    );
    const fixedVariantSize = allVariantHaveTheSameFixedSize
      ? variants[0][1].fixedSize
      : null;
    const maxVariantSize = maxSerializerSizes(
      variants.map(([, field]) => field.maxSize)
    );
    return {
      description: description ?? `dataEnum(${fieldDescriptions})`,
      fixedSize:
        variants.length === 0
          ? prefixSeralizer.fixedSize
          : sumSerializerSizes([prefixSeralizer.fixedSize, fixedVariantSize]),
      maxSize:
        variants.length === 0
          ? prefixSeralizer.maxSize
          : sumSerializerSizes([prefixSeralizer.maxSize, maxVariantSize]),
      serialize: (variant: T) => {
        const discriminator = variants.findIndex(
          ([key]) => variant.__kind === key
        );
        if (discriminator < 0) {
          throw new BeetSerializerError(
            `Invalid data enum variant. Got "${variant.__kind}", expected one of ` +
              `[${variants.map(([key]) => key).join(', ')}]`
          );
        }
        const variantPrefix = prefixSeralizer.serialize(discriminator);
        const variantSerializer = variants[discriminator][1];
        const variantBytes = variantSerializer.serialize(variant as any);
        return mergeBytes([variantPrefix, variantBytes]);
      },
      deserialize: (bytes: Uint8Array, offset = 0) => {
        if (bytes.length === 0) {
          throw new DeserializingEmptyBufferError('dataEnum');
        }
        const [discriminator, dOffset] = prefixSeralizer.deserialize(
          bytes,
          offset
        );
        offset = dOffset;
        const variantField = variants[Number(discriminator)] ?? null;
        if (!variantField) {
          throw new BeetSerializerError(
            `Data enum index "${discriminator}" is out of range. ` +
              `Index should be between 0 and ${variants.length - 1}.`
          );
        }
        const [variant, vOffset] = variantField[1].deserialize(bytes, offset);
        offset = vOffset;
        return [{ __kind: variantField[0], ...(variant ?? {}) } as U, offset];
      },
    };
  }

  fixed<T, U extends T = T>(
    bytes: number,
    child: Serializer<T, U>,
    description?: string
  ): Serializer<T, U> {
    return fixed(bytes, child, description);
  }

  string(
    prefix?: NumberSerializer,
    content?: Serializer<string>,
    description?: string
  ): Serializer<string> {
    const prefixSerializer = prefix ?? u32();
    const contentSerializer = content ?? utf8;
    return {
      description:
        description ??
        `string(${prefixSerializer.description}, ${contentSerializer.description})`,
      fixedSize: null,
      maxSize: null,
      serialize: (value: string) => {
        const contentBytes = contentSerializer.serialize(value);
        const lengthBytes = prefixSerializer.serialize(contentBytes.length);
        return mergeBytes([lengthBytes, contentBytes]);
      },
      deserialize: (buffer: Uint8Array, offset = 0) => {
        if (buffer.length === 0) {
          throw new DeserializingEmptyBufferError('string');
        }
        const [length, lengthOffset] = prefixSerializer.deserialize(
          buffer,
          offset
        );
        offset = lengthOffset;
        const contentBuffer = buffer.slice(offset, offset + Number(length));
        const [value, contentOffset] =
          contentSerializer.deserialize(contentBuffer);
        offset += contentOffset;
        return [value, offset];
      },
    };
  }

  fixedString(
    bytes: number,
    content?: Serializer<string>,
    description?: string
  ): Serializer<string> {
    const contentSerializer = content ?? utf8;
    return fixed(
      bytes,
      contentSerializer,
      description ?? `fixedString(${bytes}, ${contentSerializer.description})`
    );
  }

  variableString(
    content?: Serializer<string>,
    description?: string
  ): Serializer<string> {
    const contentSerializer = content ?? utf8;
    return {
      ...contentSerializer,
      description:
        description ?? `variableString(${contentSerializer.description})`,
    };
  }

  bool(size?: NumberSerializer, description?: string): Serializer<boolean> {
    const serializer = size ?? u8();
    if (serializer.fixedSize === null) {
      throw new BeetSerializerError('Serializer [bool] requires a fixed size.');
    }
    return {
      description: description ?? `bool(${serializer.description})`,
      fixedSize: serializer.fixedSize,
      maxSize: serializer.fixedSize,
      serialize: (value: boolean) => serializer.serialize(value ? 1 : 0),
      deserialize: (bytes: Uint8Array, offset = 0) => {
        if (bytes.length === 0) {
          throw new DeserializingEmptyBufferError('bool');
        }
        const [value, vOffset] = serializer.deserialize(bytes, offset);
        return [value === 1, vOffset];
      },
    };
  }

  get unit(): Serializer<void> {
    return {
      description: 'unit',
      fixedSize: 0,
      maxSize: 0,
      serialize: () => new Uint8Array(),
      deserialize: (_bytes: Uint8Array, offset = 0) => [undefined, offset],
    };
  }

  get u8(): Serializer<number> {
    return u8();
  }

  get u16(): Serializer<number> {
    return u16();
  }

  get u32(): Serializer<number> {
    return u32();
  }

  get u64(): Serializer<number | bigint, bigint> {
    return u64();
  }

  get u128(): Serializer<number | bigint, bigint> {
    return u128();
  }

  get i8(): Serializer<number> {
    return i8();
  }

  get i16(): Serializer<number> {
    return i16();
  }

  get i32(): Serializer<number> {
    return i32();
  }

  get i64(): Serializer<number | bigint, bigint> {
    return i64();
  }

  get i128(): Serializer<number | bigint, bigint> {
    return i128();
  }

  get f32(): Serializer<number> {
    return {
      description: 'f32 [not supported]',
      fixedSize: 4,
      maxSize: 4,
      serialize: () => {
        throw new OperationNotSupportedError('f32');
      },
      deserialize: () => {
        throw new OperationNotSupportedError('f32');
      },
    };
  }

  get f64(): Serializer<number> {
    return {
      description: 'f64 [not supported]',
      fixedSize: 8,
      maxSize: 8,
      serialize: () => {
        throw new OperationNotSupportedError('f64');
      },
      deserialize: () => {
        throw new OperationNotSupportedError('f64');
      },
    };
  }

  get bytes(): Serializer<Uint8Array> {
    return {
      description: 'bytes',
      fixedSize: null,
      maxSize: null,
      serialize: (value: Uint8Array) => new Uint8Array(value),
      deserialize: (bytes: Uint8Array, offset = 0) => [
        new Uint8Array(bytes),
        offset + bytes.length,
      ],
    };
  }

  get publicKey(): Serializer<PublicKeyInput, PublicKey> {
    return {
      description: 'publicKey',
      fixedSize: 32,
      maxSize: 32,
      serialize: (value: PublicKeyInput) => publicKey(value).bytes,
      deserialize: (bytes: Uint8Array, offset = 0) => {
        if (bytes.length === 0) {
          throw new DeserializingEmptyBufferError('publicKey');
        }
        const pubkeyBytes = bytes.slice(offset, offset + 32);
        if (pubkeyBytes.length < 32) {
          throw new BeetSerializerError(
            `Serializer [publicKey] expected 32 bytes, got ${pubkeyBytes.length}.`
          );
        }
        return [publicKey(pubkeyBytes), offset + 32];
      },
    };
  }

  protected handleEmptyBuffer<T>(
    serializer: string,
    defaultValue: T,
    offset: number
  ): [T, number] {
    if (!(this.options.tolerateEmptyBuffers ?? true)) {
      throw new DeserializingEmptyBufferError(serializer);
    }
    return [defaultValue, offset];
  }
}

function fixed<T, U extends T = T>(
  bytes: number,
  child: Serializer<T, U>,
  description?: string
): Serializer<T, U> {
  return {
    description: description ?? `fixed(${bytes}, ${child.description})`,
    fixedSize: bytes,
    maxSize: bytes,
    serialize: (value: T) => {
      const buffer = new Uint8Array(bytes).fill(0);
      buffer.set(child.serialize(value).slice(0, bytes));
      return buffer;
    },
    deserialize: (buffer: Uint8Array, offset = 0) => {
      buffer = buffer.slice(offset, offset + bytes);
      if (buffer.length < bytes) {
        throw new BeetSerializerError(
          `Serializer [fixed] expected ${bytes} bytes, got ${buffer.length}.`
        );
      }
      const [value] = child.deserialize(buffer, offset);
      return [value, offset + bytes];
    },
  };
}

function sumSerializerSizes(sizes: (number | null)[]): number | null {
  return sizes.reduce(
    (all, size) => (all === null || size === null ? null : all + size),
    0 as number | null
  );
}

function maxSerializerSizes(sizes: (number | null)[]): number | null {
  return sizes.reduce(
    (all, size) => (all === null || size === null ? null : Math.max(all, size)),
    0 as number | null
  );
}

function getSizeDescription(size: ArrayLikeSerializerSize): string {
  return typeof size === 'object' ? size.description : `${size}`;
}

function getSizeFromChildren(
  size: ArrayLikeSerializerSize,
  childrenSizes: (number | null)[]
): number | null {
  if (typeof size !== 'number') return null;
  if (size === 0) return 0;
  const childrenSize = sumSerializerSizes(childrenSizes);
  return childrenSize === null ? null : childrenSize * size;
}

function getSizePrefix(
  size: ArrayLikeSerializerSize,
  realSize: number
): Uint8Array {
  return typeof size === 'object' ? size.serialize(realSize) : new Uint8Array();
}

function getResolvedSize(
  size: ArrayLikeSerializerSize,
  childrenSizes: (number | null)[],
  bytes: Uint8Array,
  offset: number
): [number | bigint, number] {
  if (typeof size === 'number') {
    return [size, offset];
  }

  if (typeof size === 'object') {
    return size.deserialize(bytes, offset);
  }

  if (size === 'remainder') {
    const childrenSize = sumSerializerSizes(childrenSizes);
    if (childrenSize === null) {
      throw new BeetSerializerError(
        'Serializers of "remainder" size must have fixed-size items.'
      );
    }
    const remainder = bytes.slice(offset).length;
    if (remainder % childrenSize !== 0) {
      throw new BeetSerializerError(
        `Serializers of "remainder" size must have a remainder that is a multiple of its item size. ` +
          `Got ${remainder} bytes remaining and ${childrenSize} bytes per item.`
      );
    }
    return [remainder % childrenSize, offset];
  }

  throw new BeetSerializerError(`Unknown size type: ${JSON.stringify(size)}.`);
}
