import { Context, createNullContext } from './Context';
import type { UmiPlugin } from './UmiPlugin';

/**
 * TODO
 *
 * @category Interfaces
 */
export interface Umi extends Context {
  use(plugin: UmiPlugin): Umi;
}

/**
 * TODO
 *
 * @category Interfaces
 */
export const createUmi = (): Umi => ({
  ...createNullContext(),
  use(plugin: UmiPlugin) {
    plugin.install(this);
    return this;
  },
});
