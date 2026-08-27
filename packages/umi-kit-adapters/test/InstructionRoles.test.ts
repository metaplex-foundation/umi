import { publicKey } from '@metaplex-foundation/umi';
import { AccountRole, IInstruction } from '@solana/instructions';
import test from 'ava';
import { fromKitInstruction, toKitAddress, toKitInstruction } from '../src';

const PROGRAM = publicKey('11111111111111111111111111111111');
const KEYS = [
  publicKey('4HM9LW2rm3SR2ZdBiFK3D21ENmQWpqEJEhx1nfgcC3r9'),
  publicKey('So11111111111111111111111111111111111111112'),
  publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
  publicKey('SysvarRent111111111111111111111111111111111'),
];

test('it maps every kit account role to umi signer/writable flags', (t) => {
  const kitInstruction: IInstruction = {
    programAddress: toKitAddress(PROGRAM),
    accounts: [
      { address: toKitAddress(KEYS[0]), role: AccountRole.WRITABLE_SIGNER },
      { address: toKitAddress(KEYS[1]), role: AccountRole.READONLY_SIGNER },
      { address: toKitAddress(KEYS[2]), role: AccountRole.WRITABLE },
      { address: toKitAddress(KEYS[3]), role: AccountRole.READONLY },
    ],
    data: new Uint8Array([1, 2, 3]),
  };

  const umiInstruction = fromKitInstruction(kitInstruction);
  t.is<string, string>(umiInstruction.programId, PROGRAM);
  t.deepEqual(
    umiInstruction.keys.map((key) => [key.isSigner, key.isWritable]),
    [
      [true, true],
      [true, false],
      [false, true],
      [false, false],
    ]
  );
  t.deepEqual(umiInstruction.data, new Uint8Array([1, 2, 3]));

  // Round-tripping restores the exact kit roles.
  const roundTripped = toKitInstruction(umiInstruction);
  t.deepEqual(
    roundTripped.accounts?.map((account) => account.role),
    [
      AccountRole.WRITABLE_SIGNER,
      AccountRole.READONLY_SIGNER,
      AccountRole.WRITABLE,
      AccountRole.READONLY,
    ]
  );
});

test('it defaults missing accounts and data', (t) => {
  const umiInstruction = fromKitInstruction({
    programAddress: toKitAddress(PROGRAM),
  });
  t.deepEqual(umiInstruction.keys, []);
  t.deepEqual(umiInstruction.data, new Uint8Array());

  // An account-less umi instruction produces no accounts key at all.
  const kitInstruction = toKitInstruction({
    programId: PROGRAM,
    keys: [],
    data: new Uint8Array([7]),
  });
  t.false('accounts' in kitInstruction);
  t.deepEqual(kitInstruction.data, new Uint8Array([7]));
});
