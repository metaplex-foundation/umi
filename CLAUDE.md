# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Umi is a modular framework for building JavaScript clients for Solana programs by Metaplex Foundation. It provides zero-dependency core interfaces with pluggable implementations, allowing developers to choose the implementations that best suit their needs.

## Development Commands

### Essential Commands

```bash
# Install dependencies (uses pnpm v8.15.9)
pnpm install

# Build all packages
pnpm build

# Build specific package
pnpm --filter @metaplex-foundation/umi-serializers build

# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @metaplex-foundation/umi test

# Lint all packages
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format check
pnpm format

# Format fix
pnpm format:fix

# Start local Solana validator (for integration tests)
pnpm validator

# Stop local validator
pnpm validator:stop

# Generate new package from template
pnpm packages:new

# Create changeset for version management
pnpm packages:change

# Build documentation
pnpm build:docs
```

### Testing Individual Files

```bash
# Run specific test file in a package
cd packages/[package-name]
npx ava test/[test-file].test.ts

# Run tests with pattern matching
npx ava test/*serializer*.test.ts
```

## Architecture & Structure

### Core Design Principles

1. **Interface-Driven Architecture**: All functionality is defined through interfaces in the core `umi` package, with implementations provided by separate packages
2. **Plugin System**: Functionality is extended through plugins that implement the `UmiPlugin` interface
3. **Context Pattern**: All operations go through a central `Context` object that holds all interface implementations
4. **Zero Core Dependencies**: The main package has no external dependencies, only workspace dependencies

### Package Organization

```
packages/
├── umi/                        # Core interfaces and types
├── umi-bundle-defaults/        # Default plugin bundle with Web3.js
├── umi-bundle-tests/           # Testing utilities bundle
├── umi-serializers*/           # Serialization packages (multiple strategies)
├── umi-rpc-*/                  # RPC implementations
├── umi-signer-*/               # Signer implementations
├── umi-uploader-*/             # Storage uploader implementations
└── umi-*-adapters/             # Adapter packages for integrations
```

### Key Interfaces

The core `Context` interface contains:
- `downloader`: File downloading
- `eddsa`: EdDSA cryptography operations
- `http`: HTTP client
- `identity`: Current identity signer
- `payer`: Transaction fee payer
- `programs`: Program registry
- `rpc`: Solana RPC operations
- `serializer`: Data serialization
- `transactions`: Transaction building
- `uploader`: File uploading

### Working with Packages

1. **All packages follow the same structure**:
   - `src/`: Source TypeScript files
   - `test/`: AVA test files
   - `dist/`: Built output (ESM, CJS, types)

2. **Package scripts are consistent**:
   - `build`: Compile and bundle
   - `test`: Run AVA tests
   - `lint`: ESLint check
   - `clean`: Remove dist folder

3. **Workspace dependencies**: Internal packages use `workspace:^` protocol

### Transaction Building Pattern

```typescript
// Transactions use a builder pattern
const tx = transactionBuilder()
  .add(instruction1)
  .add(instruction2)
  .sendAndConfirm(umi);
```

### Plugin Pattern

```typescript
// Plugins modify the context
umi.use(pluginA())
   .use(pluginB())
   .use(pluginC());
```

## Testing Approach

- **Framework**: AVA for fast, concurrent testing
- **Location**: Tests in `test/` directory of each package
- **Pattern**: `*.test.ts` files
- **Compilation**: Tests are compiled to `dist/test/` before running
- **Validator**: Amman for local Solana validator management

## Code Conventions

1. **TypeScript strict mode** enabled
2. **ESLint with Airbnb config** for code quality
3. **File naming**: kebab-case for files, PascalCase for types/interfaces
4. **Exports**: Explicit exports from index files
5. **Error handling**: Custom error classes with context
6. **Builder pattern** for complex object construction
7. **Discriminated unions** for type-safe variants

## Monorepo Management

- **pnpm workspaces** for dependency management
- **Turbo** for orchestrated builds with caching
- **Changesets** for version management and publishing
- **Parallel execution** enabled by default

## Important Notes

- Always use `pnpm` (not npm or yarn) - version 8.15.9 is specified
- Turbo caches build outputs - use `pnpm clean` if you encounter stale builds
- Tests depend on built output - always build before testing
- Use `--filter` flag with pnpm to target specific packages
- The validator must be running for integration tests that interact with Solana