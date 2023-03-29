# Public keys and signers

On this page, we'll see how to manage public keys and signers in Umi which is partially made possible by the EdDSA interface.

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

// From a 32-byte buffer.
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

In Umi, PDAs are public keys with an extra `bump` attribute. This ensures that PDA objects can be used anywhere a public key is expected.

```ts
type Pda = PublicKey & {
  bump: number;
};
```

To derive a new PDA, we can use the `findPda` method of the EdDSA interface.

```ts
const pda = umi.eddsa.findPda(programId, seeds);
```

Each seed must be serialized as a `Uint8Array`. You can learn more about serializers on [the Serializers page](./serializers.md) but here is a quick example showing how to find the metadata PDA of a given mint address.

```ts
const tokenMetadataProgramId = publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const metadata = umi.eddsa.findPda(tokenMetadataProgramId, [
  umi.serializer.string({ size: 'variable' }).serialize('metadata'),
  tokenMetadataProgramId.bytes,
  umi.serializer.publicKey().serialize(mint),
]);
```

Note that in most cases, programs will provide helper methods to find specific PDAs. For instance, the code snippet above can be simplified to the following using the `findMetadataPda` method of the [`@metaplex-foundation/mpl-token-metadata`](https://github.com/metaplex-foundation/mpl-token-metadata) [Kinobi](./kinobi.md)-generated library.

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

A signer is a public key that can sign transactions and messages. This enables transactions to be signed by the required accounts and wallets to prove their identity by signing messages. In Umi, it is represented by the following interface.

```ts
interface Signer {
  publicKey: PublicKey;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
  signTransaction(transaction: Transaction): Promise<Transaction>;
  signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>;
}
```

You may generate a new signer cryptographically using the `generateSigner` helper method. Under the hood, this method uses the `generateKeypair` method of the EdDSA interface as described in the next section.

```ts
const mySigner = generateSigner(umi);
```

The following helper functions can also be used to manage signers.

```ts
// Check if the provided value is a Signer object.
isSigner(mySigner);

// Deduplicate an array of signers by public key.
uniqueSigners(mySigners);
```

As mentioned in [the Umi interfaces page](./interfaces.md), the `Umi` interface stores two instances of `Signer`: The `identity` using the app and the `payer` paying for transaction and storage fees. Umi provides plugins to quickly assign new signers to these attributes. The `signerIdentity` and `signerPayer` plugins are available for this purpose. Note that, by default, the `signerIdentity` method will also update the `payer` attribute since, in most cases, the identity is also the payer.

```ts
umi.use(signerIdentity(mySigner));
// Is equivalent to:
umi.identity = mySigner;
umi.payer = mySigner;

umi.use(signerIdentity(mySigner, false));
// Is equivalent to:
umi.identity = mySigner;

umi.use(signerPayer(mySigner));
// Is equivalent to:
umi.payer = mySigner;
```

You may also use the `generatedSignerIdentity` and `generatedSignerPayer` plugins to generate a new signer and immediately assign it to the `identity` and/or `payer` attributes.

```ts
umi.use(generatedSignerIdentity());
umi.use(generatedSignerPayer());
```

In some cases, a library may require a `Signer` to be provided but the current environment does not have access to this wallet as a signer. For instance, this can happen if a transaction is being created on the client but will be later on signed on a private server. It's for that reason that Umi provides a `createNoopSigner` helper that creates a new signer from the given public key and simply ignores any signing request. It is then your responsibility to ensure that the transaction is signed before being sent to the blockchain.

```ts
const mySigner = createNoopSigner(myPublicKey);
```

## Keypairs

Whilst Umi only relies on the `Signer` interface to request signatures from a wallet, it also defines a `Keypair` type and a `KeypairSigner` type that are explicitly aware of their secret key.

```ts
type KeypairSigner = Signer & Keypair;
type Keypair = {
  publicKey: PublicKey;
  secretKey: Uint8Array;
};
```

The `generateKeypair`, `createKeypairFromSeed` and `createKeypairFromSecretKey` methods of the EdDSA interface can be used to generate new `Keypair` objects.

```ts
// Generate a new random keypair.
const myKeypair = umi.eddsa.generateKeypair();

// Restore a keypair using a seed.
const myKeypair = umi.eddsa.createKeypairFromSeed(mySeed);

// Restore a keypair using its secret key.
const myKeypair = umi.eddsa.createKeypairFromSecretKey(mySecretKey);
```

In order to use these keypairs as signers throughout your application, you can use the `createSignerFromKeypair` helper method. This method will return an instance of `KeypairSigner` to ensure that we can access the secret key when needed.

```ts
const myKeypair = umi.eddsa.generateKeypair();
const myKeypairSigner = createSignerFromKeypair(myKeypair);
```

Note that the code snippet above is equivalent to using the `generateSigner` helper method described in the previous section.

Helper functions and plugins also exist to manage keypairs.

```ts
// Check if the provided signer is a KeypairSigner object.
isKeypairSigner(mySigner);

// Register a new keypair as the identity and payer.
umi.use(keypairIdentity(myKeypair));

// Register a new keypair as the payer only.
umi.use(keypairPayer(myKeypair));
```

## Signing messages

The `Signer` object and the EdDSA interface can be used together to sign and verify messages like so.

```ts
const myMessage = utf8.serialize('Hello, world!');
const mySignature = await mySigner.signMessage(myMessage)
const mySignatureIsCorrect = umi.eddsa.verify(myMessage, mySignature, mySigner.publicKey);
```

## Signing transactions

Once we have a `Signer` instance, signing a transaction or a set of transactions is as simple as calling the `signTransaction` or `signAllTransactions` methods.

```ts
const mySignedTransaction = await mySigner.signTransaction(myTransaction);
const mySignedTransactions = await mySigner.signAllTransactions(myTransactions);
```

If you need multiple signers to all sign the same transaction, you may use the `signTransaction` helper method like so.

```ts
const mySignedTransaction = await signTransaction(myTransaction, mySigners);
```

Going one step further, if you have multiple transactions that each need to be signed by one or more signers, the `signAllTransactions` function can help you with that. It will even ensure that, if a signer is required to sign more than one transaction, it will use the `signer.signAllTransactions` method on all of them at once.

```ts
// In this example, mySigner2 will sign both transactions
// using the signAllTransactions method.
const mySignedTransactions = await signAllTransactions([
  { transaction: myFirstTransaction, signers: [mySigner1, mySigner2] },
  { transaction: mySecondTransaction, signers: [mySigner2, mySigner3] }
]);
```

If you are creating a `Signer` manually and therefore implementing its `signTransaction` method, you may want to use the `addTransactionSignature` helper function to add the signature to the transaction. This will ensure the provided signature is required by the transaction and pushed at the right index of the transaction's `signatures` array.

```ts
const mySignedTransaction = addTransactionSignature(myTransaction, mySignature, myPublicKey);
```

<p align="center">
<strong>Next: <a href="./rpc.md">Connecting with an RPC ≫</a></strong>
</p>
