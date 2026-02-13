import test from 'ava';
import {
  publicKey,
  InstructionDescriptor,
  InstructionDiscriminator,
  ParsedInstruction,
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
