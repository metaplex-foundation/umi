# Generating Umi clients via Kinobi

The Umi framework provides the basis for building Solana clients in JavaScript. It becomes a lot more powerful when programs offer Umi-compatible libraries as it allows end-users to simply plug their Umi instance to whichever helper functions they provide. In order to simplify and automate the process of creating Umi-compatible libraries, Umi provides a powerful code generator called Kinobi.

[Kinobi](https://github.com/metaplex-foundation/kinobi) introduces a language-agnostic representation of Solana clients which can be composed of one or several programs. It does this by using a tree of nodes that can be visited by `Visitor` classes. Visitors can be used to update any aspect of the tree allowing developers to tailor the client to their needs. Once the tree is to the developer's liking, language-specific visitors can be used to generate the code for the target language or framework.

The good news is Kinobi ships with a `RenderJavaScriptVisitor` that generates Umi-compatible libraries for us.

Here's a quick overview of how to use Kinobi and Umi to create JavaScript clients for Solana programs. Note that [you might be interested in this thread](https://twitter.com/lorismatic/status/1637890024992833536) that goes through this diagram step by step.

![](https://pbs.twimg.com/media/Frr0StQaIAAc16a?format=jpg&name=4096x4096)

## Getting started with Kinobi

TODO

## Features of Kinobi-generated clients

TODO

### Types and serializers

TODO

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
