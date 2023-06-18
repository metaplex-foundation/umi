import { createConfigs } from '../../rollup.config';
import pkg from './package.json';

export default [
  ...createConfigs({
    pkg,
    builds: [
      {
        dir: 'dist/esm',
        format: 'es',
      },
      {
        dir: 'dist/cjs',
        format: 'cjs',
      },
    ],
  }),
  ...createConfigs({
    input: ['src/serializers.ts'],
    dependenciesToExcludeInBundle: ['@metaplex-foundation/umi-serializers'],
    pkg,
    builds: [
      {
        file: 'dist/esm/serializers.mjs',
        bundle: true,
        format: 'es',
      },
      {
        file: 'dist/cjs/serializers.cjs',
        bundle: true,
        format: 'cjs',
      },
    ],
  }),
];
