# Generating Umi clients via Kinobi

The Umi framework provides the basis for building Solana clients in JavaScript. It becomes a lot more powerful when programs offer Umi-compatible libraries as it allows end-users to simply plug their Umi instance to whichever helper functions they provide. In order to simplify and automate the process of creating Umi-compatible libraries, Umi provides a powerful code generator called Kinobi.

[Kinobi](https://github.com/metaplex-foundation/kinobi) introduces a language-agnostic representation of Solana clients which can be composed of one or several programs. It does this by using a tree of nodes that can be visited by `Visitor` classes. Visitors can be used to update any aspect of the tree allowing developers to tailor the client to their needs. Once the tree is to the developer's liking, language-specific visitors can be used to generate the code for the target language or framework.

The good news is Kinobi ships with a `RenderJavaScriptVisitor` that generates Umi-compatible libraries for us.

Here's a quick overview of how to use Kinobi and Umi to create JavaScript clients for Solana programs. Note that [you might be interested in this thread](https://twitter.com/lorismatic/status/1637890024992833536) that goes through this diagram step by step.

![](https://pbs.twimg.com/media/Frr0StQaIAAc16a?format=jpg&name=4096x4096)

## Getting started with Kinobi

You may want to check the [Kinobi documentation](https://github.com/metaplex-foundation/kinobi) for more details but here's a quick overview on how to get started with Kinobi.

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

Kinobi-generated libraries provide a serializer for each type, account and instruction defined on the program. It also exports the two TypeScript types required to create the serializer. For instance, if you have a `MyType` type defined in your IDL, you can use the following code to serialize and deserialize it.

```ts
const serializer: Serializer<MyTypeArgs, MyType> = getMyTypeSerializer(umi);
serializer.serialize(myType);
serializer.deserialize(myBuffer);
```

For instructions, the name of the type is suffixed with `InstructionData` and, for accounts, it is suffixed with `AccountData`. This allows the unsuffixed account name to be used as a `Account<T>` type. For example, if you have a `Token` account and a `Transfer` instruction on your program, you will get the following types and serializers.

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

TODO

### Fetching accounts

TODO

### Fetching program accounts

TODO

### Transaction builders

TODO

### Errors and programs

TODO
