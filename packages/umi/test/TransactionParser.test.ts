import test from 'ava';
import type { PublicKey } from '@metaplex-foundation/umi-public-keys';
import {
  publicKey,
  InstructionDescriptor,
  InstructionDiscriminator,
  ParsedInstruction,
  parseInstruction,
  parseTransaction,
  Instruction,
  ProgramRepositoryInterface,
  Program,
  Transaction,
  TransactionMessage,
} from '../src';
import { struct, u64 } from '../src/serializers';

test('InstructionDiscriminator type has bytes and size', (t) => {
  const discriminator: InstructionDiscriminator = {
    bytes: new Uint8Array([33]),
    size: 1,
  };
  t.is(discriminator.size, 1);
  t.deepEqual(discriminator.bytes, new Uint8Array([33]));
});

test('InstructionDescriptor type has name, discriminator, dataSerializer, and optional accountNames', (t) => {
  const descriptor: InstructionDescriptor = {
    name: 'transfer',
    discriminator: { bytes: new Uint8Array([2]), size: 1 },
    dataSerializer: {
      description: 'test',
      fixedSize: 8,
      maxSize: 8,
      serialize: () => new Uint8Array(),
      deserialize: (bytes, offset = 0) => [{ amount: 100n }, offset + 8],
    },
    accountNames: ['source', 'destination', 'authority'],
  };
  t.is(descriptor.name, 'transfer');
  t.deepEqual(descriptor.accountNames, ['source', 'destination', 'authority']);
});

test('ParsedInstruction type has expected shape', (t) => {
  const parsed: ParsedInstruction = {
    programName: 'splToken',
    programId: publicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    instructionName: 'transfer',
    data: { amount: 100n },
    accounts: [
      { pubkey: publicKey('11111111111111111111111111111111'), isSigner: false, isWritable: true, name: 'source' },
    ],
  };
  t.is(parsed.programName, 'splToken');
  t.is(parsed.instructionName, 'transfer');
});

// Helper: create a minimal program repository for testing.
function createTestProgramRepository(programs: Program[]): ProgramRepositoryInterface {
  return {
    has: (id) => programs.some((p) => p.publicKey === id || p.name === id),
    get: <T extends Program = Program>(id: string | PublicKey): T => {
      const found = programs.find((p) => p.publicKey === id || p.name === id);
      if (!found) throw new Error(`Program not found: ${id}`);
      return found as T;
    },
    getPublicKey: (id) => {
      const found = programs.find((p) => p.publicKey === id || p.name === id);
      if (!found) throw new Error(`Program not found: ${id}`);
      return found.publicKey;
    },
    all: () => programs,
    add: () => {},
    bind: () => {},
    unbind: () => {},
    clone: () => createTestProgramRepository(programs),
    resolveError: () => null,
  };
}

function createTestProgram(overrides: Partial<Program> & Pick<Program, 'name' | 'publicKey'>): Program {
  return {
    getErrorFromCode: () => null,
    getErrorFromName: () => null,
    isOnCluster: () => true,
    ...overrides,
  };
}

test('parseInstruction returns unknown for unregistered program', (t) => {
  const context = {
    programs: createTestProgramRepository([]),
  };
  const instruction: Instruction = {
    programId: publicKey('Sysvar1nstructions1111111111111111111111111'),
    keys: [{ pubkey: publicKey('11111111111111111111111111111111'), isSigner: false, isWritable: true }],
    data: new Uint8Array([1, 2, 3]),
  };
  const result = parseInstruction(context, instruction);
  t.is(result.programName, 'unknown');
  t.is(result.instructionName, 'unknown');
  t.deepEqual(result.data, new Uint8Array([1, 2, 3]));
  t.is(result.accounts.length, 1);
  t.is(result.accounts[0].name, undefined);
});

test('parseInstruction returns unknown instruction for program with no descriptors', (t) => {
  const program = createTestProgram({
    name: 'myProgram',
    publicKey: publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
  });
  const context = {
    programs: createTestProgramRepository([program]),
  };
  const instruction: Instruction = {
    programId: publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
    keys: [],
    data: new Uint8Array([1, 2, 3]),
  };
  const result = parseInstruction(context, instruction);
  t.is(result.programName, 'myProgram');
  t.is(result.instructionName, 'unknown');
  t.deepEqual(result.data, new Uint8Array([1, 2, 3]));
});

