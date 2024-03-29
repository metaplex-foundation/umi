import { createConfigs } from '../../rollup.config';
import pkg from './package.json';

export default createConfigs({
  pkg,
  additionalExternals: ['@metaplex-foundation/umi/serializers'],
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
});
