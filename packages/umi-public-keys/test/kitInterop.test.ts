import test from 'ava';
import { address, type Address } from '@solana/addresses';
import { type PublicKey, defaultPublicKey, publicKey } from '../src';

/**
 * These tests enforce the structural compatibility contract between
 * Umi's `PublicKey` and Kit's `Address` documented in `src/common.ts`.
 * They are compiled with `tsc` as part of `pnpm build`, so a Kit
 * update that changes the nominal-type scheme fails the build here
 * rather than in downstream projects.
 */

test('a umi public key is assignable to a kit address', (t) => {
  const umiPublicKey = publicKey('4HM9LW2rm3SR2ZdBiFK3D21ENmQWpqEJEhx1nfgcC3r9');
  const kitAddress: Address = umiPublicKey;
  t.is(kitAddress, umiPublicKey);
});

test('a kit address is assignable to a umi public key', (t) => {
  const kitAddress = address('4HM9LW2rm3SR2ZdBiFK3D21ENmQWpqEJEhx1nfgcC3r9');
  const umiPublicKey: PublicKey = kitAddress;
  t.is(umiPublicKey, kitAddress);
});

test('assignability is preserved for literal address types', (t) => {
  const umiPublicKey = defaultPublicKey();
  const kitAddress: Address<'11111111111111111111111111111111'> = umiPublicKey;
  const roundTripped: PublicKey<'11111111111111111111111111111111'> =
    kitAddress;
  t.is(roundTripped, umiPublicKey);
});

test('a kit address is accepted by the publicKey helper', (t) => {
  const kitAddress = address('4HM9LW2rm3SR2ZdBiFK3D21ENmQWpqEJEhx1nfgcC3r9');
  t.is(publicKey(kitAddress), kitAddress);
});

test('plain strings still fail to satisfy either branded type', (t) => {
  const plainString = '4HM9LW2rm3SR2ZdBiFK3D21ENmQWpqEJEhx1nfgcC3r9';
  // @ts-expect-error A plain string must not satisfy Umi's PublicKey.
  const umiPublicKey: PublicKey = plainString;
  // @ts-expect-error A plain string must not satisfy Kit's Address.
  const kitAddress: Address = plainString;
  t.is(umiPublicKey, kitAddress);
});
