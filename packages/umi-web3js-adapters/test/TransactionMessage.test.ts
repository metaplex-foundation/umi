import test from 'ava';
import {
  fromWeb3JsInstruction,
  fromWeb3JsMessage,
  fromWeb3JsPublicKey,
  toWeb3JsMessage,
  toWeb3JsMessageFromInput,
} from '../src';
import {
  BLOCKHASH,
  bytes,
  createWeb3JsLegacyMessage,
  createWeb3JsLookupTable,
  createWeb3JsTransferInstruction,
  createWeb3JsV0Message,
  generateWeb3JsKeypair,
} from './_setup';

test('it converts a legacy web3.js message to a umi message', async (t) => {
  const payer = (await generateWeb3JsKeypair()).publicKey;
  const from = (await generateWeb3JsKeypair()).publicKey;
  const to = (await generateWeb3JsKeypair()).publicKey;
  const instruction = createWeb3JsTransferInstruction(from, to);
  const web3JsMessage = createWeb3JsLegacyMessage(payer, instruction);
  const umiMessage = fromWeb3JsMessage(web3JsMessage);

  t.is(umiMessage.version, 'legacy');
  t.deepEqual(umiMessage.header, web3JsMessage.header);
  t.is(umiMessage.blockhash, BLOCKHASH);
  t.deepEqual(
    umiMessage.accounts,
    web3JsMessage.staticAccountKeys.map((key) => key.toBase58())
  );
  t.is(umiMessage.instructions.length, 1);
  const [umiInstruction] = umiMessage.instructions;
  const [web3JsCompiled] = web3JsMessage.compiledInstructions;
  t.is(umiInstruction.programIndex, web3JsCompiled.programIdIndex);
  t.deepEqual(umiInstruction.accountIndexes, web3JsCompiled.accountKeyIndexes);
  t.deepEqual(bytes(umiInstruction.data), bytes(web3JsCompiled.data));
  t.deepEqual(umiMessage.addressLookupTables, []);
});

test('it round-trips legacy messages byte-for-byte', async (t) => {
  const payer = (await generateWeb3JsKeypair()).publicKey;
  const from = (await generateWeb3JsKeypair()).publicKey;
  const to = (await generateWeb3JsKeypair()).publicKey;
  const original = createWeb3JsLegacyMessage(
    payer,
    createWeb3JsTransferInstruction(from, to)
  );
  const roundTripped = toWeb3JsMessage(fromWeb3JsMessage(original));
  t.deepEqual(bytes(roundTripped.serialize()), bytes(original.serialize()));
});

test('it converts a V0 web3.js message with lookup tables to a umi message', async (t) => {
  const payer = (await generateWeb3JsKeypair()).publicKey;
  const from = (await generateWeb3JsKeypair()).publicKey;
  const to = (await generateWeb3JsKeypair()).publicKey;
  const lookupTableKey = (await generateWeb3JsKeypair()).publicKey;
  const instruction = createWeb3JsTransferInstruction(from, to);
  const lookupTable = createWeb3JsLookupTable(lookupTableKey, [
    to,
    (await generateWeb3JsKeypair()).publicKey,
  ]);
  const web3JsMessage = createWeb3JsV0Message(payer, instruction, [
    lookupTable,
  ]);
  const umiMessage = fromWeb3JsMessage(web3JsMessage);

  t.is(umiMessage.version, 0);
  t.deepEqual(umiMessage.header, web3JsMessage.header);
  t.deepEqual(
    umiMessage.accounts,
    web3JsMessage.staticAccountKeys.map((key) => key.toBase58())
  );

  // The `to` account resolves through the lookup table.
  t.is(umiMessage.addressLookupTables.length, 1);
  const [umiLookupTable] = umiMessage.addressLookupTables;
  const [web3JsLookup] = web3JsMessage.addressTableLookups;
  t.is(web3JsLookup.accountKey.toBase58(), umiLookupTable.publicKey);
  t.is(lookupTableKey.toBase58(), umiLookupTable.publicKey);
  t.deepEqual(umiLookupTable.writableIndexes, web3JsLookup.writableIndexes);
  t.deepEqual(umiLookupTable.readonlyIndexes, web3JsLookup.readonlyIndexes);
  t.deepEqual(umiLookupTable.writableIndexes, [0]);
  t.false(umiMessage.accounts.includes(fromWeb3JsPublicKey(to)));
});

test('it round-trips V0 messages byte-for-byte', async (t) => {
  const payer = (await generateWeb3JsKeypair()).publicKey;
  const from = (await generateWeb3JsKeypair()).publicKey;
  const to = (await generateWeb3JsKeypair()).publicKey;
  const lookupTable = createWeb3JsLookupTable(
    (await generateWeb3JsKeypair()).publicKey,
    [to]
  );
  const original = createWeb3JsV0Message(
    payer,
    createWeb3JsTransferInstruction(from, to),
    [lookupTable]
  );
  const roundTripped = toWeb3JsMessage(fromWeb3JsMessage(original));
  t.deepEqual(bytes(roundTripped.serialize()), bytes(original.serialize()));
});

test('it compiles a legacy message from umi input like web3.js does', async (t) => {
  const payer = (await generateWeb3JsKeypair()).publicKey;
  const from = (await generateWeb3JsKeypair()).publicKey;
  const to = (await generateWeb3JsKeypair()).publicKey;
  const instruction = createWeb3JsTransferInstruction(from, to);

  const fromInput = toWeb3JsMessageFromInput({
    version: 'legacy',
    payer: fromWeb3JsPublicKey(payer),
    instructions: [fromWeb3JsInstruction(instruction)],
    blockhash: BLOCKHASH,
  });
  const reference = createWeb3JsLegacyMessage(payer, instruction);
  t.is(fromInput.version, 'legacy');
  t.deepEqual(bytes(fromInput.serialize()), bytes(reference.serialize()));
});

test('it compiles a V0 message with lookup tables from umi input like web3.js does', async (t) => {
  const payer = (await generateWeb3JsKeypair()).publicKey;
  const from = (await generateWeb3JsKeypair()).publicKey;
  const to = (await generateWeb3JsKeypair()).publicKey;
  const lookupTableKey = (await generateWeb3JsKeypair()).publicKey;
  const extraAddress = (await generateWeb3JsKeypair()).publicKey;
  const instruction = createWeb3JsTransferInstruction(from, to);
  const lookupTableAddresses = [to, extraAddress];

  const fromInput = toWeb3JsMessageFromInput({
    version: 0,
    payer: fromWeb3JsPublicKey(payer),
    instructions: [fromWeb3JsInstruction(instruction)],
    blockhash: BLOCKHASH,
    addressLookupTables: [
      {
        publicKey: fromWeb3JsPublicKey(lookupTableKey),
        addresses: lookupTableAddresses.map(fromWeb3JsPublicKey),
      },
    ],
  });
  const reference = createWeb3JsV0Message(payer, instruction, [
    createWeb3JsLookupTable(lookupTableKey, lookupTableAddresses),
  ]);
  t.is(fromInput.version, 0);
  t.deepEqual(bytes(fromInput.serialize()), bytes(reference.serialize()));
});
