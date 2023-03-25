# Serializers

Whether we are sending data to the blockchain or reading from it, serialization is a big part of the process. The serialization logic may vary from one program to another and, whilst Borsh serialization is the most popular choice for Solana programs, it is not the only one.

Umi helps with this by providing a flexible and extensible serialization framework that allows you to build your own serializers. Namely it includes:
- A generic `Serializer<From, To = From>` type that represents a object that can serialize `From` into a `Uint8Array` and deserialize a `Uint8Array` into a `To` which defaults to `From`.
- A bunch of serializer helpers that map and transform serializers into new serializers.
- A set of baked-in serializers that can be used to serialize common types.
- Last but not least, a `SerializerInterface` that provides a set of primitive serializers that can be used to build more complex ones.

Let's see how all of this works.

## Serializer definition

The `Serializer` type is the central piece of Umi's serialization framework. With a `Serializer` instance on a type `T`, you should have all you need to serialize and deserialize instances of `T`. For instance, a `Serializer<{ name: string, age: number }>` instance can be used to serialize and deserialize instances of `{ name: string, age: number }`.

In some case, the data we want to serialize might be slightly looser than the data we get when deserializing. For that reason, the `Serializer<From, To>` type allows a second type parameter `To` that extends `From` and defaults to `From`. Using our previous example, imagine the `age` attribute is optional and will default to `42` when not provided. In that case, we can define a `Serializer<{ name: string, age?: number }, { name: string, age: number }>` instance that serializes `{ name: string, age?: number }` into a `Uint8Array` but deserializes a `Uint8Array` into `{ name: string, age: number }`.

Here's how the `Serializer` type is defined.

```ts
type Serializer<From, To extends From = From> = {
  /** A description for the serializer. */
  description: string;
  /** The fixed size of the serialized value in bytes, or `null` if it is variable. */
  fixedSize: number | null;
  /** The maximum size a serialized value can be in bytes, or `null` if it is variable. */
  maxSize: number | null;
  /** The function that serializes a value into bytes. */
  serialize: (value: From) => Uint8Array;
  /**
   * The function that deserializes a value from bytes.
   * It returns the deserialized value and the number of bytes read.
   */
  deserialize: (buffer: Uint8Array, offset?: number) => [To, number];
};
```

On top of the non-surprising `serialize` and `deserialize` functions, the `Serializer` type also includes a `description`, a `fixedSize` and a `maxSize`.
- The `description` is a quick human-readable string that describes the serializer.
- The `fixedSize` attribute gives us the size of the serialized value in bytes if and only if we are dealing with a fixed-size serializer. For instance an `u32` serializer will always have a `fixedSize` of `4` bytes.
- The `maxSize` attribute can be helpful when we are dealing with variable-size serializers that have a bound on the maximum size they can take. For instance a borsh `Option<PublicKey>` serializer can either be of size `1` or `33` and therefore will have a `maxSize` of `33` bytes.

## Serializer helpers

Now that we know how serializers are defined in Umi, let's have a look at some of the helper methods Umi provide to transform them.

### Mapping serializers

The `mapSerializer` can be used to transform a `Serializer<A>` into a `Serializer<B>` by providing two functions that transform `B` into `A` and `A` back into `B`.

For instance, imagine we want to transform a string serializer into a number serializer by containing the length of the string. Here's how we could use the `mapSerializer` function to do it.

```ts
const serializerA: Serializer<string> = ...;
const serializerB: Serializer<number> = mapSerializer(
  serializerA,
  (value: number): string => 'x'.repeat(value), // Create a mock string of the given length.
  (value: string): number => value.length, // Get the length of the string.
);
```

The `mapSerializer` can also be used to transform serializers that have different `From` and `To` types. Heres a similar example to the one above but with a different `To` type.

```ts
const serializerA: Serializer<string | null, string> = ...;
const serializerB: Serializer<number | null, number> = mapSerializer(
  serializerA,
  (value: number | null): string | null => value === null ? null : 'x'.repeat(value),
  (value: string): number => value.length,
);
```

Note that if we are only interested in transforming the `From` type of a serializer without changing its `To` type, we can use the `mapSerializer` function with only one function instead. Here's how we could loosen our `Serializer<{ name: string, age: number }>` instance to make the `age` attribute optional when serializing only.

```ts
type Person = { name: string, age: number };
type PersonWithOptionalAge = { name: string, age?: number };

const serializerA: Serializer<Person> = ...;
const serializerB: Serializer<PersonWithOptionalAge, Person> = mapSerializer(
  serializerA,
  (value: PersonWithOptionalAge): Person => ({
    name: value.name,
    age: value.age ?? 42,
  }),
);
```

Mapping serializers is a very powerful technique and some built-in helpers like `mapAmountSerializer` and `mapDateTimeSerializer` are using it under the hood.

