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
  plugins: [
    typescript(),
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
  ],
  external: [
    '@metaplex-foundation/umi',
    '@metaplex-foundation/umi-web3js-adapters',
    '@metaplex-foundation/umi-public-keys',
    '@metaplex-foundation/umi-serializers',
    '@metaplex-foundation/umi-serializers-core',
    '@metaplex-foundation/umi-serializers-encodings',
    '@solana-mobile/mobile-wallet-adapter-protocol',
    '@solana-mobile/mobile-wallet-adapter-protocol-web3js',
    '@solana/web3.js',
    'js-base64',
    'bs58',
  ],
}; 