# Public keys and signers

In this page, we'll see how to manage public keys and signers in Umi which is partially made possible by the EdDSA interface.

The [EdDSA interface](https://umi-docs.vercel.app/interfaces/umi.EddsaInterface.html) is used to create keypairs, find PDAs and sign/verify messages using the EdDSA algorithm. We can either use this interface directly and/or use helper methods that delegate to this interface to provide a better developer experience.

Let's tackle this on a per-use case basis.

## Public keys

In Umi, a public key is a simple object containing the 32 bytes of the public key represented by the native `Uint8Array` type.

```ts
type PublicKey = {
  bytes: Uint8Array;
}
```

We can create a new valid public key from a variety of inputs using the `publicKey` helper method. If the provided input cannot be converted to a valid public key, an error will be thrown.

```ts
// From a base58 string.
publicKey('LorisCg1FTs89a32VSrFskYDgiRbNQzct1WxyZb7nuA');

// From a 32-bytes buffer.
publicKey(new Uint8Array(32));

// From a PublicKey or Signer type.
publicKey(someWallet as PublicKey | Signer);
```

It is possible to convert a public key to a base58 string using the `base58PublicKey` helper method.

```ts
base58PublicKey(myPublicKey);
// -> "LorisCg1FTs89a32VSrFskYDgiRbNQzct1WxyZb7nuA"
```

Additional helper methods are also available to help manage public keys.

```ts
// Check if the provided value is a PublicKey object.
isPublicKey(myPublicKey);

// Assert the provided value is a PublicKey object and fail otherwise.
assertPublicKey(myPublicKey);

// Check if two public keys are equal.
samePublicKey(publicKeyA, publicKeyB);

// Deduplicate an array of public keys.
uniquePublicKeys(myPublicKeys);

// Create the default public key which is a 32-bytes array of zeros.
defaultPublicKey();
```

## PDAs

A PDA — or Program-Derived Address — is a public key that is derived from a program ID and an array of predefined seeds. A `bump` number ranging from 0 to 255 is required to ensure the PDA does not live on the EdDSA elliptic curve and therefore does not conflict with cryptographically generated public keys.

In Umi, PDAs are public keys with an extra `bump` attribute. This ensure that PDA objects can be used anywhere a public key is expected.

```ts
type Pda = PublicKey & {
  bump: number;
};
```

To derive a new PDA, we can use the `findPda` method of the EdDSA interface.

```ts
const pda = umi.eddsa.findPda(programId, seeds);
```

Each seed must be serialized as a `Uint8Array`. You can learn more about serializers in [the Serializers page](./serializers.md) but here is a quick example showing how to find the metadata PDA of a given mint address.

```ts
const tokenMetadataProgramId = publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const metadata = umi.eddsa.findPda(tokenMetadataProgramId, [
  umi.serializer.string({ size: 'variable' }).serialize('metadata'),
  tokenMetadataProgramId.bytes,
  umi.serializer.publicKey().serialize(mint),
]);
```

Note that in most cases, programs will provide helper methods to find specific PDAs. For instance the code snippet above can be simplified to the following using the `findMetadataPda` method of the [`@metaplex-foundation/mpl-token-metadata`](https://github.com/metaplex-foundation/mpl-token-metadata) [Kinobi](./kinobi.md)-generated library.

```ts
import { findMetadataPda } from '@metaplex-foundation/mpl-token-metadata';

const metadata = findMetadataPda(umi, { mint })
```

The following helper methods are also available to help manage PDAs.

```ts
// Check if the provided value is a Pda object.
isPda(myPda);

// Check if the provided public key is on the EdDSA elliptic curve.
umi.eddsa.isOnCurve(myPublicKey);
```

## Signers

TODO

## Keypairs

TODO