test('parseInstruction deserializes matching instruction', (t) => {
  const dataSerializer = {
    description: 'transferData',
    fixedSize: 8,
    maxSize: 8,
    serialize: () => new Uint8Array(8),
    deserialize: (_bytes: Uint8Array, offset = 0): [{ amount: bigint }, number] => [{ amount: 42n }, offset + 8],
  };
  const program = createTestProgram({
    name: 'splToken',
    publicKey: publicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    instructions: [
      {
        name: 'transfer',
        discriminator: { bytes: new Uint8Array([3]), size: 1 },
        dataSerializer,
        accountNames: ['source', 'destination', 'authority'],
      },
    ],
  });
  const context = {
    programs: createTestProgramRepository([program]),
  };
  const instruction: Instruction = {
    programId: publicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    keys: [
      { pubkey: publicKey('So11111111111111111111111111111111111111112'), isSigner: false, isWritable: true },
      { pubkey: publicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: true },
      { pubkey: publicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'), isSigner: true, isWritable: false },
    ],
    data: new Uint8Array([3, ...new Array(8).fill(0)]),
  };
  const result = parseInstruction(context, instruction);
  t.is(result.programName, 'splToken');
  t.is(result.instructionName, 'transfer');
  t.deepEqual(result.data, { amount: 42n });
  t.is(result.accounts[0].name, 'source');
  t.is(result.accounts[1].name, 'destination');
  t.is(result.accounts[2].name, 'authority');
});

test('parseInstruction returns unknown for non-matching discriminator', (t) => {
  const program = createTestProgram({
    name: 'splToken',
    publicKey: publicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    instructions: [
      {
        name: 'transfer',
        discriminator: { bytes: new Uint8Array([3]), size: 1 },
        dataSerializer: {
          description: 'test',
          fixedSize: 8,
          maxSize: 8,
          serialize: () => new Uint8Array(),
          deserialize: (_bytes: Uint8Array, offset = 0): [object, number] => [{}, offset + 8],
        },
      },
    ],
  });
  const context = {
    programs: createTestProgramRepository([program]),
  };
  const instruction: Instruction = {
    programId: publicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    keys: [],
    data: new Uint8Array([99, 0, 0, 0, 0, 0, 0, 0, 0]),
  };
  const result = parseInstruction(context, instruction);
  t.is(result.programName, 'splToken');
  t.is(result.instructionName, 'unknown');
});

test('parseInstruction matches 8-byte Anchor discriminator', (t) => {
  const anchorDiscriminator = new Uint8Array([181, 157, 89, 67, 143, 58, 109, 14]);
  const program = createTestProgram({
    name: 'myAnchorProgram',
    publicKey: publicKey('cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ'),
    instructions: [
      {
        name: 'initialize',
        discriminator: { bytes: anchorDiscriminator, size: 8 },
        dataSerializer: {
          description: 'initializeData',
          fixedSize: 0,
          maxSize: 0,
          serialize: () => new Uint8Array(),
          deserialize: (_bytes: Uint8Array, offset = 0): [{ initialized: boolean }, number] => [{ initialized: true }, offset],
        },
      },
    ],
  });
  const context = {
    programs: createTestProgramRepository([program]),
  };
  const instruction: Instruction = {
    programId: publicKey('cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ'),
    keys: [],
    data: new Uint8Array([181, 157, 89, 67, 143, 58, 109, 14]),
  };
  const result = parseInstruction(context, instruction);
  t.is(result.instructionName, 'initialize');
  t.deepEqual(result.data, { initialized: true });
});

test('parseInstruction handles more accounts than accountNames', (t) => {
  const program = createTestProgram({
    name: 'myProgram',
    publicKey: publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
    instructions: [
      {
        name: 'doStuff',
        discriminator: { bytes: new Uint8Array([1]), size: 1 },
        dataSerializer: {
          description: 'test',
          fixedSize: 0,
          maxSize: 0,
          serialize: () => new Uint8Array(),
          deserialize: (_bytes: Uint8Array, offset = 0): [object, number] => [{}, offset],
        },
        accountNames: ['first'],
      },
    ],
  });
  const context = {
    programs: createTestProgramRepository([program]),
  };
  const instruction: Instruction = {
    programId: publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
    keys: [
      { pubkey: publicKey('So11111111111111111111111111111111111111112'), isSigner: false, isWritable: true },
      { pubkey: publicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
    ],
    data: new Uint8Array([1]),
  };
  const result = parseInstruction(context, instruction);
  t.is(result.accounts[0].name, 'first');
  t.is(result.accounts[1].name, undefined);
});

test('parseInstruction falls back to raw data on deserialization failure', (t) => {
  const program = createTestProgram({
    name: 'myProgram',
    publicKey: publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
    instructions: [
      {
        name: 'failingIx',
        discriminator: { bytes: new Uint8Array([1]), size: 1 },
        dataSerializer: {
          description: 'broken',
          fixedSize: null,
          maxSize: null,
          serialize: () => new Uint8Array(),
          deserialize: (): [object, number] => {
            throw new Error('bad data');
          },
        },
      },
    ],
  });
  const context = {
    programs: createTestProgramRepository([program]),
  };
  const instruction: Instruction = {
    programId: publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
    keys: [],
    data: new Uint8Array([1, 0xff, 0xff]),
  };
  const result = parseInstruction(context, instruction);
  t.is(result.programName, 'myProgram');
  t.is(result.instructionName, 'failingIx');
  t.deepEqual(result.data, new Uint8Array([1, 0xff, 0xff]));
});

// Helper: create a minimal Transaction from compiled instructions.
function createTestTransaction(
  accounts: PublicKey[],
  instructions: { programIndex: number; accountIndexes: number[]; data: Uint8Array }[],
  header?: { numRequiredSignatures: number; numReadonlySignedAccounts: number; numReadonlyUnsignedAccounts: number }
): Transaction {
  const message: TransactionMessage = {
    version: 'legacy',
    header: header ?? { numRequiredSignatures: 1, numReadonlySignedAccounts: 0, numReadonlyUnsignedAccounts: 0 },
    accounts,
    blockhash: 'test-blockhash',
    instructions,
    addressLookupTables: [],
  };
  return {
    message,
    serializedMessage: new Uint8Array(),
    signatures: [],
  };
}

test('parseTransaction parses all instructions in a transaction', (t) => {
  const programKey = publicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  const acc1 = publicKey('So11111111111111111111111111111111111111112');
  const acc2 = publicKey('SysvarRent111111111111111111111111111111111');

  const program = createTestProgram({
    name: 'splToken',
    publicKey: programKey,
    instructions: [
      {
        name: 'transfer',
        discriminator: { bytes: new Uint8Array([3]), size: 1 },
        dataSerializer: {
          description: 'transferData',
          fixedSize: 8,
          maxSize: 8,
          serialize: () => new Uint8Array(8),
          deserialize: (_bytes: Uint8Array, offset = 0): [{ amount: bigint }, number] => [{ amount: 42n }, offset + 8],
        },
        accountNames: ['source', 'destination'],
      },
    ],
  });
  const context = { programs: createTestProgramRepository([program]) };

  const transaction = createTestTransaction(
    [acc1, acc2, programKey],
    [
      { programIndex: 2, accountIndexes: [0, 1], data: new Uint8Array([3, ...new Array(8).fill(0)]) },
    ]
  );

  const result = parseTransaction(context, transaction);
  t.is(result.length, 1);
  t.is(result[0].programName, 'splToken');
  t.is(result[0].instructionName, 'transfer');
  t.deepEqual(result[0].data, { amount: 42n });
  t.is(result[0].accounts[0].pubkey, acc1);
  t.is(result[0].accounts[0].name, 'source');
  t.is(result[0].accounts[1].pubkey, acc2);
  t.is(result[0].accounts[1].name, 'destination');
});

test('parseTransaction handles multiple instructions', (t) => {
  const program1Key = publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
  const program2Key = publicKey('cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ');
  const acc1 = publicKey('So11111111111111111111111111111111111111112');

  const program1 = createTestProgram({
    name: 'program1',
    publicKey: program1Key,
    instructions: [
      {
        name: 'ix1',
        discriminator: { bytes: new Uint8Array([1]), size: 1 },
        dataSerializer: {
          description: 'test',
          fixedSize: 0,
          maxSize: 0,
          serialize: () => new Uint8Array(),
          deserialize: (_bytes: Uint8Array, offset = 0): [{ val: string }, number] => [{ val: 'one' }, offset],
        },
      },
    ],
  });
  const program2 = createTestProgram({
    name: 'program2',
    publicKey: program2Key,
  });
  const context = { programs: createTestProgramRepository([program1, program2]) };

  const transaction = createTestTransaction(
    [acc1, program1Key, program2Key],
    [
      { programIndex: 1, accountIndexes: [0], data: new Uint8Array([1]) },
      { programIndex: 2, accountIndexes: [0], data: new Uint8Array([99]) },
    ]
  );

  const result = parseTransaction(context, transaction);
  t.is(result.length, 2);
  t.is(result[0].programName, 'program1');
  t.is(result[0].instructionName, 'ix1');
  t.is(result[1].programName, 'program2');
  t.is(result[1].instructionName, 'unknown');
});

test('parseTransaction handles empty transaction', (t) => {
  const context = { programs: createTestProgramRepository([]) };
  const transaction = createTestTransaction([], []);
  const result = parseTransaction(context, transaction);
  t.is(result.length, 0);
});

// ---------------------------------------------------------------------------
// Real mainnet transaction tests
// ---------------------------------------------------------------------------
// Data sourced from mainnet transaction:
// 5x4EHRTNKwDvdhNgR4XdQFunEcyMzBPbTrdPB9dix6N8L5SBoGshJR1NYDj8M8ttcrYSdVPmrWihz91SDa8Bdx7C
//
// This transaction contains:
//   - Instruction 4: System Program Transfer (2) — 499_550_001 lamports
//   - Instruction 7: SPL Token CloseAccount (9)
//   - Instruction 8: System Program Transfer (2) — 5_000_000 lamports
//   - Instruction 9: System Program Transfer (2) — 500_000 lamports
//
// Account list (27 accounts):
//   [0]  3GQMfaCNDRirN24DTYRK5XZLyZjoMgHPvyPxgHKAXiAu  (signer, writable)
//   [1]  29S9SK4gMpWrLHGBgrRJTSkNdfuZjq6Pqxv3tesuAx8s  (writable)
//   ...
//   [6]  CTvW9dwKcHH81CgqaDv39bpYT89RsdMda4cWLGPnNQDu  (writable)
//   ...
//   [8]  DXfkEGoo6WFsdL7x6gLZ7r6Hw2S6HrtrAQVPWYx2A1s9  (writable)
//   ...
//   [11] 11111111111111111111111111111111                (readonly)
//   ...
//   [25] TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA    (readonly)
//
// Header: numRequiredSignatures=1, numReadonlySignedAccounts=0, numReadonlyUnsignedAccounts=16

const MAINNET_ACCOUNTS: PublicKey[] = [
  publicKey('3GQMfaCNDRirN24DTYRK5XZLyZjoMgHPvyPxgHKAXiAu'), // 0
  publicKey('29S9SK4gMpWrLHGBgrRJTSkNdfuZjq6Pqxv3tesuAx8s'), // 1
  publicKey('8jKbPbcYZf8BJFzmAdGhLoLBWDsLooYoCUpvFkSLBYLA'), // 2
  publicKey('8mR3wB1nh4D6J9RUCugxUpc6ya8w38LPxZ3ZjcBhgzws'), // 3
  publicKey('BGmVoq929ifsbC1p93XGyPsd1p2B5i5WDWJEzNmJcqvF'), // 4
  publicKey('C51i1v8hycrxTnU43AEv2TxVScC6q8bnmSY5KwYKaCP2'), // 5
  publicKey('CTvW9dwKcHH81CgqaDv39bpYT89RsdMda4cWLGPnNQDu'), // 6
  publicKey('DbaE54PG2G84egZ9kQWKTEEhBoNptAnQCPk67B1dw19P'), // 7
  publicKey('DXfkEGoo6WFsdL7x6gLZ7r6Hw2S6HrtrAQVPWYx2A1s9'), // 8
  publicKey('Hs1vtw5paaVEw71gkkP3SAXFsznP1ErAWuD2EgKXawfV'), // 9
  publicKey('X5QPJcpph4mBAJDzc4hRziFftSbcygV59kRb2Fu6Je1'),  // 10
  publicKey('11111111111111111111111111111111'),               // 11
  publicKey('5PHirr8joyTMp9JMm6nW7hNDVyEYdkzDqazxPD7RaTjx'), // 12
  publicKey('5T17aqgJ8cM39SNuVBu2LK2cq5MWUpZxcQnnuwNjpump'), // 13
  publicKey('7hTckgnGnLQR6sdH7YkqFTAA7VwTfYFaZ6EhEsU3saCX'), // 14
  publicKey('83Q95tW5Ke96uAt6sAaqQzazXtwE4PCaXZnDjuPgxgzM'), // 15
  publicKey('ADyA8hdefvWN2dbGGWFotbzWxrAvLW83WG6QCVXvJKqw'), // 16
  publicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'), // 17
  publicKey('C2aFPdENg4A2HQsmrd5rTw5TaYBX5Ku887cWjbFKtZpw'), // 18
  publicKey('ComputeBudget111111111111111111111111111111'),    // 19
  publicKey('GS4CU59F31iL7aR2Q8zVS8DRrcRnXX1yjQ66TqNVQnaR'), // 20
  publicKey('jitodontfront111111111116111111111111165521'),    // 21 - not valid base58
  publicKey('pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA'),  // 22
  publicKey('pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ'),  // 23
  publicKey('So11111111111111111111111111111111111111112'),     // 24
  publicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),  // 25
  publicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),  // 26
];

