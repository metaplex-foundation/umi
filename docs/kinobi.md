# Generating Umi clients via Kinobi

The Umi framework provides the basis for building Solana clients in JavaScript. It becomes a lot more powerful when programs offer Umi-compatible libraries as it allows end-users to simply plug their Umi instance into whichever helper functions they provide. To simplify and automate the process of creating Umi-compatible libraries, Umi provides a powerful code generator called Kinobi.

[Kinobi](https://github.com/metaplex-foundation/kinobi) introduces a language-agnostic representation of Solana clients which can be composed of one or several programs. It does this by using a tree of nodes that can be visited by `Visitor` classes. Visitors can be used to update any aspect of the tree allowing developers to tailor the client to their needs. Once the tree is to the developer's liking, language-specific visitors can be used to generate the code for the target language or framework.

The good news is Kinobi ships with a `RenderJavaScriptVisitor` that generates Umi-compatible libraries for us.

Here's a quick overview of how to use Kinobi and Umi to create JavaScript clients for Solana programs. Note that [you might be interested in this thread](https://twitter.com/lorismatic/status/1637890024992833536) that goes through this diagram step by step.

![](https://pbs.twimg.com/media/Frr0StQaIAAc16a?format=jpg&name=4096x4096)

## Getting started with Kinobi

You may want to check the [Kinobi documentation](https://github.com/metaplex-foundation/kinobi) for more details but here's a quick overview of how to get started with Kinobi.

First, you need to install Kinobi:

```sh
npm install @metaplex-foundation/kinobi
```

Then, you need to create a JavaScript file — e.g. `kinobi.js` — that creates and renders a Kinobi tree. This is done by creating a `Kinobi` instance and passing it an array of paths to IDL files. You may want to check the [Shank JS library](https://github.com/metaplex-foundation/shank-js) to generate your IDL files. You can then use visitors to update the tree and render it as a Umi-compatible library via the `RenderJavaScriptVisitor`. Here's an example.

```ts
import { Kinobi, RenderJavaScriptVisitor } from "@metaplex-foundation/kinobi";

// Instanciate Kinobi.
const kinobi = new Kinobi([
  path.join(__dirname, "idls", "my_idl.json"),
  path.join(__dirname, "idls", "my_other_idl.json"),
]);

// Update the Kinobi tree using visitors...

// Render JavaScript.
const jsDir = path.join(__dirname, "clients", "js", "src", "generated");
kinobi.accept(new RenderJavaScriptVisitor(jsDir));
```

Now, all you need to do is run this file with Node.js like so.

```sh
node ./kinobi.js
```

The first time you are generating your JS client, make sure to prepare the library as needed. You'll need to at least create its `package.json` file, install its dependencies and provide a top-level `index.ts` file that imports the generated folder.

## Features of Kinobi-generated clients

Now that we know how to generate Umi-compatible libraries via Kinobi, let's take a look at what they can do.

### Types and serializers

Kinobi-generated libraries provide a serializer for each type, account and instruction defined on the program. It also exports the two TypeScript types required to create the serializer — i.e. its `From` and `To` type parameters. It will suffix the `From` type with `Args` to distinguish the two. For instance, if you have a `MyType` type defined in your IDL, you can use the following code to serialize and deserialize it.

```ts
const serializer: Serializer<MyTypeArgs, MyType> = getMyTypeSerializer(umi);
serializer.serialize(myType);
serializer.deserialize(myBuffer);
```

For instructions, the name of the type is suffixed with `InstructionData` and, for accounts, it is suffixed with `AccountData`. This allows the unsuffixed account name to be used as an `Account<T>` type. For example, if you have a `Token` account and a `Transfer` instruction on your program, you will get the following types and serializers.

```ts
// For accounts.
type Token = Account<TokenAccountData>;
type TokenAccountData = {...};
type TokenAccountDataArgs = {...};
const tokenDataSerializer = getTokenAccountDataSerializer(umi);

// For instructions.
type TransferInstructionData = {...};
type TransferInstructionDataArgs = {...};
const transferDataSerializer = getTransferInstructionDataSerializer(umi);
```

### Data enum helpers

If a generated type is identified as a [data enum](./serializers.md#data-enums), additional helper methods will be created to help improve the developer experience. For instance, say you have the following data enum type generated.

```ts
type Message = 
  | { __kind: 'Quit' } // Empty variant.
  | { __kind: 'Write'; fields: [string] } // Tuple variant.
  | { __kind: 'Move'; x: number; y: number }; // Struct variant.
```

Then, on top of generating the types and `getMessageSerializer` function, it will also generate a `message` and `isMessage` function that can be used to create a new data enum and check the type of its variant respectively.

```ts
message('Quit'); // -> { __kind: 'Quit' }
message('Write', ['Hi']); // -> { __kind: 'Write', fields: ['Hi'] }
message('Move', { x: 5, y: 6 }); // -> { __kind: 'Move', x: 5, y: 6 }
isMessage('Quit', message('Quit')); // -> true
isMessage('Write', message('Quit')); // -> false
```

### Account helpers

Kinobi will also provide additional helper methods for accounts, providing us with an easy way to fetch and deserialize them. Assuming the account name is `Metadata` here are the additional helper methods available to you.

```ts
// Deserialize a raw account into a parsed account.
deserializeMetadata(umi, rawAccount); // -> Metadata

// Fetch an deserialized account from its public key.
await fetchMetadata(umi, publicKey); // -> Metadata or fail
await safeFetchMetadata(umi, publicKey); // -> Metadata or null

// Fetch all deserialized accounts by public key.
await fetchAllMetadata(umi, publicKeys); // -> Metadata[], fails if any account is missing
await safeFetchAllMetadata(umi, publicKeys) // -> Metadata[], filters out missing accounts

// Create a getProgramAccount builder for the account.
await getMetadataGpaBuilder()
  .whereField('updateAuthority', updateAuthority)
  .selectField('mint')
  .getDataAsPublicKeys() // -> PublicKey[]

// Get the size of the account data in bytes, if it has a fixed size.
getMetadataSize() // -> number

// Find the PDA address of the account from its seeds.
findMetadataPda(umi, seeds) // -> Pda
```

You may want to check the [documentation on `GpaBuilder`s](./helpers.md#gpabuilders) to learn more about what they can do.

### Transaction builders

Each generated instruction will also have its own function that can be used to create a transaction builder containing the instruction. For instance, if you have a `Transfer` instruction, it will generate a `transfer` function returning a `TransactionBuilder`.

```ts
await transfer(umi, { from, to, amount }).sendAndConfirm();
```

Because transaction builders can be combined together, this allows us to easily create transactions that contain multiple instructions like so.

```ts
await transfer(umi, { from, to: destinationA, amount })
  .add(transfer(umi, { from, to: destinationB, amount }))
  .add(transfer(umi, { from, to: destinationC, amount }))
  .sendAndConfirm();
```

### Errors and programs

Kinobi will also generate a function that returns a `Program` type for each program defined in the client as well as some helpers to access them. For instance, say your client defines a `MplTokenMetadata` program, then the following helpers will be generated.

```ts
// The program's public key as a constant variable.
MPL_TOKEN_METADATA_PROGRAM_ID; // -> PublicKey

// Create a program object that can be registered in the program repository.
createMplTokenMetadataProgram(); // -> Program

// Get the program object from the program repository.
getMplTokenMetadataProgram(umi); // -> Program

// Get the program's public key from the program repository.
getMplTokenMetadataProgramId(umi); // -> PublicKey
```

Note that Kinobi does not auto-generate a Umi plugin for your client allowing you to customize it however you want. That means you'll need to create a plugin yourself and, at the very least, register the programs defined by your client. Here's an example using the `MplTokenMetadata` program.

```ts
export const mplTokenMetadata = (): UmiPlugin => ({
  install(umi) {
    umi.programs.add(createMplTokenMetadataProgram(), false);
  },
});
```

Additionally, each program generates a custom `ProgramError` for each error it may throw. For instance, if your program defines a `UpdateAuthorityIncorrect` error, it will generate the following class.

```ts
export class UpdateAuthorityIncorrectError extends ProgramError {
  readonly name: string = 'UpdateAuthorityIncorrect';

  readonly code: number = 0x7; // 7

  constructor(program: Program, cause?: Error) {
    super('Update Authority given does not match', program, cause);
  }
}
```

Each generated error is also registered in a `codeToErrorMap` and a `nameToErrorMap` allowing the library to provide two helper methods that can find any error class from its name or code.

```ts
getMplTokenMetadataErrorFromCode(0x7, program); // -> UpdateAuthorityIncorrectError
getMplTokenMetadataErrorFromName('UpdateAuthorityIncorrect', program); // -> UpdateAuthorityIncorrectError
```

Note that these methods are used by the `createMplTokenMetadataProgram` function to fill the `getErrorFromCode` and `getErrorFromName` functions of the `Program` object.

<p align="center">
<strong>Next: <a href="./helpers.md">Umi helpers ≫</a></strong>
</p>
