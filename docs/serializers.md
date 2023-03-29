# Serializers

Whether we are sending data to the blockchain or reading from it, serialization is a big part of the process. The serialization logic may vary from one program to another and, whilst Borsh serialization is the most popular choice for Solana programs, it is not the only one.

Umi helps with this by providing a flexible and extensible serialization framework that allows you to build your own serializers. Namely, it includes:
- A generic `Serializer<From, To = From>` type that represents an object that can serialize `From` into a `Uint8Array` and deserialize a `Uint8Array` into a `To` which defaults to `From`.
- A bunch of serializer helpers that map and transform serializers into new serializers.
- A set of baked-in serializers that can be used to serialize common types.
- Last but not least, a `SerializerInterface` that provides a set of primitive serializers that can be used to build more complex ones.

Let's see how all of this works.

## Serializer definition

The `Serializer` type is the central piece of Umi's serialization framework. With a `Serializer` instance on a type `T`, you should have all you need to serialize and deserialize instances of `T`. For instance, a `Serializer<{ name: string, age: number }>` instance can be used to serialize and deserialize instances of `{ name: string, age: number }`.

In some cases, the data we want to serialize might be slightly looser than the data we get when deserializing. For that reason, the `Serializer<From, To>` type allows a second type parameter `To` that extends `From` and defaults to `From`. Using our previous example, imagine the `age` attribute is optional and will default to `42` when not provided. In that case, we can define a `Serializer<{ name: string, age?: number }, { name: string, age: number }>` instance that serializes `{ name: string, age?: number }` into a `Uint8Array` but deserializes a `Uint8Array` into `{ name: string, age: number }`.

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
- The `fixedSize` attribute gives us the size of the serialized value in bytes if and only if we are dealing with a fixed-size serializer. For instance, an `u32` serializer will always have a `fixedSize` of `4` bytes.
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

The `mapSerializer` can also be used to transform serializers that have different `From` and `To` types. Here's a similar example to the one above but with a different `To` type.

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

The `fixSerializer` function is another helper that can make transform any variable-size serializer into a fixed-size one by requesting a fixed size in bytes. It does so by padding or truncating the `Uint8Array` buffer to the requested size when necessary. The returned serializer will have the same `From` and `To` types as the original serializer.

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

We've seen how serializers are defined, learned how they can be transformed and listed a few built-in serializers provided by Umi. However, we've not yet seen how we can build our own serializers by using a set of primitives provided by the `SerializerInterface`.

The `SerializerInterface` offers a large set of methods that can be used to create serializers of any type. These can be used to compose more complex serializers from simpler ones. For instance, here's an object serializer that is composed of a string, a public key and a set of numbers.

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

Each of the methods provided by the `SerializerInterface` defines its own arguments — i.e. the `array` method requires the item serializer as a first argument — but all of them have an optional `options` argument at the end that can be used to tweak the behaviour of the serializer. The attributes inside the `options` argument may vary from one method to the other but they all share one common attribute: `description`. This can be used to provide a specific description of the created serializer. Notice that, if omitted, a good-enough description will be created for you.

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

The `bool` method can be used to create a `Serializer<boolean>`. By default, it uses a `u8` number to store the boolean value but this can be changed by passing the `size` option.

```ts
umi.serializer.bool(); // -> Uses a u8.
umi.serializer.bool({ size: umi.serializer.u32() }); // -> Uses a u32.
umi.serializer.bool({ size: umi.serializer.u32({ endian: Endian.Big }) }); // -> Uses a big-endian u32.
```

### Strings

The `string` method returns a `Serializer<string>` that can be used to serialize strings using various encodings and size strategies. It contains the following options:
- `encoding`: A `Serializer<string>` that represents the encoding to use when serializing and deserializing the string. Defaults to the `utf8` built-in serializer. You might be wondering, why do we need to pass a `Serializer<string>` to create a `Serializer<string>`? This is because the purpose of the `encoding` serializer is only to convert some text to and from a byte array without worrying about anything else such as storing the size of the string. This allows us to plug in any encoding we want, whilst being able to leverage all other options provided by this `string` method.
- `size`: In order to know how long the string goes on for in a given buffer, we need to know its size in bytes. To that end, one of the following size strategies can be used:
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

Very similar to the `string` method, the `bytes` method contains a `size` option that configures how the size of the byte array is stored and restored. The same size strategies are supported as for the `string` method except that the default size here is the `"variable"` strategy. To recap:
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

The `publicKey` method returns a `Serializer<PublicKey>` that can be used to serialize and deserialize public keys. Here's an example of serializing and deserializing the same public key.

```ts
const myPublicKey = publicKey('...');
const buffer = umi.serializer.publicKey().serialize(myPublicKey);
const [myDeserializedPublicKey, offset] = umi.serializer.publicKey().deserialize(buffer);
samePublicKey(myPublicKey, myDeserializedPublicKey); // -> true
```

### Units