const MAINNET_HEADER = {
  numRequiredSignatures: 1,
  numReadonlySignedAccounts: 0,
  numReadonlyUnsignedAccounts: 16,
};

test('parseTransaction parses real mainnet System Program transfers', (t) => {
  // After the 4-byte discriminator is stripped, we only need the u64 lamports.
  const lamportsSerializer = struct([['lamports', u64()]]);

  const systemProgram = createTestProgram({
    name: 'systemProgram',
    publicKey: publicKey('11111111111111111111111111111111'),
    instructions: [
      {
        name: 'transfer',
        // System Program Transfer has u32 discriminator = 2
        discriminator: {
          bytes: new Uint8Array([2, 0, 0, 0]),
          size: 4,
        },
        dataSerializer: lamportsSerializer,
        accountNames: ['from', 'to'],
      },
    ],
  });

  const context = { programs: createTestProgramRepository([systemProgram]) };

  // Build transaction with the 3 real transfer instructions from mainnet
  const transaction = createTestTransaction(
    MAINNET_ACCOUNTS,
    [
      // Instruction 4: Transfer 499_550_001 lamports from [0] to [6]
      {
        programIndex: 11,
        accountIndexes: [0, 6],
        data: new Uint8Array([2, 0, 0, 0, 49, 135, 198, 29, 0, 0, 0, 0]),
      },
      // Instruction 8: Transfer 5_000_000 lamports from [0] to [8]
      {
        programIndex: 11,
        accountIndexes: [0, 8],
        data: new Uint8Array([2, 0, 0, 0, 64, 75, 76, 0, 0, 0, 0, 0]),
      },
      // Instruction 9: Transfer 500_000 lamports from [0] to [3]
      {
        programIndex: 11,
        accountIndexes: [0, 3],
        data: new Uint8Array([2, 0, 0, 0, 32, 161, 7, 0, 0, 0, 0, 0]),
      },
    ],
    MAINNET_HEADER
  );

  const result = parseTransaction(context, transaction);
  t.is(result.length, 3);

  // First transfer: 499_550_001 lamports
  t.is(result[0].programName, 'systemProgram');
  t.is(result[0].instructionName, 'transfer');
  t.deepEqual(result[0].data, { lamports: 499550001n });
  t.is(result[0].accounts[0].name, 'from');
  t.is(result[0].accounts[0].pubkey, MAINNET_ACCOUNTS[0]);
  t.is(result[0].accounts[1].name, 'to');
  t.is(result[0].accounts[1].pubkey, MAINNET_ACCOUNTS[6]);

  // Second transfer: 5_000_000 lamports
  t.is(result[1].instructionName, 'transfer');
  t.deepEqual(result[1].data, { lamports: 5000000n });
  t.is(result[1].accounts[1].pubkey, MAINNET_ACCOUNTS[8]);

  // Third transfer: 500_000 lamports
  t.is(result[2].instructionName, 'transfer');
  t.deepEqual(result[2].data, { lamports: 500000n });
  t.is(result[2].accounts[1].pubkey, MAINNET_ACCOUNTS[3]);
});

