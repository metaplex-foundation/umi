import type { Umi } from './Umi';

export type UmiPlugin = {
  install(umi: Umi): void;
};
