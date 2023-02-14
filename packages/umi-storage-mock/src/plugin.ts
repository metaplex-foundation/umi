import { UmiPlugin } from '@metaplex-foundation/umi-core';
import { MockStorage, MockStorageOptions } from './MockStorage';

export const mockStorage = (options?: MockStorageOptions): UmiPlugin => ({
  install(umi) {
    const mockStorage = new MockStorage(options);
    umi.uploader = mockStorage;
    umi.downloader = mockStorage;
  },
});
