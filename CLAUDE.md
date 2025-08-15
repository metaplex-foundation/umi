# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Umi is a modular JavaScript framework for building Solana clients. It uses a zero-dependency core library that defines interfaces, with pluggable implementations provided via packages. The repository is a monorepo managed with pnpm workspaces and Turbo for build orchestration.

## Common Commands

### Development Commands

- `pnpm build` - Build all packages using Turbo
- `pnpm test` - Run tests for all packages
- `pnpm lint` - Lint all packages with ESLint
- `pnpm lint:fix` - Fix linting issues automatically
- `pnpm format` - Check code formatting with Prettier
- `pnpm format:fix` - Fix formatting issues automatically

### Package Management  

- `pnpm packages:new` - Generate a new package from template
- `pnpm packages:change` - Create a changeset for versioning
- `pnpm packages:version` - Version packages using changesets
- `pnpm packages:publish` - Build and publish packages

### Testing & Development

- `pnpm validator` - Start local Solana validator with Amman
- `pnpm validator:stop` - Stop the local validator
- Run single package tests: `cd packages/[package-name] && pnpm test`

## Architecture

### Core Design Philosophy

- **Interface-based**: Core package (`umi`) defines TypeScript interfaces
- **Plugin architecture**: Functionality added via plugins that implement interfaces  
- **Zero dependencies**: Core library has no external dependencies
- **Modular implementations**: Choose specific implementations per interface

### Key Interfaces & Components

**Core Interfaces** (defined in `packages/umi/src/`):

- `Umi` - Main context object that holds all interfaces
- `Context` - Base interfaces container (RPC, HTTP, Eddsa, etc.)
- `RpcInterface` - Solana RPC operations
- `EddsaInterface` - Cryptographic signing
- `HttpInterface` - HTTP requests
- `UploaderInterface` - Asset uploading
- `DownloaderInterface` - Asset downloading
- `SerializerInterface` - Data serialization
- `TransactionFactoryInterface` - Transaction creation

**Plugin System**:

- Plugins implement `UmiPlugin` interface with `install(umi: Umi)` method
- Use `umi.use(plugin)` to install plugins
- Default bundle: `@metaplex-foundation/umi-bundle-defaults`

### Package Categories

**Core Packages**:

- `umi` - Core interfaces and types
- `umi-bundle-defaults` - Default plugin bundle for quick setup
- `umi-bundle-tests` - Testing utilities

**Interface Implementations**:

- `umi-rpc-web3js` - RPC using @solana/web3.js  
- `umi-eddsa-web3js` - Signing using @solana/web3.js
- `umi-http-fetch` - HTTP using browser fetch API
- `umi-serializer-*` - Various serialization implementations

**Utilities**:

- `umi-public-keys` - PublicKey utilities
- `umi-options` - Option/null type utilities  
- `umi-web3js-adapters` - Adapt between Umi and web3.js types

**Storage/Upload**:

- `umi-uploader-*` - Various storage providers (AWS, Arweave, IPFS, etc.)
- `umi-storage-mock` - Mock storage for testing

## Development Patterns

### Creating Umi Instance

```typescript
// Default setup (recommended)
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
const umi = createUmi('https://api.mainnet-beta.solana.com');

// Custom setup
import { createBaseUmi } from '@metaplex-foundation/umi';
const umi = createBaseUmi().use(customPlugins());
```

### Package Structure

Each package follows consistent structure:

- `src/index.ts` - Main exports
- `src/plugin.ts` - Plugin factory function (if applicable)
- `test/` - Tests (uses AVA testing framework)
- Standard build config: Rollup, Babel, TypeScript

### Testing

- Uses AVA test runner (`ava` in package.json scripts)
- Test files: `*.test.ts` in `test/` directories
- Common test setup in `test/_setup.ts` files
- Mock implementations available (e.g., `umi-storage-mock`)

### Serialization

- Multiple serializer implementations available:
  - `umi-serializers` - Pure TypeScript implementation  
  - `umi-serializer-beet` - Uses Beet library
  - `umi-serializer-data-view` - Uses DataView API
- Number types: Support for various integer sizes (u8, u16, u32, u64, i8, etc.)
- Complex types: Arrays, structs, enums, options, tuples

## Code Style & Standards

### ESLint Configuration

- Extends: `airbnb-base`, `airbnb-typescript/base`, `prettier`
- Uses Prettier for formatting
- Disabled rules: `@typescript-eslint/no-use-before-define`, `import/prefer-default-export`

### TypeScript

- Strict TypeScript configuration
- Interface-first design
- Export individual functions/classes (avoid default exports)
- Comprehensive type definitions for all APIs

### Error Handling  

- Custom error classes extending `UmiError`
- Error types in `src/errors/` directories
- Context-rich error messages with error codes

## Monorepo Management

### Package Generation

- Use `pnpm packages:new` to create new packages
- Template located in `configs/new-package-template/`
- Automatically sets up standard structure and build config

### Changesets & Publishing

- Uses Changesets for version management
- `pnpm packages:change` to document changes
- Automated publishing workflow available

### Build System

- Turbo for orchestrated builds across packages
- Individual packages use Rollup for bundling
- CommonJS and ES modules support
- Browser and Node.js compatibility