The `unit` method returns a `Serializer<void>` that serializes `undefined` into an empty `Uint8Array` and returns `undefined` without consuming any bytes when deserializing. This is more of a low-level serializer that can be used internally by other serializers. For instance, this is how `dataEnum` serializers describe empty variants internally.

```ts
umi.serializer.unit().serialize(undefined); // -> new Uint8Array([])
umi.serializer.unit().deserialize(new Uint8Array([42])); // -> [undefined, 0]
```

### Arrays, Sets and Maps

The `SerializerInterface` provides three methods to serialize lists and maps:
- `array`: Serializes an array of items. It accepts a `Serializer<T>` as an argument and returns a `Serializer<T[]>`.
- `set`: Serializes a set of unique items. It accepts a `Serializer<T>` as an argument and returns a `Serializer<Set<T>>`.
- `map`: Serializes a map of key-value pairs. It accepts a `Serializer<K>` for the keys and a `Serializer<V>` for the values as arguments and returns a `Serializer<Map<K, V>>`.

All three methods accept the same `size` option that configures how the length of the array, set or map is stored and restored. This is very similar to how the `string` and `bytes` methods work. Here are the supported strategies:
- `NumberSerializer`: Uses a number serializer that prefixes the content with its size. By default, the size is stored using a `u32` prefix in little-endian.
- `number`: Returns an array, set or map serializer with a fixed number of items.
- `"remainder"`: Returns an array, set or map serializer that infers the number of items by dividing the rest of the buffer by the fixed size of its item. For instance, if a buffer has 64 bytes remaining and each item of an array is 16 bytes long, the array will be deserialized with 4 items. Note that this option is only available for fixed-size items. For maps, both the key serializer and the value serializer must have a fixed size.

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
- `fixed`: When this is `true`, it returns a fixed-size serializer by changing the serialization logic when the value is empty. In this case, the serialized value will be padded with zero such that empty values and filled values are serialized using the same amount of bytes. Note that this only works if the item serializer is of a fixed size.

```ts
// Options.
umi.serializer.option(umi.serializer.publicKey()) // Option<PublicKey> with a u8 prefix.
umi.serializer.option(umi.serializer.publicKey(), { prefix: umi.serializer.u16() }) // Option<PublicKey> with a u16 prefix.
umi.serializer.option(umi.serializer.publicKey(), { fixed: true }) // Option<PublicKey> with a fixed size.

// Nullables.
umi.serializer.nullable(umi.serializer.publicKey()) // PublicKey | null with a u8 prefix.
umi.serializer.nullable(umi.serializer.publicKey(), { prefix: umi.serializer.u16() }) // PublicKey | null with a u16 prefix.
umi.serializer.nullable(umi.serializer.publicKey(), { fixed: true }) // PublicKey | null with a fixed size.
```

### Structs

The `struct` method is likely the most used method of the `SerializerInterface`. It allows us to serialize and deserialize a JavaScript object of generic type `T`.

It requires the name and the serializer of each field to be passed as an array on the first argument. This `fields` array is structured such that each field is a tuple where the first item is the name of the field and the second item is the serializer of the field. The order of the fields is important because it determines the order in which the fields are serialized and deserialized. Here's an example.

```ts
type Person = {
  name: string;
  age: number;
}

umi.serializer.struct<Person>([
  ['name', umi.serializer.string()],
  ['age', umi.serializer.u32()],
]);
```

The `struct` method also accepts a second type parameter `U` in case some fields have different `From` and `To` type parameters. This allows us to create serializers of type `Serializer<T, U>`.

For instance, this is how we could create a struct serializer that offers a default value for the `age` field of the `Person` type.

```ts
type Person = { name: string; age: number; }
type PersonArgs = { name: string; age?: number; }

const ageOr42 = mapSerializer(
  umi.serializer.u32(),
  (age: number | undefined): number => age ?? 42,
);

umi.serializer.struct<PersonArgs, Person>([
  ['name', umi.serializer.string()],
  ['age', ageOr42],
]);
```

### Tuples

The `SerializerInterface` offers a `tuple` method that can be used to create tuple serializers. Whilst tuples are not native in JavaScript, they can be represented in TypeScript using an array such that each item has its own defined type. For instance, a `(String, u8)` tuple in Rust can be represented as a `[string, number]` in TypeScript.

The `tuple` method accepts an array of serializers as its first argument that should match the items of the tuple in the same order. Here are a few examples.

```ts
umi.serializer.tuple([umi.serializer.bool()]); // Serializer<[bool]>
umi.serializer.tuple([umi.serializer.string(), umi.serializer.u8()]); // Serializer<[string, number]>
umi.serializer.tuple([umi.serializer.publicKey(), umi.serializer.u64()]); // Serializer<[PublicKey, number | bigint], [PublicKey, bigint]>
```

### Scalar Enums

The `enum` method can be used to create serializers for scalar enums by storing the value (or index) of the variant as a `u8` number.

It requires the enum constructor as its first argument. For instance, if an enum is defined as `enum Direction { Left }`, then the constructor `Direction` should be passed as the first argument. The serializer created will accept any variant of the enum as input, as well as its value or its name. Here is an example.

