# Umi Bundler Test Sites

This directory contains test websites to verify that the `@metaplex-foundation/umi-uploader-irys` package works correctly with different JavaScript bundlers.

## Purpose

The Irys uploader uses dynamic imports with `eval()` to prevent bundlers from including Node.js-specific packages (`@irys/upload` and `@irys/upload-solana`) in browser builds. These test sites verify that:

1. The dynamic imports work correctly
2. The bundler properly excludes Node.js modules from browser builds
3. The browser version uses the correct web-specific packages (`@irys/web-upload` and `@irys/web-upload-solana`)

## Test Sites

### 1. Vite Test Site (`/vite`)

Tests the Irys uploader with Vite bundler.

**Run the test:**
```bash
cd www/vite
pnpm dev
```

Then open http://localhost:5173 in your browser and click "Test Irys Uploader".

**Build test:**
```bash
cd www/vite
pnpm build
pnpm preview
```

### 2. Webpack Test Site (`/webpack`)

Tests the Irys uploader with Webpack 5 bundler.

**Run the test:**
```bash
cd www/webpack
pnpm dev
```

Then open http://localhost:9000 in your browser and click "Test Irys Uploader".

**Build test:**
```bash
cd www/webpack
pnpm build
```

### 3. Next.js Test Site (`/nextjs`)

_Coming soon - directory exists but needs setup_

## What Each Test Does

Each test site performs the same verification steps:

1. ✓ Imports umi-bundle-defaults
2. ✓ Imports umi-uploader-irys
3. ✓ Creates a Umi instance
4. ✓ Generates a test signer
5. ✓ Installs the Irys uploader plugin
6. ✓ Verifies the uploader interface is available
7. ✓ Checks for Irys-specific methods

If all checks pass, you'll see: **"🎉 SUCCESS: All tests passed! The Irys uploader loaded correctly in [bundler name]."**

## Known Issues & Fixes

### The Problem

The Irys uploader needs to work in both Node.js and browser environments:
- **Node.js**: Uses `@irys/upload` and `@irys/upload-solana`
- **Browser**: Uses `@irys/web-upload` and `@irys/web-upload-solana`

Bundlers like Vite and Webpack try to statically analyze all imports and include them in the browser bundle. This causes issues because the Node.js packages can't run in the browser.

### The Solution

In `packages/umi-uploader-irys/src/createIrysUploader.ts` (lines 310-314), we use dynamic imports with `eval()`:

```typescript
const bPackage = _removeDoubleDefault(await (0, eval)('import("@irys/upload")'));
const cPackage = _removeDoubleDefault(await (0, eval)('import("@irys/upload-solana")'));
```

This prevents bundlers from:
1. Statically analyzing the import
2. Including the Node.js packages in the browser bundle
3. Attempting to resolve Node.js-specific dependencies

The runtime code detects the environment (lines 283-285) and only loads the Node.js packages when actually running in Node.js.

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors during build**
   - Make sure you've run `pnpm build` from the monorepo root first
   - The workspace packages need to be built before the test sites can use them

2. **"globalThis.Buffer is not defined" errors**
   - The Buffer polyfill should be configured in both bundlers
   - Check that `vite.config.ts` or `webpack.config.js` includes the proper polyfills

3. **Test fails with import errors**
   - Check the browser console for detailed error messages
   - Verify that the bundler configuration properly handles the dynamic imports

### Verifying the Fix

To verify the eval fix is working:

1. **Check the bundled output** - Node.js packages should NOT appear in the browser bundle
2. **Test in development mode** - The uploader should initialize without errors
3. **Test in production build** - The built bundle should work the same way

## Development Notes

- All test sites use workspace dependencies (`workspace:*`) to test the local packages
- Changes to umi packages require running `pnpm build` in the monorepo root
- The test sites share similar code to ensure consistent testing across bundlers
- Each bundler may require different configuration for Node.js polyfills
