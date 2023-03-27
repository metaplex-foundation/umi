# Registering programs

In order to create clients that interact with Solana programs, it is important to know which programs are available within your cluster and at which address. Umi offers a `ProgramRepositoryInterface` that acts as one big registry of programs for you client.

This also allows us to:
- Register programs from other libraries.
- Register our own programs and override existing ones.
- Fetch programs by name or public key in our current cluster or a specific one.
- Resolve program errors by name or code.

## Defining Programs

Umi provides a `Program` type that represents a Solana program. It contains the program's name, public key, and some functions that can be used to resolve its errors and which cluster it has been deployed to.

```ts
export type Program = {
  name: string;
  publicKey: PublicKey;
  getErrorFromCode: (code: number, cause?: Error) => ProgramError | null;
  getErrorFromName: (name: string, cause?: Error) => ProgramError | null;
  isOnCluster: (cluster: Cluster) => boolean;
};
```

You can [learn more about the attributes of the `Program` type via its API reference](https://umi-docs.vercel.app/types/umi.Program.html) but note that the `name` attribute should be unique and, by convention, should be use the camelCase format. To avoid conflict with other organizations, it is recommended to prefix the program name with a namespace that is unique to your organization. For instance, Metaplex programs are prefixed with `mpl` like so: `mplTokenMetadata` or `mplCandyMachine`.

## Adding Programs

_Coming soon..._

## Fetching Programs

_Coming soon..._
