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
  TransactionMeta,
  TransactionWithMeta,
  lamports,
} from '../src';
import { struct, u64 } from '../src/serializers';

test('InstructionDiscriminator type has bytes field', (t) => {
  const discriminator: InstructionDiscriminator = {
    bytes: new Uint8Array([33]),
  };
  t.deepEqual(discriminator.bytes, new Uint8Array([33]));
});

test('InstructionDescriptor type has name, discriminator, dataSerializer, and optional accountNames', (t) => {
  const descriptor: InstructionDescriptor = {
    name: 'transfer',
    discriminator: { bytes: new Uint8Array([2]) },
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
    index: 0,
    programName: 'splToken',
    programId: publicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    instructionName: 'transfer',
    status: 'parsed',
    data: { amount: 100n },
    rawData: new Uint8Array([3, 0, 0, 0, 0, 0, 0, 0, 100]),
    remainingBytes: new Uint8Array(),
    accounts: [
      {
        pubkey: publicKey('11111111111111111111111111111111'),
        isSigner: false,
        isWritable: true,
        name: 'source',
      },
    ],
  };
  t.is(parsed.programName, 'splToken');
  t.is(parsed.instructionName, 'transfer');
  t.is(parsed.index, 0);
  t.is(parsed.status, 'parsed');
});

