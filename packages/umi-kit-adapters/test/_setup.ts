import { webcrypto } from 'crypto';

if (!globalThis.crypto) {
    // @ts-expect-error: Node.js webcrypto assignment for test polyfill
    globalThis.crypto = webcrypto;
} 