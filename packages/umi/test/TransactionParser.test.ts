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
