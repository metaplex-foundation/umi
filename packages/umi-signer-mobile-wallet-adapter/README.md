Generated with AI to see how well it could document the package, will be old and outdated!

# UMI Signer Mobile Wallet Adapter

This package provides a UMI signer implementation for the Solana Mobile Wallet Adapter, allowing you to use mobile wallets with UMI in React Native applications.

## Installation

```sh
npm install @metaplex-foundation/umi-signer-mobile-wallet-adapter
```

## Usage

First, ensure you have the required dependencies:
```sh
npm install @metaplex-foundation/umi-mobile-defaults react-native-get-random-values
```

Then use it in your code:
```typescript
import 'react-native-get-random-values'; // Import this first
import { createUmiMobile } from '@metaplex-foundation/umi-mobile-defaults';
import { createSignerFromMobileWallet } from '@metaplex-foundation/umi-signer-mobile-wallet-adapter';

// Create a UMI instance with mobile defaults and mobile wallet adapter
const umi = createUmiMobile('https://api.devnet.solana.com')
  .use(createSignerFromMobileWallet({
    appIdentity: {
      name: 'My Solana App',
      uri: 'https://myapp.com',
      icon: 'https://myapp.com/icon.png',
    },
    cluster: { name: 'devnet' }, // or { name: 'mainnet-beta' }
  }));

// The signer will automatically handle:
// - Wallet authorization
// - Message signing
// - Transaction signing
// - Authorization caching

// Example: Sign a message
const message = new TextEncoder().encode('Hello from Solana!');
const signature = await umi.identity.signMessage(message);

// Example: Sign a transaction
const transaction = await umi.transactions.create({
  // ... transaction instructions
});
const signedTransaction = await umi.identity.signTransaction(transaction);
```

## Features

- Implements UMI's Signer interface for mobile wallet adapter
- Automatic wallet authorization handling
- Support for message signing
- Support for transaction signing (single and batch)
- Authorization token caching
- Proper error handling with custom error types

## Error Handling

The package provides custom error types for better error handling:

```typescript
import { UninitializedMobileWalletError, MobileWalletSigningError } from '@metaplex-foundation/umi-signer-mobile-wallet-adapter';

try {
  await umi.identity.signMessage(message);
} catch (error) {
  if (error instanceof UninitializedMobileWalletError) {
    // Handle wallet not connected
  } else if (error instanceof MobileWalletSigningError) {
    // Handle signing error
  }
}
```

## Configuration

The signer accepts the following configuration options:

```typescript
import type { Chain } from '@solana-mobile/mobile-wallet-adapter-protocol';

type MobileWalletAdapterConfig = {
  appIdentity?: {
    uri?: string;
    icon?: string;
    name?: string;
  };
  authorizationResultCache?: {
    key: string;
    expiry: number;
  };
  cluster?: Chain; // e.g. { name: 'devnet' } or { name: 'mainnet-beta' }
};
```

## Contributing

Contributions are welcome! Please read our contributing guidelines for details.

## License

MIT License 