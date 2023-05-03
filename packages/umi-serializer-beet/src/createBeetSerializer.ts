import {
  ArrayLikeSerializerSize,
  ArraySerializerOptions,
  BoolSerializerOptions,
  BytesSerializerOptions,
  DataEnum,
  DataEnumSerializerOptions,
  DataEnumToSerializerTuple,
  EnumSerializerOptions,
  fixSerializer,
  isSome,
  MapSerializerOptions,
  mergeBytes,
  none,
  Nullable,
  NullableSerializerOptions,
  Option,
  OptionSerializerOptions,
  publicKey,
  PublicKey,
  PublicKeyInput,
  PublicKeySerializerOptions,
  ScalarEnum,
  Serializer,
  SerializerInterface,
  SetSerializerOptions,
  some,
  StringSerializerOptions,
  StructSerializerOptions,
  StructToSerializerTuple,
  TupleSerializerOptions,
  UnitSerializerOptions,
  utf8,
  WrapInSerializer,
} from '@metaplex-foundation/umi';
import {
  BeetSerializerError,
  DeserializingEmptyBufferError,
  NotEnoughBytesError,
} from './errors';
import {
  i128,
  i16,
  i32,
  i64,
  i8,
  u128,
  u16,
  u32,
  u64,
  u8,
  f32,
  f64,
} from './numbers';

export type BeetSerializerOptions = {
  /** @defaultValue `true` */
  tolerateEmptyBuffers?: boolean;
};

