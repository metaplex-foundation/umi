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

To register a new program to the program repository, you may use the `add` method of the `ProgramRepositoryInterface` like so.

```ts
umi.programs.add(myProgram);
```

If this program already exists in the repository — i.e. it has the same name or public key for at least one conflicting cluster — it will be overridden by the newly added program. To change this behavior, you may set the second argument `override` to `false`. In the example below, this program will only the retrieved if no other registered program matches the user's query.

```ts
umi.programs.add(myProgram, false);
```

## Fetching Programs

Once a program is registered, you may fetch it by its name or public key via the `get` method. This will return the program if it exists in the repository. Otherwise, it will throw an error.

```ts
// Fetch a program by its name.
const myProgram = umi.programs.get('myProgram');

// Fetch a program by its public key.
const myProgram = umi.programs.get(publicKey('...'));
```

By default, the `get` method will only return programs that are deployed to the current cluster — such that the `isOnCluster` method returns `true` for the current cluster. It is only possible to specify a different cluster via the second argument that accepts a [`ClusterFilter`](https://umi-docs.vercel.app/types/umi.ClusterFilter.html).

A `ClusterFilter` can either be an explicit [`Cluster`](https://umi-docs.vercel.app/types/umi.Cluster.html), `"current"` to select the current cluster, or `"all"` to select programs that are deployed to any cluster.

```ts
// Fetch a program on the current cluster.
umi.programs.get('myProgram');
umi.programs.get('myProgram', 'current');

// Fetch a program on a specific cluster.
umi.programs.get('myProgram', 'mainnet-beta');
umi.programs.get('myProgram', 'devnet');

// Fetch a program on any cluster.
umi.programs.get('myProgram', 'all');
```

It is also worth noting that the `get` method is generic and can return a superset of the `Program` type. For instance, say you have a `CandyGuardProgram` type that extends the `Program` type in order to store the `availableGuards` on that program. Then, if you know that the program you are fetching should be of that type, you may tell the `get` method by setting its type parameter to `CandyGuardProgram`.

```ts
umi.programs.get<CandyGuardProgram>('mplCandyGuard');
```

Additionally, the `ProgramRepositoryInterface` provides a `has` method that can be used to check if a program exists in the repository and a `all` method to retrieve all programs in the repository. Both of these methods accept the same `ClusterFilter` argument as the `get` method.

```ts
// Check if a program exists in the repository.
umi.programs.has('myProgram');
umi.programs.has(publicKey('...'));
umi.programs.has('myProgram', 'mainnet-beta');
umi.programs.has('myProgram', 'all');

// Retrieve all programs in the repository.
umi.programs.all();
umi.programs.all('mainnet-beta');
umi.programs.all('all');
```

Finally, since fetching the public key of a program is a common operation, the `ProgramRepositoryInterface` provides a `getPublicKey` method that can be used to fetch a program's public key directly. A `fallback` public key can be provided to avoid throwing an error if the program does not exist in the repository and return the given public key instead.

```ts
// Get the public key of a program.
umi.programs.getPublicKey('myProgram');

// Get the public key of a program with a fallback.
const fallback = publicKey('...');
umi.programs.getPublicKey('myProgram', fallback);

// Get the public key of a program on a specific cluster.
umi.programs.getPublicKey('myProgram', fallback, 'mainnet-beta');
```

## Resolving program errors

The `ProgramRepositoryInterface` provides a `resolveError` method that can be used to resolve a custom program error from a transaction error. This method accepts any `Error` with a `logs` attribute and the `Transaction` instance that originated this error. It then returns an instance of `ProgramError` if a custom program error was identified from the error logs. Otherwise, it returns `null`.

```ts
umi.programs.resolveError(error, transaction);
```