```ts
enum Direction { Left, Right, Up, Down };

const directionSerializer = umi.serializer.enum(Direction); // Serializer<Direction>
directionSerializer.serialize(Direction.Left); // -> 0x00
directionSerializer.serialize(Direction.Right); // -> 0x01
directionSerializer.serialize('Left'); // -> 0x00
directionSerializer.serialize('Right'); // -> 0x01
directionSerializer.serialize(0); // -> 0x00
directionSerializer.serialize(1); // -> 0x01

// The deserialized value is always an instance of the enum.
directionSerializer.deserialize(new Uint8Array([1])); // -> [Direction.Right, 1]
```

Note that this only works with scalar enum whose values are numbers. If you use the `enum` method with a string enum — e.g. `enum Direction { Left = 'LEFT' }` — it will ignore the text value and only use the index of the variant.

```ts
enum Direction { Left = 'LEFT', Right = 'RIGHT', Up = 'UP', Down = 'DOWN' };

const directionSerializer = umi.serializer.enum(Direction); // Serializer<Direction>
directionSerializer.serialize(Direction.Left); // -> 0x00
directionSerializer.serialize('Left'); // -> 0x00

// Note that the enum string value can be used as input.
directionSerializer.serialize('LEFT'); // -> 0x00
```

### Data Enums

In Rust, enums are powerful data types whose variants can be one of the following:
- An empty variant — e.g. `enum Message { Quit }`.
- A tuple variant — e.g. `enum Message { Write(String) }`.
- A struct variant — e.g. `enum Message { Move { x: i32, y: i32 } }`.

Whilst we do not have such powerful enums in JavaScript, we can emulate them in TypeScript using a union of objects such that each object is differentiated by a specific field. We call this a data enum.

In Umi, we use the `__kind` field to distinguish between the different variants of a data enum. Additionally, since all variants are objects, we use the `fields` property to wrap the array of tuple variants. Here is an example.

```ts
type Message = 
  | { __kind: 'Quit' } // Empty variant.
  | { __kind: 'Write'; fields: [string] } // Tuple variant.
  | { __kind: 'Move'; x: number; y: number }; // Struct variant.
```

The `dataEnum` method of the `SerializerInterface` allows us to create serializers for data enums. It requires the name and serializer of each variant as a first argument. Similarly to the `struct` method, these are defined as an array of variant tuples where the first item is the name of the variant and the second item is the serializer of the variant. Since empty variants do not have data to serialize, they simply use the `unit` serializer. Here is how we can create a data enum serializer for our previous example.

```ts
const messageSerializer = umi.serializer.dataEnum<Message>([
  // Empty variant.
  ['Quit', umi.serializer.unit()],
  // Tuple variant.
  ['Write', umi.serializer.struct<{ fields: [string] }>([
    ['fields', umi.serializer.tuple([umi.serializer.string()])]
  ])],
  // Struct variant.
  ['Move', umi.serializer.struct<{ x: number; y: number }>([
    ['x', umi.serializer.i32()],
    ['y', umi.serializer.i32()]
  ])],
]);
```

Note that this serialization is compatible with the borsh serialization of Rust enums. First, it uses a `u32` number in little-endian to store the index of the variant. If the selected variant is an empty variant, it stops there. Otherwise, it uses the serializer of the variant to serialize its data.

```ts
messageSerializer.serialize({ __kind: 'Quit' }); // -> 0x00000000
messageSerializer.serialize({ __kind: 'Write', fields: ['Hi'] }); // -> 0x01000000020000004869
messageSerializer.serialize({ __kind: 'Move', x: 5, y: 6 }); // -> 0x020000000500000006000000
```

The `dataEnum` method also accepts a `prefix` option that allows us to select a custom number serializer for the variant index — instead of the default `u32` as mentioned above. Here's an example using a `u8` instead of a `u32`.

```ts
const messageSerializer = umi.serializer.dataEnum<Message>([...], {
  prefix: umi.serializer.u8()
});

messageSerializer.serialize({ __kind: 'Quit' }); // -> 0x00
messageSerializer.serialize({ __kind: 'Write', fields: ['Hi'] }); // -> 0x01020000004869
messageSerializer.serialize({ __kind: 'Move', x: 5, y: 6 }); // -> 0x020500000006000000
```

Note that, when dealing with data enums, you may want to offer some helper methods to improve the developer experience so that it feels closer to the Rust way of handling enums. This is something that [Kinobi](./kinobi.md) offers to generated JavaScript clients out of the box.

```ts
// Example of helper methods.
message('Quit'); // -> { __kind: 'Quit' }
message('Write', ['Hi']); // -> { __kind: 'Write', fields: ['Hi'] }
message('Move', { x: 5, y: 6 }); // -> { __kind: 'Move', x: 5, y: 6 }
isMessage('Quit', message('Quit')); // -> true
isMessage('Write', message('Quit')); // -> false
```

<p align="center">
<strong>Next: <a href="./storage.md">Uploading and downloading assets ≫</a></strong>
</p>
