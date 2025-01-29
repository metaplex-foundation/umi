# @metaplex-foundation/umi-mobile-defaults

This package provides a convenient way to create a Umi instance with all the default plugins needed for mobile wallet adapter integration.

## Installation

```sh
npm install @metaplex-foundation/umi-mobile-defaults
```

## React Native Setup

This package is designed for React Native but requires some setup:

1. Install required polyfills for crypto functionality:
```sh
npm install react-native-get-random-values @solana/web3.js
```

2. Import the polyfill at the entry point of your app (before any other imports):
```js
import 'react-native-get-random-values';
```

## Plugin Compatibility Notes

This package includes several plugins that require specific React Native considerations:

### Core Plugins (React Native Compatible)
- `@metaplex-foundation/umi-serializer-data-view`: ✅ Uses standard DataView API
- `@metaplex-foundation/umi-http-fetch`: ✅ Uses React Native's fetch implementation
- `@metaplex-foundation/umi-mobile`: ✅ Specifically designed for React Native

### Plugins Requiring Polyfills
- `@metaplex-foundation/umi-eddsa-web3js`: Requires crypto polyfills (provided by react-native-get-random-values)
- `@metaplex-foundation/umi-transaction-factory-web3js`: Requires crypto polyfills
- `@metaplex-foundation/umi-rpc-web3js`: Requires crypto polyfills

### File System Operations
- `@metaplex-foundation/umi-downloader-http`: Uses React Native's fetch API but may need additional setup for file downloads
- File operations should use React Native's file system APIs

## Usage

```ts
import { createUmiMobile } from '@metaplex-foundation/umi-mobile-defaults';

// Create a Umi instance with default plugins using an RPC endpoint.
const umi = createUmiMobile('https://api.mainnet-beta.solana.com');

// Or create a Umi instance with an existing web3.js Connection.
import { Connection } from '@solana/web3.js';
const connection = new Connection('https://api.mainnet-beta.solana.com');
const umi = createUmiMobile(connection);

// You can also provide options to customize the mobile wallet adapter and RPC settings.
const umi = createUmiMobile('https://api.mainnet-beta.solana.com', {
  walletAdapter: {
    // Mobile wallet adapter options
  },
  rpc: {
    // RPC options
    getAccountsChunkSize: 100,
  },
});
```

## Default Plugins

This package includes the following default plugins:

- `@metaplex-foundation/umi-serializer-data-view`: For data serialization
- `@metaplex-foundation/umi-program-repository`: For program management
- `@metaplex-foundation/umi-http-fetch`: For HTTP requests
- `@metaplex-foundation/umi-downloader-http`: For downloading data
- `@metaplex-foundation/umi-eddsa-web3js`: For cryptographic operations
- `@metaplex-foundation/umi-rpc-web3js`: For RPC communication
- `@metaplex-foundation/umi-rpc-chunk-get-accounts`: For chunked account fetching
- `@metaplex-foundation/umi-transaction-factory-web3js`: For transaction creation
- `@metaplex-foundation/umi-mobile`: For mobile wallet adapter integration

## License

MIT License 