test('parseTransaction parses real mainnet SPL Token CloseAccount', (t) => {
  const splToken = createTestProgram({
    name: 'splToken',
    publicKey: publicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    instructions: [
      {
        name: 'closeAccount',
        // SPL Token CloseAccount = u8 discriminator 9, no additional data
        discriminator: { bytes: new Uint8Array([9]), size: 1 },
        dataSerializer: {
          description: 'closeAccountData',
          fixedSize: 0,
          maxSize: 0,
          serialize: () => new Uint8Array(),
          deserialize: (_bytes: Uint8Array, offset = 0): [object, number] => [{}, offset],
        },
        accountNames: ['account', 'destination', 'owner'],
      },
    ],
  });

  const context = { programs: createTestProgramRepository([splToken]) };

  // Instruction 7 from the real transaction: CloseAccount
  // accounts: [6, 0, 0] = [CTvW9d..., 3GQMfa..., 3GQMfa...]
  const transaction = createTestTransaction(
    MAINNET_ACCOUNTS,
    [
      {
        programIndex: 25,
        accountIndexes: [6, 0, 0],
        data: new Uint8Array([9]),
      },
    ],
    MAINNET_HEADER
  );

  const result = parseTransaction(context, transaction);
  t.is(result.length, 1);
  t.is(result[0].programName, 'splToken');
  t.is(result[0].instructionName, 'closeAccount');
  t.deepEqual(result[0].data, {});
  t.is(result[0].accounts[0].name, 'account');
  t.is(result[0].accounts[0].pubkey, MAINNET_ACCOUNTS[6]);
  t.is(result[0].accounts[1].name, 'destination');
  t.is(result[0].accounts[1].pubkey, MAINNET_ACCOUNTS[0]);
  t.is(result[0].accounts[2].name, 'owner');
  t.is(result[0].accounts[2].pubkey, MAINNET_ACCOUNTS[0]);
});

