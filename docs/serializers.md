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

TODO

### PublicKeys

TODO

### Bytes

TODO

### Units

TODO

### Arrays, Maps and Sets

TODO

### Options and Nullables

TODO

### Structs

TODO

### Tuples

TODO

### Scalar Enums

TODO

### Data Enums

TODO