export function createBeetSerializer(
  options: BeetSerializerOptions = {}
): SerializerInterface {
  const tuple = <T extends any[], U extends T = T>(
    items: WrapInSerializer<[...T], [...U]>,
    options: TupleSerializerOptions = {}
  ): Serializer<T, U> => {
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
  };

  const array = <T, U extends T = T>(
    item: Serializer<T, U>,
    options: ArraySerializerOptions = {}
  ): Serializer<T[], U[]> => {
    const size = options.size ?? u32();
    if (size === 'remainder' && item.fixedSize === null) {
      throw new BeetSerializerError(
        'Serializers of "remainder" size must have fixed-size items.'
      );
    }
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
          return handleEmptyBuffer<U[]>('array', [], offset);
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
  };

  const map = <TK, TV, UK extends TK = TK, UV extends TV = TV>(
    key: Serializer<TK, UK>,
    value: Serializer<TV, UV>,
    options: MapSerializerOptions = {}
  ): Serializer<Map<TK, TV>, Map<UK, UV>> => {
    const size = options.size ?? u32();
    if (
      size === 'remainder' &&
      (key.fixedSize === null || value.fixedSize === null)
    ) {
      throw new BeetSerializerError(
        'Serializers of "remainder" size must have fixed-size items.'
      );
    }
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
        if (typeof size === 'object' && bytes.slice(offset).length === 0) {
          return handleEmptyBuffer('map', map, offset);
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
  };

  const set = <T, U extends T = T>(
    item: Serializer<T, U>,
    options: SetSerializerOptions = {}
  ): Serializer<Set<T>, Set<U>> => {
    const size = options.size ?? u32();
    if (size === 'remainder' && item.fixedSize === null) {
      throw new BeetSerializerError(
        'Serializers of "remainder" size must have fixed-size items.'
      );
    }
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
        if (typeof size === 'object' && bytes.slice(offset).length === 0) {
          return handleEmptyBuffer('set', set, offset);
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
  };

  const option = <T, U extends T = T>(
    item: Serializer<T, U>,
    options: OptionSerializerOptions = {}
  ): Serializer<Option<T>, Option<U>> => {
    const prefix = options.prefix ?? u8();
    const fixed = options.fixed ?? false;
    let descriptionSuffix = `; ${getSizeDescription(prefix)}`;
    let fixedSize = item.fixedSize === 0 ? prefix.fixedSize : null;
    if (fixed) {
      if (item.fixedSize === null || prefix.fixedSize === null) {
        throw new BeetSerializerError(
          'Fixed options can only be used with fixed-size serializers'
        );
      }
      descriptionSuffix += '; fixed';
      fixedSize = prefix.fixedSize + item.fixedSize;
    }
    return {
      description:
        options.description ??
        `option(${item.description + descriptionSuffix})`,
      fixedSize,
      maxSize: sumSerializerSizes([prefix.maxSize, item.maxSize]),
      serialize: (option: Option<T>) => {
        const prefixByte = prefix.serialize(Number(isSome(option)));
        if (fixed) {
          const itemFixedSize = item.fixedSize as number;
          const itemBytes = isSome(option)
            ? item.serialize(option.value).slice(0, itemFixedSize)
            : new Uint8Array(itemFixedSize).fill(0);
          return mergeBytes([prefixByte, itemBytes]);
        }
        const itemBytes = isSome(option)
          ? item.serialize(option.value)
          : new Uint8Array();
        return mergeBytes([prefixByte, itemBytes]);
      },
      deserialize: (bytes: Uint8Array, offset = 0) => {
        if (bytes.slice(offset).length === 0) {
          return handleEmptyBuffer<Option<U>>('option', none(), offset);
        }
        const fixedOffset =
          offset + (prefix.fixedSize ?? 0) + (item.fixedSize ?? 0);
        const [isSome, prefixOffset] = prefix.deserialize(bytes, offset);
        offset = prefixOffset;
        if (isSome === 0) {
          return [none(), fixed ? fixedOffset : offset];
        }
        const [value, newOffset] = item.deserialize(bytes, offset);
        offset = newOffset;
        return [some(value), fixed ? fixedOffset : offset];
      },
    };
  };

  const nullable = <T, U extends T = T>(
    item: Serializer<T, U>,
    options: NullableSerializerOptions = {}
  ): Serializer<Nullable<T>, Nullable<U>> => {
    const prefix = options.prefix ?? u8();
    const fixed = options.fixed ?? false;
    let descriptionSuffix = `; ${getSizeDescription(prefix)}`;
    let fixedSize = item.fixedSize === 0 ? prefix.fixedSize : null;
    if (fixed) {
      if (item.fixedSize === null || prefix.fixedSize === null) {
        throw new BeetSerializerError(
          'Fixed nullables can only be used with fixed-size serializers'
        );
      }
      descriptionSuffix += '; fixed';
      fixedSize = prefix.fixedSize + item.fixedSize;
    }
    return {
      description:
        options.description ??
        `nullable(${item.description + descriptionSuffix})`,
      fixedSize,
      maxSize: sumSerializerSizes([prefix.maxSize, item.maxSize]),
      serialize: (option: Nullable<T>) => {
        const prefixByte = prefix.serialize(Number(option !== null));
        if (fixed) {
          const itemFixedSize = item.fixedSize as number;
          const itemBytes =
            option !== null
              ? item.serialize(option).slice(0, itemFixedSize)
              : new Uint8Array(itemFixedSize).fill(0);
          return mergeBytes([prefixByte, itemBytes]);
        }
        const itemBytes =
          option !== null ? item.serialize(option) : new Uint8Array();
        return mergeBytes([prefixByte, itemBytes]);
      },
      deserialize: (bytes: Uint8Array, offset = 0) => {
        if (bytes.slice(offset).length === 0) {
          return handleEmptyBuffer('nullable', null, offset);
        }
        const fixedOffset =
          offset + (prefix.fixedSize ?? 0) + (item.fixedSize ?? 0);
        const [isSome, prefixOffset] = prefix.deserialize(bytes, offset);
        offset = prefixOffset;
        if (isSome === 0) {
          return [null, fixed ? fixedOffset : offset];
        }
        const [value, newOffset] = item.deserialize(bytes, offset);
        offset = newOffset;
        return [value, fixed ? fixedOffset : offset];
      },
    };
  };

  const struct = <T extends object, U extends T = T>(
    fields: StructToSerializerTuple<T, U>,
    options: StructSerializerOptions = {}
  ): Serializer<T, U> => {
    const fieldDescriptions = fields
      .map(([name, serializer]) => `${String(name)}: ${serializer.description}`)
      .join(', ');
    return {
      description: options.description ?? `struct(${fieldDescriptions})`,
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
  };

  const enumFn = <T>(
    constructor: ScalarEnum<T> & {},
    options: EnumSerializerOptions = {}
  ): Serializer<T> => {
    const prefix = options.size ?? u8();
    const enumKeys = Object.keys(constructor);
    const enumValues = Object.values(constructor);
    const isNumericEnum = enumValues.some((v) => typeof v === 'number');
    const valueDescriptions = enumValues
      .filter((v) => typeof v === 'string')
      .join(', ');
    const minRange = 0;
    const maxRange = isNumericEnum
      ? enumValues.length / 2 - 1
      : enumValues.length - 1;
    const stringValues: string[] = isNumericEnum
      ? [...enumKeys]
      : [...new Set([...enumKeys, ...enumValues])];
    function assertValidVariant(variant: number | string): void {
      const isInvalidNumber =
        typeof variant === 'number' &&
        (variant < minRange || variant > maxRange);
      const isInvalidString =
        typeof variant === 'string' && !stringValues.includes(variant);
      if (isInvalidNumber || isInvalidString) {
        throw new BeetSerializerError(
          `Invalid enum variant. Got "${variant}", ` +
            `expected one of [${stringValues.join(', ')}] ` +
            `or a number between ${minRange} and ${maxRange}`
        );
      }
    }
    return {
      description:
        options.description ??
        `enum(${valueDescriptions}; ${prefix.description})`,
      fixedSize: prefix.fixedSize,
      maxSize: prefix.maxSize,
      serialize: (value: T) => {
        assertValidVariant(value as string | number);
        if (typeof value === 'number') return prefix.serialize(value);
        const valueIndex = enumValues.indexOf(value);
        if (valueIndex >= 0) return prefix.serialize(valueIndex);
        return prefix.serialize(enumKeys.indexOf(value as string));
      },
      deserialize: (bytes: Uint8Array, offset = 0) => {
        if (bytes.slice(offset).length === 0) {
          throw new DeserializingEmptyBufferError('enum');
        }
        const [value, newOffset] = prefix.deserialize(bytes, offset);
        const valueAsNumber = Number(value);
        offset = newOffset;
        assertValidVariant(valueAsNumber);
        return [
          (isNumericEnum ? valueAsNumber : enumValues[valueAsNumber]) as T,
          offset,
        ];
      },
    };
  };

  const dataEnum = <T extends DataEnum, U extends T = T>(
    variants: DataEnumToSerializerTuple<T, U>,
    options: DataEnumSerializerOptions = {}
  ): Serializer<T, U> => {
    const prefix = options.size ?? u8();
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
      description:
        options.description ??
        `dataEnum(${fieldDescriptions}; ${prefix.description})`,
      fixedSize:
        variants.length === 0
          ? prefix.fixedSize
          : sumSerializerSizes([prefix.fixedSize, fixedVariantSize]),
      maxSize:
        variants.length === 0
          ? prefix.maxSize
          : sumSerializerSizes([prefix.maxSize, maxVariantSize]),
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
        const variantPrefix = prefix.serialize(discriminator);
        const variantSerializer = variants[discriminator][1];
        const variantBytes = variantSerializer.serialize(variant as any);
        return mergeBytes([variantPrefix, variantBytes]);
      },
      deserialize: (bytes: Uint8Array, offset = 0) => {
        if (bytes.slice(offset).length === 0) {
          throw new DeserializingEmptyBufferError('dataEnum');
        }
        const [discriminator, dOffset] = prefix.deserialize(bytes, offset);
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
  };

  const string = (
    options: StringSerializerOptions = {}
  ): Serializer<string> => {
    const size = options.size ?? u32();
    const encoding = options.encoding ?? utf8;
    const description =
      options.description ??
      `string(${encoding.description}; ${getSizeDescription(size)})`;

    if (size === 'variable') {
      return { ...encoding, description };
    }

    if (typeof size === 'number') {
      return fixSerializer(encoding, size, description);
    }

    return {
      description,
      fixedSize: null,
      maxSize: null,
      serialize: (value: string) => {
        const contentBytes = encoding.serialize(value);
        const lengthBytes = size.serialize(contentBytes.length);
        return mergeBytes([lengthBytes, contentBytes]);
      },
      deserialize: (buffer: Uint8Array, offset = 0) => {
        if (buffer.slice(offset).length === 0) {
          throw new DeserializingEmptyBufferError('string');
        }
        const [lengthBigInt, lengthOffset] = size.deserialize(buffer, offset);
        const length = Number(lengthBigInt);
        offset = lengthOffset;
        const contentBuffer = buffer.slice(offset, offset + length);
        if (contentBuffer.length < length) {
          throw new NotEnoughBytesError('string', length, contentBuffer.length);
        }
        const [value, contentOffset] = encoding.deserialize(contentBuffer);
        offset += contentOffset;
        return [value, offset];
      },
    };
  };

  const bool = (options: BoolSerializerOptions = {}): Serializer<boolean> => {
    const size = options.size ?? u8();
    if (size.fixedSize === null) {
      throw new BeetSerializerError('Serializer [bool] requires a fixed size.');
    }
    return {
      description: options.description ?? `bool(${size.description})`,
      fixedSize: size.fixedSize,
      maxSize: size.fixedSize,
      serialize: (value: boolean) => size.serialize(value ? 1 : 0),
      deserialize: (bytes: Uint8Array, offset = 0) => {
        if (bytes.slice(offset).length === 0) {
          throw new DeserializingEmptyBufferError('bool');
        }
        const [value, vOffset] = size.deserialize(bytes, offset);
        return [value === 1, vOffset];
      },
    };
  };

  const unit = (options: UnitSerializerOptions = {}): Serializer<void> => ({
    description: options.description ?? 'unit',
    fixedSize: 0,
    maxSize: 0,
    serialize: () => new Uint8Array(),
    deserialize: (_bytes: Uint8Array, offset = 0) => [undefined, offset],
  });

  const bytes = (
    options: BytesSerializerOptions = {}
  ): Serializer<Uint8Array> => {
    const size = options.size ?? 'variable';
    const description =
      options.description ?? `bytes(${getSizeDescription(size)})`;

    const byteSerializer: Serializer<Uint8Array> = {
      description,
      fixedSize: null,
      maxSize: null,
      serialize: (value: Uint8Array) => new Uint8Array(value),
      deserialize: (bytes: Uint8Array, offset = 0) => {
        const slice = new Uint8Array(bytes.slice(offset));
        return [slice, offset + slice.length];
      },
    };

    if (size === 'variable') {
      return byteSerializer;
    }

    if (typeof size === 'number') {
      return fixSerializer(byteSerializer, size, description);
    }

    return {
      description,
      fixedSize: null,
      maxSize: null,
      serialize: (value: Uint8Array) => {
        const contentBytes = byteSerializer.serialize(value);
        const lengthBytes = size.serialize(contentBytes.length);
        return mergeBytes([lengthBytes, contentBytes]);
      },
      deserialize: (buffer: Uint8Array, offset = 0) => {
        if (buffer.slice(offset).length === 0) {
          throw new DeserializingEmptyBufferError('bytes');
        }
        const [lengthBigInt, lengthOffset] = size.deserialize(buffer, offset);
        const length = Number(lengthBigInt);
        offset = lengthOffset;
        const contentBuffer = buffer.slice(offset, offset + length);
        if (contentBuffer.length < length) {
          throw new NotEnoughBytesError('bytes', length, contentBuffer.length);
        }
        const [value, contentOffset] =
          byteSerializer.deserialize(contentBuffer);
        offset += contentOffset;
        return [value, offset];
      },
    };
  };

  const publicKeyFn = (
    options: PublicKeySerializerOptions = {}
  ): Serializer<PublicKeyInput, PublicKey> => ({
    description: options.description ?? 'publicKey',
    fixedSize: 32,
    maxSize: 32,
    serialize: (value: PublicKeyInput) => publicKey(value).bytes,
    deserialize: (bytes: Uint8Array, offset = 0) => {
      if (bytes.slice(offset).length === 0) {
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
  });

  const handleEmptyBuffer = <T>(
    serializer: string,
    defaultValue: T,
    offset: number
  ): [T, number] => {
    if (!(options.tolerateEmptyBuffers ?? true)) {
      throw new DeserializingEmptyBufferError(serializer);
    }
    return [defaultValue, offset];
  };

  return {
    tuple,
    array,
    map,
    set,
    option,
    nullable,
    struct,
    enum: enumFn,
    dataEnum,
    string,
    bool,
    unit,
    u8,
    u16,
    u32,
    u64,
    u128,
    i8,
    i16,
    i32,
    i64,
    i128,
    f32,
    f64,
    bytes,
    publicKey: publicKeyFn,
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

function getSizeDescription(size: ArrayLikeSerializerSize | string): string {
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
    return [remainder / childrenSize, offset];
  }

  throw new BeetSerializerError(`Unknown size type: ${JSON.stringify(size)}.`);
}