### Fixing serializers

The `fixSerializer` function is another helper that can make transform any variable-size serializer into a fixed-size one by requesting a fix size in bytes. It does so by padding or truncating the `Uint8Array` buffer to the requested size when necessary. The returned serializer will have the same `From` and `To` types as the original serializer.

```ts
const myFixedSerializer = fixSerializer(myVariableSerializer, 42);
```

### Reversing serializers

The `reverseSerializer` function can be used to reverse the bytes of a fixed-size serializer. Applications of this function are less frequent but it can be useful when dealing with endianness for instance. Here again, the returned serializer will have the same `From` and `To` types as the original serializer.

```ts
const myReversedSerializer = reverseSerializer(mySerializer);
```

## Baked-in serializers

Whilst Umi delegates the creation of primitive serializers to the `SerializerInterface` as we will see in the next section, it also ships with a handful of built-in serializers. Let's have a quick look at them.

### String encodings

Umi ships with the following string serializers that can be used to serialize and deserialize strings in different formats: `utf8`, `base10`, `base16`, `base58` and `base64`.

```ts
utf8.serialize('Hello World!');
base10.serialize('42');
base16.serialize('ff002a');
base58.serialize('LorisCg1FTs89a32VSrFskYDgiRbNQzct1WxyZb7nuA');
base64.serialize('SGVsbG8gV29ybGQhCg==');
```

It also ships with a `baseX` method that can create new string serializers for any given alphabet. For instance, this is how the `base58` serializer is implemented.

```ts
const base58: Serializer<string> = baseX(
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
);
```

### Bit arrays

Umi also provides a `bitArray` serializer that can be used to serialize and deserialize arrays of booleans such that each boolean is represented by a single bit. It requires the `size` of the serializer in bytes and an optional `backward` flag that can be used to reverse the order of the bits.

```ts
const booleans = [true, false, true, false, true, false, true, false];
bitArray(1).serialize(booleans); // -> Uint8Array.from([0b10101010]);
bitArray(1).deserialize(Uint8Array.from([0b10101010])); // -> [booleans, 1];
```

## The Serializer interface

We've seen how serializers are defined, how they can be transformed and listed a few built-in serializers provided by Umi. However, we've not yet seen how we can build our own serializers by using a set of primitives provided by the `SerializerInterface`.

The `SerializerInterface` offers a large set of methods that can be used to create serializers for any type. These can be used to compose more complex serializers from simpler ones. For instance, here's an object serializer that is composed of a string, a public key and a set of numbers.

```ts
type MyObject = {
  name: string;
  publicKey: PublicKey;
  numbers: number[];
};

const mySerializer: Serializer<MyObject> = umi.serializer.struct([
  ['name', umi.serializer.string()],
  ['publicKey', umi.serializer.publicKey()],
  ['numbers', umi.serializer.array(umi.serializer.u32())],
]);
```

Each of the methods provided by the `SerializerInterface` define their own arguments — i.e. the `array` method requires the item serializer as a first argument — but all of them have an optional `options` argument at the end that can be used to tweak the behaviour of the serializer. The attributes inside the `options` argument may vary from one method to the other but they all share one common attribute: `description`. This can be used to provide a specific description of the created serializer. Notice that, if omitted, a good-enough description will be created for you.

```ts
umi.serializer.string().description; // -> 'string(utf8; u32(le))'.
umi.serializer.string({ description: 'My custom string description' });
```

Now that we know how they work, let's have a look at the methods provided by the `SerializerInterface`.

### Numbers

The `SerializerInterface` ships with 12 number serializers: 5 unsigned integers, 5 signed integers and 2 floating point numbers. These can be used to serialize and deserialize numbers of different sizes. When the size of the number is greater than 32 bits, the serializer returned is a `Serializer<number | bigint, bigint>` instead of a `Serializer<number>` since JavaScript's native `number` type does not support numbers larger than 2^53.

```ts
// Unsigned integers.
umi.serializer.u8(); // -> Serializer<number>
umi.serializer.u16(); // -> Serializer<number>
umi.serializer.u32(); // -> Serializer<number>
umi.serializer.u64(); // -> Serializer<number | bigint, bigint>
umi.serializer.u128(); // -> Serializer<number | bigint, bigint>

// Signed integers.
umi.serializer.i8(); // -> Serializer<number>
umi.serializer.i16(); // -> Serializer<number>
umi.serializer.i32(); // -> Serializer<number>
umi.serializer.i64(); // -> Serializer<number | bigint, bigint>
umi.serializer.i128(); // -> Serializer<number | bigint, bigint>

// Floating point numbers.
umi.serializer.f32(); // -> Serializer<number>
umi.serializer.f64(); // -> Serializer<number>
```

