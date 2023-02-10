import { MetaplexPlugin } from '@metaplex-foundation/umi-core';
import { MockStorage, MockStorageOptions } from './MockStorage';

export const mockStorage = (options?: MockStorageOptions): MetaplexPlugin => ({
  install(metaplex) {
    const mockStorage = new MockStorage(options);
    metaplex.uploader = mockStorage;
    metaplex.downloader = mockStorage;
  },
});
