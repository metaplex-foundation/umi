import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/cjs/index.cjs',
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: 'dist/esm/index.mjs',
      format: 'es',
      sourcemap: true,
    },
  ],
  plugins: [typescript(), nodeResolve()],
  external: [
    '@metaplex-foundation/umi',
    '@metaplex-foundation/umi-downloader-http',
    '@metaplex-foundation/umi-eddsa-web3js',
    '@metaplex-foundation/umi-http-fetch',
    '@metaplex-foundation/umi-mobile',
    '@metaplex-foundation/umi-program-repository',
    '@metaplex-foundation/umi-rpc-chunk-get-accounts',
    '@metaplex-foundation/umi-rpc-web3js',
    '@metaplex-foundation/umi-serializer-data-view',
    '@metaplex-foundation/umi-transaction-factory-web3js',
    '@solana/web3.js',
    'react-native',
    'react-native-get-random-values'
  ],
}; 