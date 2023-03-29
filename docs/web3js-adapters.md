# Web3.js adapters

The `@solana/web3.js` library is currently widely used in the Solana ecosystem and defines its own types for public keys, transactions, instructions, etc.

When creating Umi, we wanted to move away from the class-based types defined in `@solana/web3.js` and instead use a more functional approach by relying only on TypeScript types. This unfortunately means that not all types from `@solana/web3.js` are compatible with the ones provided by Umi and vice versa.

To help with this issue, Umi provides a set of adapters that allows us to parse types to and from their Web3.js counterparts.

To use them, you will first need to install the [`@metaplex-foundation/umi-web3js-adapters`](https://github.com/metaplex-foundation/umi/tree/main/packages/umi-web3js-adapters) package.

```sh
npm install @metaplex-foundation/umi-web3js-adapters
```

Then, you will have access to a bunch of helper methods to convert to and from Web3.js types.

```ts
// For public keys.
fromWeb3JsPublicKey(myWeb3JsPublicKey);
toWeb3JsPublicKey(myUmiPublicKey);

// For keypairs.
fromWeb3JsKeypair(myWeb3JsKeypair);
toWeb3JsKeypair(myUmiKeypair);

// For transactions.
fromWeb3JsTransaction(myWeb3JsTransaction);
toWeb3JsTransaction(myUmiTransaction);
fromWeb3JsLegacyTransaction(myLegacyWeb3JsTransaction);
toWeb3JsLegacyTransaction(myUmiTransaction);

// For transaction messages.
fromWeb3JsMessage(myWeb3JsTransactionMessage);
toWeb3JsMessage(myUmiTransactionMessage);
toWeb3JsMessageFromInput(myUmiTransactionInput);

// For instructions.
fromWeb3JsInstruction(myWeb3JsInstruction);
toWeb3JsInstruction(myUmiInstruction);
```

Let's take a look at an example. Say you want to issue a vanilla token using the `@identity.com/solana-gateway-ts` library which relies on `@solana/web3.js`. It offers an `issueVanilla` function that creates an instruction but this isn't compatible with Umi.

To go around this, you could create a wrapper function that converts the `issueVanilla` function into a Umi-compatible one. Precisely, this means we need to convert the returned instruction using `fromWeb3JsInstruction` and convert any public key passed into the function using `toWeb3JsPublicKey`.

```ts
import { issueVanilla as baseIssueVanilla } from '@identity.com/solana-gateway-ts';
import { fromWeb3JsInstruction, toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';

export const issueVanilla = (
  gatewayTokenAccount: PublicKey,
  payer: Signer,
  gatekeeperAccount: PublicKey,
  owner: PublicKey,
  gatekeeperAuthority: Signer,
  gatekeeperNetwork: PublicKey,
) => transactionBuilder([{
  instruction: fromWeb3JsInstruction(
    baseIssueVanilla(
      toWeb3JsPublicKey(gatewayTokenAccount),
      toWeb3JsPublicKey(payer.publicKey),
      toWeb3JsPublicKey(gatekeeperAccount),
      toWeb3JsPublicKey(owner),
      toWeb3JsPublicKey(gatekeeperAuthority.publicKey),
      toWeb3JsPublicKey(gatekeeperNetwork),
    )
  ),
  signers: [payer, gatekeeperAuthority],
  bytesCreatedOnChain: 0,
}])
```
