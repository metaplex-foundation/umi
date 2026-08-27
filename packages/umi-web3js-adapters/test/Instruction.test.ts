import test from 'ava';
import { fromWeb3JsInstruction, toWeb3JsInstruction } from '../src';
import {
  bytes,
  createWeb3JsTransferInstruction,
  generateWeb3JsKeypair,
} from './_setup';

test('it converts a web3.js instruction to a umi instruction', async (t) => {
  const from = (await generateWeb3JsKeypair()).publicKey;
  const to = (await generateWeb3JsKeypair()).publicKey;
  const web3JsInstruction = createWeb3JsTransferInstruction(from, to);
  const umiInstruction = fromWeb3JsInstruction(web3JsInstruction);

  t.is(web3JsInstruction.programId.toBase58(), umiInstruction.programId);
  t.is(umiInstruction.keys.length, web3JsInstruction.keys.length);
  umiInstruction.keys.forEach((key, index) => {
    const web3JsKey = web3JsInstruction.keys[index];
    t.is(web3JsKey.pubkey.toBase58(), key.pubkey);
    t.is(key.isSigner, web3JsKey.isSigner);
    t.is(key.isWritable, web3JsKey.isWritable);
  });
  t.true(umiInstruction.data instanceof Uint8Array);
  t.deepEqual(bytes(umiInstruction.data), bytes(web3JsInstruction.data));
});

test('it converts a umi instruction to a web3.js instruction', async (t) => {
  const from = (await generateWeb3JsKeypair()).publicKey;
  const to = (await generateWeb3JsKeypair()).publicKey;
  const umiInstruction = fromWeb3JsInstruction(
    createWeb3JsTransferInstruction(from, to)
  );
  const web3JsInstruction = toWeb3JsInstruction(umiInstruction);

  t.is(web3JsInstruction.programId.toBase58(), umiInstruction.programId);
  web3JsInstruction.keys.forEach((key, index) => {
    const umiKey = umiInstruction.keys[index];
    t.is(key.pubkey.toBase58(), umiKey.pubkey);
    t.is(key.isSigner, umiKey.isSigner);
    t.is(key.isWritable, umiKey.isWritable);
  });
  t.deepEqual(bytes(web3JsInstruction.data), bytes(umiInstruction.data));
});

test('it round-trips instructions byte-for-byte', async (t) => {
  const from = (await generateWeb3JsKeypair()).publicKey;
  const to = (await generateWeb3JsKeypair()).publicKey;
  const original = createWeb3JsTransferInstruction(from, to);
  const roundTripped = toWeb3JsInstruction(fromWeb3JsInstruction(original));

  t.true(roundTripped.programId.equals(original.programId));
  t.deepEqual(bytes(roundTripped.data), bytes(original.data));
  t.deepEqual(
    roundTripped.keys.map((key) => [
      key.pubkey.toBase58(),
      key.isSigner,
      key.isWritable,
    ]),
    original.keys.map((key) => [
      key.pubkey.toBase58(),
      key.isSigner,
      key.isWritable,
    ])
  );
});

test('converted instruction data is copied, not aliased', async (t) => {
  const from = (await generateWeb3JsKeypair()).publicKey;
  const to = (await generateWeb3JsKeypair()).publicKey;
  const web3JsInstruction = createWeb3JsTransferInstruction(from, to);
  const umiInstruction = fromWeb3JsInstruction(web3JsInstruction);

  const firstByte = umiInstruction.data[0];
  web3JsInstruction.data[0] = (web3JsInstruction.data[0] + 1) % 256;
  t.is(umiInstruction.data[0], firstByte);
});