test('parseTransaction handles mix of known and unknown programs from real mainnet data', (t) => {
  const systemProgram = createTestProgram({
    name: 'systemProgram',
    publicKey: publicKey('11111111111111111111111111111111'),
    instructions: [
      {
        name: 'transfer',
        discriminator: { bytes: new Uint8Array([2, 0, 0, 0]), size: 4 },
        dataSerializer: struct([['lamports', u64()]]),
        accountNames: ['from', 'to'],
      },
    ],
  });

  // Only register System Program — leave SPL Token and others unregistered
  const context = { programs: createTestProgramRepository([systemProgram]) };

  const transaction = createTestTransaction(
    MAINNET_ACCOUNTS,
    [
      // System Program Transfer — will be parsed
      {
        programIndex: 11,
        accountIndexes: [0, 6],
        data: new Uint8Array([2, 0, 0, 0, 49, 135, 198, 29, 0, 0, 0, 0]),
      },
      // SPL Token CloseAccount — program not registered, will be unknown
      {
        programIndex: 25,
        accountIndexes: [6, 0, 0],
        data: new Uint8Array([9]),
      },
      // ComputeBudget — program not registered, will be unknown
      {
        programIndex: 19,
        accountIndexes: [],
        data: new Uint8Array([2, 166, 126, 3, 0]),
      },
    ],
    MAINNET_HEADER
  );

  const result = parseTransaction(context, transaction);
  t.is(result.length, 3);

  // Known: System Program Transfer
  t.is(result[0].programName, 'systemProgram');
  t.is(result[0].instructionName, 'transfer');
  t.deepEqual(result[0].data, { lamports: 499550001n });

  // Unknown: SPL Token (not registered)
  t.is(result[1].programName, 'unknown');
  t.is(result[1].instructionName, 'unknown');
  t.deepEqual(result[1].data, new Uint8Array([9]));

  // Unknown: ComputeBudget (not registered)
  t.is(result[2].programName, 'unknown');
  t.is(result[2].instructionName, 'unknown');
  t.deepEqual(result[2].data, new Uint8Array([2, 166, 126, 3, 0]));
});