Aside from the `u8` and `i8` methods that create 1-byte serializers, all other number serializers are represented in little-endian by default and can be configured to use a different endianness. This can be done by passing the `endian` option to the serializer.

```ts
umi.serializer.u64(); // Little-endian.
umi.serializer.u64({ endian: Endian.Little }); // Little-endian.
umi.serializer.u64({ endian: Endian.Big }); // Big-endian.
```

Note that, since number serializers are often reused in other serializers, Umi defines the following `NumberSerializer` type to include both `number` and `bigint` types.

```ts
type NumberSerializer =
  | Serializer<number>
  | Serializer<number | bigint, bigint>;
```

### Booleans

The `bool` method can be used to create a `Serializer<boolean>`. By default it uses a `u8` number to store the boolean value but this can be changed by passing the `size` option.

```ts
umi.serializer.bool(); // -> Uses a u8.
umi.serializer.bool({ size: umi.serializer.u32() }); // -> Uses a u32.
umi.serializer.bool({ size: umi.serializer.u32({ endian: Endian.Big }) }); // -> Uses a big-endian u32.
```

### Strings

The `string` method returns a `Serializer<string>` that can be used to serialize strings using various encodings and size strategies. It contains the following options:
- `encoding`: A `Serializer<string>` that represents the encoding to use when serializing and deserializing the string. Defaults to the `utf8` built-in serializer. You might be wondering, why do we need to pass a `Serializer<string>` to create a `Serializer<string>`? This is because the purpose of the `encoding` serializer is only to convert some text to and from a byte array without worrying about anything else such as storing the size of the string. This allows us to plug-in any encoding we want, whilst being able to leverage all other options provided by this `string` method.
- `size`: In order to know how long the string goes on for in a given buffer, we need to knows its size in bytes. To that end, one of the following size strategies can be used:
  - `NumberSerializer`: When a number serializer is passed, it will be used as a prefix to store and restore the size of the string. By default, the size is stored using a `u32` prefix in little-endian — which is the default behaviour for borsh serialization.
  - `number`: The byte size can also be provided explicitly as a number. This will create a fixed-size serializer that does not use any size prefix and will always use the same number of bytes to store the string.
  - `"variable"`: When the string `"variable"` is passed as a size, it will create a variable-size serializer that simply uses all the remaining bytes in the buffer when deserializing. When serializing, it will simply return the result of the `encoding` serializer without storing the size of the serialized string.


```ts
// Serialized values using different encodings for reference.
utf8.serialize('Hi'); // -> 0x4869
base58.serialize('Hi'); // -> 0x03c9

// Default behaviour: utf8 encoding and u32 (litte-endian) size.
umi.serializer.string().serialize('Hi'); // -> 0x020000004869

// Custom encoding: base58.
umi.serializer.string({ encoding: base58 }).serialize('Hi'); // -> 0x0200000003c9

// Custom size: u16 (big-endian) size.
const u16BE = umi.serializer.u16({ endian: Endian.Big });
umi.serializer.string({ size: u16BE }).serialize('Hi'); // -> 0x00024869

// Custom size: 5 bytes.
umi.serializer.string({ size: 5 }).serialize('Hi'); // -> 0x4869000000

// Custom size: variable.
umi.serializer.string({ size: 'variable' }).serialize('Hi'); // -> 0x4869
```

### Bytes

The `bytes` method returns a `Serializer<Uint8Array>` which deserializes a `Uint8Array` into a... `Uint8Array`. Whilst this might seem a bit useless, it can be useful when composed into other serializers. For example, you could use it in a `struct` serializer to say that a particular field should be left unserialized.

Very similarly to the `string` method, the `bytes` method contains a `size` option that configures how the size of the byte array is stored and restored. The same size strategies are supported as for the `string` method except that the default size here is the `"variable"` strategy. To recap:
- `NumberSerializer`: Uses a prefixed number serializer to store and restore the size of the byte array.
- `number`: Uses a fixed size to store the byte array.
- `"variable"`: Passes the buffer as-is when serializing and returns the remaining of the buffer when deserializing. Defaults behaviour.

```ts
// Default behaviour: variable size.
umi.serializer.bytes().serialize(new Uint8Array([42])); // -> 0x2a

// Custom size: u16 (little-endian) size.
umi.serializer.bytes({ size: umi.serializer.u16() }).serialize(new Uint8Array([42])); // -> 0x01002a

// Custom size: 5 bytes.
umi.serializer.bytes({ size: 5 }).serialize(new Uint8Array([42])); // -> 0x2a00000000
```

### PublicKeys

The `publicKey` method returns a `Serializer<PublicKey>` that can be used to serialize and deserialize public keys. Here's an example serializing and deserializing the same public key.

