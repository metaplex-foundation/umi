import { Context, createNullContext } from './Context';
import type { UmiPlugin } from './UmiPlugin';

export interface Umi extends Context {
  use(plugin: UmiPlugin): Umi;
}

export const createUmi = (): Umi => ({
  ...createNullContext(),
  use(plugin: UmiPlugin) {
    plugin.install(this);
    return this;
  },
});
