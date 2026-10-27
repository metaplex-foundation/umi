// Filesystem fallback for resolvers that do not honor package.json "exports"
// (e.g. older Jest, Metro without package-exports enabled).
// See: https://github.com/metaplex-foundation/umi/issues/175
// See: https://github.com/metaplex-foundation/umi/issues/94
export * from './dist/esm/serializers.mjs';