```ts
const myPublicKey = publicKey('...');
const buffer = umi.serializer.publicKey().serialize(myPublicKey);
const [myDeserializedPublicKey, offset] = umi.serializer.publicKey().deserialize(buffer);
samePublicKey(myPublicKey, myDeserializedPublicKey); // -> true
```

### Units

The `unit` method returns a `Serializer<void>` that serializes `undefined` into an empty `Uint8Array` and returns `undefined` without consuming any bytes when deserializing. This is more of an low-level serializer that can be used internally by other serializers. For instance, this is how `dataEnum` serializes describe empty variants internally.

```ts
umi.serializer.unit().serialize(undefined); // -> new Uint8Array([])
umi.serializer.unit().deserialize(new Uint8Array([42])); // -> [undefined, 0]
```

### Arrays, Sets and Maps

The `SerializerInterface` provides three methods to serialize lists and maps:
- `array`: Serializes an array of items. It accepts a `Serializer<T>` as an argument and returns a `Serializer<T[]>`.
- `set`: Serializes a set of unique items. It accepts a `Serializer<T>` as an argument and returns a `Serializer<Set<T>>`.
- `map`: Serializes a map of key-value pairs. It accepts a `Serializer<K>` for the keys and a `Serializer<V>` for the values as arguments and returns a `Serializer<Map<K, V>>`.

All three methods accepts the same `size` option that configures how the lenght of the array, set or map is stored and restored. This is very similar to how the `string` and `bytes` methods work. Here are the supported strategies:
- `NumberSerializer`: Uses a number serializer that prefixes the content with its size. By default, the size is stored using a `u32` prefix in little-endian.
- `number`: Returns a array, set or map serializer with a fixed number of items.
- `"remainder"`: Returns a array, set or map serializer that infers the number of items by dividing the rest of the buffer by the fixed size of its item. For instance, if a buffer as 64 bytes remaining and each item of an array is 16 bytes long, the array will be deserialized with 4 items. Note that this option is only available for fixed-size items. For maps, both the key serializer and the value serializer must have a fixed size.

```ts
// Arrays.
umi.serializer.array(umi.serializer.u8()) // Array of u8 items with a u32 size prefix.
umi.serializer.array(umi.serializer.u8(), { size: 5 }) // Array of 5 u8 items.
umi.serializer.array(umi.serializer.u8(), { size: 'remainder' }) // Array of u8 items with a variable size.

// Sets.
umi.serializer.set(umi.serializer.u8()) // Set of u8 items with a u32 size prefix.
umi.serializer.set(umi.serializer.u8(), { size: 5 }) // Set of 5 u8 items.
umi.serializer.set(umi.serializer.u8(), { size: 'remainder' }) // Set of u8 items with a variable size.

// Maps.
umi.serializer.map(umi.serializer.u8(), umi.serializer.u8()) // Map of (u8, u8) entries with a u32 size prefix.
umi.serializer.map(umi.serializer.u8(), umi.serializer.u8(), { size: 5 }) // Map of 5 (u8, u8) entries.
umi.serializer.map(umi.serializer.u8(), umi.serializer.u8(), { size: 'remainder' }) // Map of (u8, u8) entries with a variable size.
```

### Options and Nullables

The `SerializerInterface` provides two methods to serialize optional values:
- `option`: Serializes an `Option` instance ([See documentation](./helpers.md#options)). It accepts a `Serializer<T>` as an argument and returns a `Serializer<Option<T>>`.
- `nullable`: Serializes a value that can be null. It accepts a `Serializer<T>` as an argument and returns a `Serializer<T | null>`.

Both methods serialize optional values by prefixing them with a boolean value that indicates whether the value is present or not. If the prefixed boolean is `false`, the value is `null` (for nullables) or `None` (for options) and we can skip deserializing the actual value. Otherwise, the value is deserialized using the provided serializer and returned.

They both offer the same options to configure the behaviour of the created serializer:
- `prefix`: The `NumberSerializer` to use to serialize and deserialize the boolean prefix. By default, it uses a `u8` prefix in little-endian.
- `fixed`: When this is `true`, it returns a fixed-size serializer by changing the serialization logic when the value is empty. In this case, the serialized value will be padded with zero such that empty values and filled values are serialized using the same amount of bytes. Note that this only works if the item serializer is of fixed size.

```ts
// Options.
umi.serializer.option(umi.serializer.publicKey()) // Option<PublicKey> with a u8 prefix.
umi.serializer.option(umi.serializer.publicKey(), { prefix: umi.serializer.u16() }) // Option<PublicKey> with a u16 prefix.
umi.serializer.option(umi.serializer.publicKey(), { fixed: true }) // Option<PublicKey> with a fixed size.

// TODO: Nullable.
```

### Structs

TODO

### Tuples

TODO

### Scalar Enums

TODO

### Data Enums

TODO
