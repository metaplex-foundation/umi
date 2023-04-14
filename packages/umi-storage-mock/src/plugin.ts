import { UmiPlugin } from '@metaplex-foundation/umi';
import { createMockStorage, MockStorageOptions } from './createMockStorage';

export const mockStorage = (options?: MockStorageOptions): UmiPlugin => ({
  install(umi) {
    const mockStorage = createMockStorage(options);
    umi.uploader = mockStorage;
    umi.downloader = mockStorage;
  },
});
