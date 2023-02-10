import { Context, createNullContext } from './Context';
import type { MetaplexPlugin } from './MetaplexPlugin';

export interface Metaplex extends Context {
  use(plugin: MetaplexPlugin): Metaplex;
}

export const createMetaplex = (): Metaplex => ({
  ...createNullContext(),
  use(plugin: MetaplexPlugin) {
    plugin.install(this);
    return this;
  },
});