// Helper: create a minimal program repository for testing.
function createTestProgramRepository(
  programs: Program[]
): ProgramRepositoryInterface {
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

function createTestProgram(
  overrides: Partial<Program> & Pick<Program, 'name' | 'publicKey'>
): Program {
  return {
    getErrorFromCode: () => null,
    getErrorFromName: () => null,
    isOnCluster: () => true,
    ...overrides,
  };
}

test('parseInstruction returns unknown-program for unregistered program', (t) => {
  const context = {
    programs: createTestProgramRepository([]),
  };
  const instruction: Instruction = {
    programId: publicKey('Sysvar1nstructions1111111111111111111111111'),
    keys: [
      {
        pubkey: publicKey('11111111111111111111111111111111'),
        isSigner: false,
        isWritable: true,
      },
    ],
    data: new Uint8Array([1, 2, 3]),
  };
  const result = parseInstruction(context, instruction, 2);
  t.is(result.index, 2);
  t.is(result.programName, 'unknown');
  t.is(result.instructionName, 'unknown');
  t.is(result.status, 'unknown-program');
  t.is(result.data, null);
  t.deepEqual(result.rawData, new Uint8Array([1, 2, 3]));
  t.is(result.accounts.length, 1);
  t.is(result.accounts[0].name, undefined);
});

test('parseInstruction defaults index to 0', (t) => {
  const context = { programs: createTestProgramRepository([]) };
  const instruction: Instruction = {
    programId: publicKey('11111111111111111111111111111111'),
    keys: [],
    data: new Uint8Array([1]),
  };
  const result = parseInstruction(context, instruction);
  t.is(result.index, 0);
});

test('parseInstruction returns no-descriptors for program with no descriptors', (t) => {
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
  t.is(result.status, 'no-descriptors');
  t.is(result.data, null);
  t.deepEqual(result.rawData, new Uint8Array([1, 2, 3]));
});

test('parseInstruction deserializes matching instruction', (t) => {
  const dataSerializer = {
    description: 'transferData',
    fixedSize: 8,
    maxSize: 8,
    serialize: () => new Uint8Array(8),
    deserialize: (
      _bytes: Uint8Array,
      offset = 0
    ): [{ amount: bigint }, number] => [{ amount: 42n }, offset + 8],
  };
  const program = createTestProgram({
    name: 'splToken',
    publicKey: publicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    instructions: [
      {
        name: 'transfer',
        discriminator: { bytes: new Uint8Array([3]) },
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
      {
        pubkey: publicKey('So11111111111111111111111111111111111111112'),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: publicKey('SysvarRent111111111111111111111111111111111'),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: publicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
        isSigner: true,
        isWritable: false,
      },
    ],
    data: new Uint8Array([3, ...new Array(8).fill(0)]),
  };
  const result = parseInstruction(context, instruction);
  t.is(result.programName, 'splToken');
  t.is(result.instructionName, 'transfer');
  t.is(result.status, 'parsed');
  t.deepEqual(result.data, { amount: 42n });
  t.deepEqual(result.remainingBytes, new Uint8Array());
  t.is(result.accounts[0].name, 'source');
  t.is(result.accounts[1].name, 'destination');
  t.is(result.accounts[2].name, 'authority');
});

test('parseInstruction returns no-discriminator-match for non-matching discriminator', (t) => {
  const program = createTestProgram({
    name: 'splToken',
    publicKey: publicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    instructions: [
      {
        name: 'transfer',
        discriminator: { bytes: new Uint8Array([3]) },
        dataSerializer: {
          description: 'test',
          fixedSize: 8,
          maxSize: 8,
          serialize: () => new Uint8Array(),
          deserialize: (_bytes: Uint8Array, offset = 0): [object, number] => [
            {},
            offset + 8,
          ],
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
  t.is(result.status, 'no-discriminator-match');
});

test('parseInstruction matches 8-byte Anchor discriminator', (t) => {
  const anchorDiscriminator = new Uint8Array([
    181, 157, 89, 67, 143, 58, 109, 14,
  ]);
  const program = createTestProgram({
    name: 'myAnchorProgram',
    publicKey: publicKey('cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ'),
    instructions: [
      {
        name: 'initialize',
        discriminator: { bytes: anchorDiscriminator },
        dataSerializer: {
          description: 'initializeData',
          fixedSize: 0,
          maxSize: 0,
          serialize: () => new Uint8Array(),
          deserialize: (
            _bytes: Uint8Array,
            offset = 0
          ): [{ initialized: boolean }, number] => [
            { initialized: true },
            offset,
          ],
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
  t.is(result.status, 'parsed');
  t.deepEqual(result.data, { initialized: true });
});

test('parseInstruction handles more accounts than accountNames', (t) => {
  const program = createTestProgram({
    name: 'myProgram',
    publicKey: publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
    instructions: [
      {
        name: 'doStuff',
        discriminator: { bytes: new Uint8Array([1]) },
        dataSerializer: {
          description: 'test',
          fixedSize: 0,
          maxSize: 0,
          serialize: () => new Uint8Array(),
          deserialize: (_bytes: Uint8Array, offset = 0): [object, number] => [
            {},
            offset,
          ],
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
      {
        pubkey: publicKey('So11111111111111111111111111111111111111112'),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: publicKey('SysvarRent111111111111111111111111111111111'),
        isSigner: false,
        isWritable: false,
      },
    ],
    data: new Uint8Array([1]),
  };
  const result = parseInstruction(context, instruction);
  t.is(result.accounts[0].name, 'first');
  t.is(result.accounts[1].name, undefined);
});

test('parseInstruction returns deserialize-failed on serializer throw', (t) => {
  const program = createTestProgram({
    name: 'myProgram',
    publicKey: publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
    instructions: [
      {
        name: 'failingIx',
        discriminator: { bytes: new Uint8Array([1]) },
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
  t.is(result.status, 'deserialize-failed');
  t.is(result.data, null);
  t.deepEqual(result.rawData, new Uint8Array([1, 0xff, 0xff]));
});

test('parseInstruction surfaces unconsumed bytes in remainingBytes', (t) => {
  const program = createTestProgram({
    name: 'myProgram',
    publicKey: publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
    instructions: [
      {
        name: 'partial',
        discriminator: { bytes: new Uint8Array([5]) },
        dataSerializer: {
          description: 'partial',
          fixedSize: null,
          maxSize: null,
          serialize: () => new Uint8Array(),
          // Always consumes only the first byte after the discriminator.
          deserialize: (
            bytes: Uint8Array,
            offset = 0
          ): [{ first: number }, number] => [
            { first: bytes[offset] },
            offset + 1,
          ],
        },
      },
    ],
  });
  const context = { programs: createTestProgramRepository([program]) };
  const result = parseInstruction(context, {
    programId: publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
    keys: [],
    data: new Uint8Array([5, 1, 2, 3]),
  });
  t.is(result.status, 'parsed');
  t.deepEqual(result.data, { first: 1 });
  t.deepEqual(result.remainingBytes, new Uint8Array([2, 3]));
});

test('parseInstruction prefers longer discriminators when they overlap a prefix', (t) => {
  const longSerializer = {
    description: 'long',
    fixedSize: 0,
    maxSize: 0,
    serialize: () => new Uint8Array(),
    deserialize: (_b: Uint8Array, o = 0): [{ kind: string }, number] => [
      { kind: 'long' },
      o,
    ],
  };
  const shortSerializer = {
    description: 'short',
    fixedSize: 0,
    maxSize: 0,
    serialize: () => new Uint8Array(),
    deserialize: (_b: Uint8Array, o = 0): [{ kind: string }, number] => [
      { kind: 'short' },
      o,
    ],
  };
  const program = createTestProgram({
    name: 'p',
    publicKey: publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
    instructions: [
      // Short registered first; without length-desc sort, the long discriminator
      // would be unreachable.
      {
        name: 'short',
        discriminator: { bytes: new Uint8Array([1]) },
        dataSerializer: shortSerializer,
      },
      {
        name: 'long',
        discriminator: { bytes: new Uint8Array([1, 2, 3]) },
        dataSerializer: longSerializer,
      },
    ],
  });
  const context = { programs: createTestProgramRepository([program]) };

  const longResult = parseInstruction(context, {
    programId: publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
    keys: [],
    data: new Uint8Array([1, 2, 3]),
  });
  t.is(longResult.instructionName, 'long', 'longest match wins');

  const shortResult = parseInstruction(context, {
    programId: publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
    keys: [],
    data: new Uint8Array([1, 9]),
  });
  t.is(
    shortResult.instructionName,
    'short',
    'short matches when long does not'
  );
});

// Helper: create a minimal Transaction from compiled instructions.
function createTestTransaction(
  accounts: PublicKey[],
  instructions: {
    programIndex: number;
    accountIndexes: number[];
    data: Uint8Array;
  }[],
  header?: {
    numRequiredSignatures: number;
    numReadonlySignedAccounts: number;
    numReadonlyUnsignedAccounts: number;
  },
  options?: {
    version?: 'legacy' | 0;
    addressLookupTables?: {
      publicKey: PublicKey;
      writableIndexes: number[];
      readonlyIndexes: number[];
    }[];
    signatures?: Uint8Array[];
    blockhash?: string;
  }
): Transaction {
  const message: TransactionMessage = {
    version: options?.version ?? 'legacy',
    header: header ?? {
      numRequiredSignatures: 1,
      numReadonlySignedAccounts: 0,
      numReadonlyUnsignedAccounts: 0,
    },
    accounts,
    blockhash: options?.blockhash ?? 'test-blockhash',
    instructions,
    addressLookupTables: options?.addressLookupTables ?? [],
  };
  return {
    message,
    serializedMessage: new Uint8Array(),
    signatures: options?.signatures ?? [],
  };
}

test('parseTransaction returns ParsedTransaction with metadata fields', (t) => {
  const programKey = publicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  const feePayer = publicKey('So11111111111111111111111111111111111111112');
  const sig = new Uint8Array(64).fill(1);
  const context = { programs: createTestProgramRepository([]) };

  const transaction = createTestTransaction(
    [feePayer, programKey],
    [{ programIndex: 1, accountIndexes: [], data: new Uint8Array([9]) }],
    {
      numRequiredSignatures: 1,
      numReadonlySignedAccounts: 0,
      numReadonlyUnsignedAccounts: 1,
    },
    { version: 'legacy', blockhash: 'my-blockhash', signatures: [sig] }
  );

  const result = parseTransaction(context, transaction);
  t.is(result.version, 'legacy');
  t.is(result.feePayer, feePayer);
  t.is(result.blockhash, 'my-blockhash');
  t.deepEqual(result.header, {
    numRequiredSignatures: 1,
    numReadonlySignedAccounts: 0,
    numReadonlyUnsignedAccounts: 1,
  });
  t.deepEqual(result.staticAccounts, [feePayer, programKey]);
  t.is(result.loadedAddresses, null);
  t.is(result.signatures.length, 1);
  t.deepEqual(result.signatures[0], sig);
  t.deepEqual(result.addressLookupTables, []);
  t.is(result.instructions.length, 1);
  t.is(result.innerInstructions, null);
  t.is(result.meta, null);
});

test('parseTransaction assigns sequential indexes to instructions', (t) => {
  const program1Key = publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
  const program2Key = publicKey('cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ');
  const acc1 = publicKey('So11111111111111111111111111111111111111112');

  const context = { programs: createTestProgramRepository([]) };
  const transaction = createTestTransaction(
    [acc1, program1Key, program2Key],
    [
      { programIndex: 1, accountIndexes: [], data: new Uint8Array([1]) },
      { programIndex: 2, accountIndexes: [], data: new Uint8Array([2]) },
      { programIndex: 1, accountIndexes: [], data: new Uint8Array([3]) },
    ]
  );

  const result = parseTransaction(context, transaction);
  t.is(result.instructions[0].index, 0);
  t.is(result.instructions[1].index, 1);
  t.is(result.instructions[2].index, 2);
});

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
        discriminator: { bytes: new Uint8Array([3]) },
        dataSerializer: {
          description: 'transferData',
          fixedSize: 8,
          maxSize: 8,
          serialize: () => new Uint8Array(8),
          deserialize: (
            _bytes: Uint8Array,
            offset = 0
          ): [{ amount: bigint }, number] => [{ amount: 42n }, offset + 8],
        },
        accountNames: ['source', 'destination'],
      },
    ],
  });
  const context = { programs: createTestProgramRepository([program]) };

  const transaction = createTestTransaction(
    [acc1, acc2, programKey],
    [
      {
        programIndex: 2,
        accountIndexes: [0, 1],
        data: new Uint8Array([3, ...new Array(8).fill(0)]),
      },
    ]
  );

  const result = parseTransaction(context, transaction);
  t.is(result.instructions.length, 1);
  t.is(result.instructions[0].index, 0);
  t.is(result.instructions[0].programName, 'splToken');
  t.is(result.instructions[0].instructionName, 'transfer');
  t.deepEqual(result.instructions[0].data, { amount: 42n });
  t.is(result.instructions[0].accounts[0].pubkey, acc1);
  t.is(result.instructions[0].accounts[0].name, 'source');
  t.is(result.instructions[0].accounts[1].pubkey, acc2);
  t.is(result.instructions[0].accounts[1].name, 'destination');
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
        discriminator: { bytes: new Uint8Array([1]) },
        dataSerializer: {
          description: 'test',
          fixedSize: 0,
          maxSize: 0,
          serialize: () => new Uint8Array(),
          deserialize: (
            _bytes: Uint8Array,
            offset = 0
          ): [{ val: string }, number] => [{ val: 'one' }, offset],
        },
      },
    ],
  });
  const program2 = createTestProgram({
    name: 'program2',
    publicKey: program2Key,
  });
  const context = {
    programs: createTestProgramRepository([program1, program2]),
  };

  const transaction = createTestTransaction(
    [acc1, program1Key, program2Key],
    [
      { programIndex: 1, accountIndexes: [0], data: new Uint8Array([1]) },
      { programIndex: 2, accountIndexes: [0], data: new Uint8Array([99]) },
    ]
  );

  const result = parseTransaction(context, transaction);
  t.is(result.instructions.length, 2);
  t.is(result.instructions[0].programName, 'program1');
  t.is(result.instructions[0].instructionName, 'ix1');
  t.is(result.instructions[1].programName, 'program2');
  t.is(result.instructions[1].status, 'no-descriptors');
});

test('parseTransaction handles empty transaction', (t) => {
  const context = { programs: createTestProgramRepository([]) };
  const transaction = createTestTransaction([], []);
  const result = parseTransaction(context, transaction);
  t.is(result.instructions.length, 0);
});

// ---------------------------------------------------------------------------
// isWritable / isSigner derivation tests
// ---------------------------------------------------------------------------

test('parseTransaction correctly derives isSigner and isWritable for legacy accounts', (t) => {
  // Layout: [writableSigner(0), readonlySigner(1), writableNonSigner(2), readonlyNonSigner(3), programKey(4)]
  // numRequired=2, numReadonlySigned=1, numReadonlyUnsigned=2
  //   Writable signers: [0]
  //   Readonly signers: [1]
  //   Writable non-signers: [2]
  //   Readonly non-signers: [3, 4]
  const writableSigner = publicKey(
    '3GQMfaCNDRirN24DTYRK5XZLyZjoMgHPvyPxgHKAXiAu'
  );
  const readonlySigner = publicKey(
    '29S9SK4gMpWrLHGBgrRJTSkNdfuZjq6Pqxv3tesuAx8s'
  );
  const writableNonSigner = publicKey(
    'So11111111111111111111111111111111111111112'
  );
  const readonlyNonSigner = publicKey(
    'SysvarRent111111111111111111111111111111111'
  );
  const programKey = publicKey('11111111111111111111111111111111');

  const context = { programs: createTestProgramRepository([]) };
  const transaction = createTestTransaction(
    [
      writableSigner,
      readonlySigner,
      writableNonSigner,
      readonlyNonSigner,
      programKey,
    ],
    [
      {
        programIndex: 4,
        accountIndexes: [0, 1, 2, 3],
        data: new Uint8Array([0]),
      },
    ],
    {
      numRequiredSignatures: 2,
      numReadonlySignedAccounts: 1,
      numReadonlyUnsignedAccounts: 2,
    }
  );

  const result = parseTransaction(context, transaction);
  const accounts = result.instructions[0].accounts;
  t.true(accounts[0].isSigner);
  t.true(accounts[0].isWritable);
  t.true(accounts[1].isSigner);
  t.false(accounts[1].isWritable);
  t.false(accounts[2].isSigner);
  t.true(accounts[2].isWritable);
  t.false(accounts[3].isSigner);
  t.false(accounts[3].isWritable);
});

test('parseTransaction resolves v0 LUT accounts and writability via loadedAddresses', (t) => {
  // This test uses the *real* umi message shape: `message.accounts` holds
  // ONLY static account keys. LUT-resolved accounts live beyond
  // message.accounts.length and must be supplied via loadedAddresses (or
  // meta.loadedAddresses).
  //
  // Static accounts: [signer(w), staticNonSigner(w), staticNonSigner(r), program]
  //   header: numRequiredSignatures=1, numReadonlySigned=0, numReadonlyUnsigned=2
  // LUT layout (in flat-index space): writable first, then readonly:
  //   index 4 = lutWritable1 (LUT writable[0])
  //   index 5 = lutWritable2 (LUT writable[1])
  //   index 6 = lutReadonly  (LUT readonly[0])
  const signerKey = publicKey('3GQMfaCNDRirN24DTYRK5XZLyZjoMgHPvyPxgHKAXiAu');
  const staticWritable = publicKey(
    '29S9SK4gMpWrLHGBgrRJTSkNdfuZjq6Pqxv3tesuAx8s'
  );
  const staticReadonly = publicKey(
    'SysvarRent111111111111111111111111111111111'
  );
  const programKey = publicKey('11111111111111111111111111111111');
  const lutKey = publicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
  const lutWritable1 = publicKey('So11111111111111111111111111111111111111112');
  const lutWritable2 = publicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  const lutReadonly = publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

  const context = { programs: createTestProgramRepository([]) };
  const transaction = createTestTransaction(
    // Real-shape: only static accounts in message.accounts.
    [signerKey, staticWritable, staticReadonly, programKey],
    [
      {
        programIndex: 3,
        accountIndexes: [0, 1, 2, 4, 5, 6],
        data: new Uint8Array([0]),
      },
    ],
    {
      numRequiredSignatures: 1,
      numReadonlySignedAccounts: 0,
      numReadonlyUnsignedAccounts: 2,
    },
    {
      version: 0,
      addressLookupTables: [
        // Indexes here are positions inside the LUT account itself, not
        // flat-index positions in the message.
        { publicKey: lutKey, writableIndexes: [10, 20], readonlyIndexes: [30] },
      ],
    }
  );

  const result = parseTransaction(context, transaction, {
    loadedAddresses: {
      writable: [lutWritable1, lutWritable2],
      readonly: [lutReadonly],
    },
  });
  const accounts = result.instructions[0].accounts;

  // Static signer, writable
  t.is(accounts[0].pubkey, signerKey);
  t.true(accounts[0].isSigner);
  t.true(accounts[0].isWritable);

  // Static non-signer, writable
  t.is(accounts[1].pubkey, staticWritable);
  t.false(accounts[1].isSigner);
  t.true(accounts[1].isWritable);

  // Static non-signer, readonly
  t.is(accounts[2].pubkey, staticReadonly);
  t.false(accounts[2].isSigner);
  t.false(accounts[2].isWritable);

  // LUT writable[0]
  t.is(accounts[3].pubkey, lutWritable1);
  t.false(accounts[3].isSigner);
  t.true(accounts[3].isWritable);

  // LUT writable[1]
  t.is(accounts[4].pubkey, lutWritable2);
  t.false(accounts[4].isSigner);
  t.true(accounts[4].isWritable);

  // LUT readonly[0]
  t.is(accounts[5].pubkey, lutReadonly);
  t.false(accounts[5].isSigner);
  t.false(accounts[5].isWritable);

  // ParsedTransaction also carries the LUT metadata and the resolved load.
  t.is(result.version, 0);
  t.deepEqual(result.staticAccounts, [
    signerKey,
    staticWritable,
    staticReadonly,
    programKey,
  ]);
  t.is(result.addressLookupTables.length, 1);
  t.is(result.addressLookupTables[0].publicKey, lutKey);
  t.deepEqual(result.loadedAddresses, {
    writable: [lutWritable1, lutWritable2],
    readonly: [lutReadonly],
  });
});

test('parseTransaction throws if v0 LUT accounts are referenced without loadedAddresses', (t) => {
  const signerKey = publicKey('3GQMfaCNDRirN24DTYRK5XZLyZjoMgHPvyPxgHKAXiAu');
  const programKey = publicKey('11111111111111111111111111111111');
  const lutKey = publicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
  const context = { programs: createTestProgramRepository([]) };
  const transaction = createTestTransaction(
    [signerKey, programKey],
    [
      {
        programIndex: 1,
        // index 2 is past the static account count — needs loadedAddresses.
        accountIndexes: [0, 2],
        data: new Uint8Array([0]),
      },
    ],
    {
      numRequiredSignatures: 1,
      numReadonlySignedAccounts: 0,
      numReadonlyUnsignedAccounts: 1,
    },
    {
      version: 0,
      addressLookupTables: [
        { publicKey: lutKey, writableIndexes: [0], readonlyIndexes: [] },
      ],
    }
  );
  t.throws(() => parseTransaction(context, transaction), {
    message: /Cannot resolve account at flat index 2/,
  });
});

test('parseTransaction surfaces meta and parses inner instructions', (t) => {
  const programKey = publicKey('11111111111111111111111111111111');
  const signer = publicKey('3GQMfaCNDRirN24DTYRK5XZLyZjoMgHPvyPxgHKAXiAu');
  const dest = publicKey('29S9SK4gMpWrLHGBgrRJTSkNdfuZjq6Pqxv3tesuAx8s');

  const systemProgram = createTestProgram({
    name: 'systemProgram',
    publicKey: programKey,
    instructions: [
      {
        name: 'transfer',
        discriminator: { bytes: new Uint8Array([2, 0, 0, 0]) },
        dataSerializer: struct([['lamports', u64()]]),
        accountNames: ['from', 'to'],
      },
    ],
  });
  const context = { programs: createTestProgramRepository([systemProgram]) };

  const meta: TransactionMeta = {
    fee: lamports(5000),
    logs: ['log line'],
    preBalances: [lamports(1_000_000n), lamports(0n), lamports(0n)],
    postBalances: [lamports(900_000n), lamports(100_000n), lamports(0n)],
    preTokenBalances: [],
    postTokenBalances: [],
    innerInstructions: [
      {
        index: 0,
        instructions: [
          {
            programIndex: 2,
            accountIndexes: [0, 1],
            data: new Uint8Array([2, 0, 0, 0, 64, 75, 76, 0, 0, 0, 0, 0]),
          },
        ],
      },
    ],
    loadedAddresses: { writable: [], readonly: [] },
    computeUnitsConsumed: 1000n,
    costUnits: 1000n,
    err: null,
  };

  const baseTx = createTestTransaction(
    [signer, dest, programKey],
    [
      {
        programIndex: 2,
        accountIndexes: [0, 1],
        data: new Uint8Array([2, 0, 0, 0, 32, 161, 7, 0, 0, 0, 0, 0]),
      },
    ],
    {
      numRequiredSignatures: 1,
      numReadonlySignedAccounts: 0,
      numReadonlyUnsignedAccounts: 1,
    }
  );
  const transaction: TransactionWithMeta = { ...baseTx, meta };

  const result = parseTransaction(context, transaction);
  t.is(result.meta, meta);
  t.is(result.instructions.length, 1);
  t.is(result.instructions[0].instructionName, 'transfer');
  t.deepEqual(result.instructions[0].data, { lamports: 500_000n });

  t.truthy(result.innerInstructions);
  t.is(result.innerInstructions!.length, 1);
  t.is(result.innerInstructions![0].index, 0);
  t.is(result.innerInstructions![0].instructions.length, 1);
  t.is(
    result.innerInstructions![0].instructions[0].instructionName,
    'transfer'
  );
  t.deepEqual(result.innerInstructions![0].instructions[0].data, {
    lamports: 5_000_000n,
  });
});

// ---------------------------------------------------------------------------
// Real mainnet transaction tests
// ---------------------------------------------------------------------------
// Data sourced from mainnet transaction:
// 5x4EHRTNKwDvdhNgR4XdQFunEcyMzBPbTrdPB9dix6N8L5SBoGshJR1NYDj8M8ttcrYSdVPmrWihz91SDa8Bdx7C

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
  publicKey('X5QPJcpph4mBAJDzc4hRziFftSbcygV59kRb2Fu6Je1'), // 10
  publicKey('11111111111111111111111111111111'), // 11
  publicKey('5PHirr8joyTMp9JMm6nW7hNDVyEYdkzDqazxPD7RaTjx'), // 12
  publicKey('5T17aqgJ8cM39SNuVBu2LK2cq5MWUpZxcQnnuwNjpump'), // 13
  publicKey('7hTckgnGnLQR6sdH7YkqFTAA7VwTfYFaZ6EhEsU3saCX'), // 14
  publicKey('83Q95tW5Ke96uAt6sAaqQzazXtwE4PCaXZnDjuPgxgzM'), // 15
  publicKey('ADyA8hdefvWN2dbGGWFotbzWxrAvLW83WG6QCVXvJKqw'), // 16
  publicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'), // 17
  publicKey('C2aFPdENg4A2HQsmrd5rTw5TaYBX5Ku887cWjbFKtZpw'), // 18
  publicKey('ComputeBudget111111111111111111111111111111'), // 19
  publicKey('GS4CU59F31iL7aR2Q8zVS8DRrcRnXX1yjQ66TqNVQnaR'), // 20
  publicKey('jitodontfront111111111116111111111111165521'), // 21
  publicKey('pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA'), // 22
  publicKey('pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ'), // 23
  publicKey('So11111111111111111111111111111111111111112'), // 24
  publicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), // 25
  publicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'), // 26
];

const MAINNET_HEADER = {
  numRequiredSignatures: 1,
  numReadonlySignedAccounts: 0,
  numReadonlyUnsignedAccounts: 16,
};

test('parseTransaction parses real mainnet System Program transfers', (t) => {
  const lamportsSerializer = struct([['lamports', u64()]]);
  const systemProgram = createTestProgram({
    name: 'systemProgram',
    publicKey: publicKey('11111111111111111111111111111111'),
    instructions: [
      {
        name: 'transfer',
        discriminator: { bytes: new Uint8Array([2, 0, 0, 0]) },
        dataSerializer: lamportsSerializer,
        accountNames: ['from', 'to'],
      },
    ],
  });

  const context = { programs: createTestProgramRepository([systemProgram]) };
  const transaction = createTestTransaction(
    MAINNET_ACCOUNTS,
    [
      {
        programIndex: 11,
        accountIndexes: [0, 6],
        data: new Uint8Array([2, 0, 0, 0, 49, 135, 198, 29, 0, 0, 0, 0]),
      },
      {
        programIndex: 11,
        accountIndexes: [0, 8],
        data: new Uint8Array([2, 0, 0, 0, 64, 75, 76, 0, 0, 0, 0, 0]),
      },
      {
        programIndex: 11,
        accountIndexes: [0, 3],
        data: new Uint8Array([2, 0, 0, 0, 32, 161, 7, 0, 0, 0, 0, 0]),
      },
    ],
    MAINNET_HEADER
  );

  const result = parseTransaction(context, transaction);
  t.is(result.instructions.length, 3);
  t.is(result.feePayer, MAINNET_ACCOUNTS[0]);
  t.is(result.instructions[0].index, 0);
  t.is(result.instructions[0].programName, 'systemProgram');
  t.is(result.instructions[0].instructionName, 'transfer');
  t.deepEqual(result.instructions[0].data, { lamports: 499550001n });
  t.is(result.instructions[0].accounts[0].name, 'from');
  t.is(result.instructions[0].accounts[0].pubkey, MAINNET_ACCOUNTS[0]);
  t.is(result.instructions[0].accounts[1].name, 'to');
  t.is(result.instructions[0].accounts[1].pubkey, MAINNET_ACCOUNTS[6]);
  t.deepEqual(result.instructions[1].data, { lamports: 5000000n });
  t.is(result.instructions[1].accounts[1].pubkey, MAINNET_ACCOUNTS[8]);
  t.deepEqual(result.instructions[2].data, { lamports: 500000n });
  t.is(result.instructions[2].accounts[1].pubkey, MAINNET_ACCOUNTS[3]);
});

test('parseTransaction parses real mainnet SPL Token CloseAccount', (t) => {
  const splToken = createTestProgram({
    name: 'splToken',
    publicKey: publicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    instructions: [
      {
        name: 'closeAccount',
        discriminator: { bytes: new Uint8Array([9]) },
        dataSerializer: {
          description: 'closeAccountData',
          fixedSize: 0,
          maxSize: 0,
          serialize: () => new Uint8Array(),
          deserialize: (_bytes: Uint8Array, offset = 0): [object, number] => [
            {},
            offset,
          ],
        },
        accountNames: ['account', 'destination', 'owner'],
      },
    ],
  });

  const context = { programs: createTestProgramRepository([splToken]) };
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
  t.is(result.instructions.length, 1);
  t.is(result.instructions[0].programName, 'splToken');
  t.is(result.instructions[0].instructionName, 'closeAccount');
  t.deepEqual(result.instructions[0].data, {});
  t.is(result.instructions[0].accounts[0].name, 'account');
  t.is(result.instructions[0].accounts[0].pubkey, MAINNET_ACCOUNTS[6]);
  t.is(result.instructions[0].accounts[1].name, 'destination');
  t.is(result.instructions[0].accounts[1].pubkey, MAINNET_ACCOUNTS[0]);
  t.is(result.instructions[0].accounts[2].name, 'owner');
  t.is(result.instructions[0].accounts[2].pubkey, MAINNET_ACCOUNTS[0]);
});

test('parseTransaction handles mix of known and unknown programs from real mainnet data', (t) => {
  const systemProgram = createTestProgram({
    name: 'systemProgram',
    publicKey: publicKey('11111111111111111111111111111111'),
    instructions: [
      {
        name: 'transfer',
        discriminator: { bytes: new Uint8Array([2, 0, 0, 0]) },
        dataSerializer: struct([['lamports', u64()]]),
        accountNames: ['from', 'to'],
      },
    ],
  });
  const context = { programs: createTestProgramRepository([systemProgram]) };
  const transaction = createTestTransaction(
    MAINNET_ACCOUNTS,
    [
      {
        programIndex: 11,
        accountIndexes: [0, 6],
        data: new Uint8Array([2, 0, 0, 0, 49, 135, 198, 29, 0, 0, 0, 0]),
      },
      {
        programIndex: 25,
        accountIndexes: [6, 0, 0],
        data: new Uint8Array([9]),
      },
      {
        programIndex: 19,
        accountIndexes: [],
        data: new Uint8Array([2, 166, 126, 3, 0]),
      },
    ],
    MAINNET_HEADER
  );

  const result = parseTransaction(context, transaction);
  t.is(result.instructions.length, 3);
  t.is(result.instructions[0].programName, 'systemProgram');
  t.is(result.instructions[0].instructionName, 'transfer');
  t.deepEqual(result.instructions[0].data, { lamports: 499550001n });
  t.is(result.instructions[1].programName, 'unknown');
  t.is(result.instructions[1].status, 'unknown-program');
  t.deepEqual(result.instructions[1].rawData, new Uint8Array([9]));
  t.is(result.instructions[2].programName, 'unknown');
  t.is(result.instructions[2].status, 'unknown-program');
  t.deepEqual(
    result.instructions[2].rawData,
    new Uint8Array([2, 166, 126, 3, 0])
  );
});
