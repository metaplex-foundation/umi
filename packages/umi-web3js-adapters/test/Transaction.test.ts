import test from 'ava';
import {
  Transaction as Web3JsLegacyTransaction,
  VersionedTransaction as Web3JsVersionedTransaction,
} from '@solana/web3.js';
import {
  fromWeb3JsLegacyTransaction,
  fromWeb3JsTransaction,
  toWeb3JsLegacyTransaction,
  toWeb3JsTransaction,
} from '../src';
import {
  BLOCKHASH,
  bytes,
  createWeb3JsTransferInstruction,
  createWeb3JsV0Message,
  generateWeb3JsKeypair,
} from './_setup';

const ZERO_SIGNATURE = new Uint8Array(64);

test('it converts an unsigned versioned transaction to a umi transaction', async (t) => {
  const payer = await generateWeb3JsKeypair();
  const from = await generateWeb3JsKeypair();
  const to = (await generateWeb3JsKeypair()).publicKey;
  const message = createWeb3JsV0Message(
    payer.publicKey,
    createWeb3JsTransferInstruction(from.publicKey, to)
  );
  const web3JsTransaction = new Web3JsVersionedTransaction(message);
  const umiTransaction = fromWeb3JsTransaction(web3JsTransaction);

  t.deepEqual(bytes(umiTransaction.serializedMessage), bytes(message.serialize()));
  t.is(umiTransaction.message.version, 0);
  t.is(
    umiTransaction.signatures.length,
    message.header.numRequiredSignatures
  );
  umiTransaction.signatures.forEach((signature) => {
    t.deepEqual(bytes(signature), ZERO_SIGNATURE);
  });
});

test('it round-trips a signed versioned transaction byte-for-byte', async (t) => {
  const payer = await generateWeb3JsKeypair();
  const from = await generateWeb3JsKeypair();
  const to = (await generateWeb3JsKeypair()).publicKey;
  const message = createWeb3JsV0Message(
    payer.publicKey,
    createWeb3JsTransferInstruction(from.publicKey, to)
  );
  const original = new Web3JsVersionedTransaction(message);
  await original.sign([payer, from]);

  const umiTransaction = fromWeb3JsTransaction(original);
  t.is(umiTransaction.signatures.length, 2);
  umiTransaction.signatures.forEach((signature) => {
    t.is(signature.length, 64);
    t.notDeepEqual(bytes(signature), ZERO_SIGNATURE);
  });

  const roundTripped = toWeb3JsTransaction(umiTransaction);
  t.deepEqual(bytes(roundTripped.serialize()), bytes(original.serialize()));
});

test('it converts a fully signed legacy transaction to a umi transaction', async (t) => {
  const payer = await generateWeb3JsKeypair();
  const from = await generateWeb3JsKeypair();
  const to = (await generateWeb3JsKeypair()).publicKey;
  const web3JsTransaction = new Web3JsLegacyTransaction();
  web3JsTransaction.recentBlockhash = BLOCKHASH;
  web3JsTransaction.feePayer = payer.publicKey;
  web3JsTransaction.add(
    createWeb3JsTransferInstruction(from.publicKey, to)
  );
  await web3JsTransaction.sign(payer, from);

  const umiTransaction = fromWeb3JsLegacyTransaction(web3JsTransaction);
  const compiledMessage = web3JsTransaction.compileMessage();

  t.is(umiTransaction.message.version, 'legacy');
  t.deepEqual(
    bytes(umiTransaction.serializedMessage),
    bytes(compiledMessage.serialize())
  );

  // Signatures are positional, following the compiled account order.
  t.is(umiTransaction.signatures.length, 2);
  compiledMessage.accountKeys
    .slice(0, compiledMessage.header.numRequiredSignatures)
    .forEach((accountKey, index) => {
      const keyed = web3JsTransaction.signatures.find((pair) =>
        pair.publicKey.equals(accountKey)
      );
      t.truthy(keyed?.signature);
      t.deepEqual(
        bytes(umiTransaction.signatures[index]),
        bytes(keyed!.signature!)
      );
    });
});

test('it zero-pads missing signatures of partially signed legacy transactions', async (t) => {
  const payer = await generateWeb3JsKeypair();
  const from = await generateWeb3JsKeypair();
  const to = (await generateWeb3JsKeypair()).publicKey;
  const web3JsTransaction = new Web3JsLegacyTransaction();
  web3JsTransaction.recentBlockhash = BLOCKHASH;
  web3JsTransaction.feePayer = payer.publicKey;
  web3JsTransaction.add(
    createWeb3JsTransferInstruction(from.publicKey, to)
  );
  // Only the non-payer signer signs.
  await web3JsTransaction.partialSign(from);

  const umiTransaction = fromWeb3JsLegacyTransaction(web3JsTransaction);
  t.is(umiTransaction.signatures.length, 2);
  // The fee payer comes first in the account order and has not signed.
  t.deepEqual(bytes(umiTransaction.signatures[0]), ZERO_SIGNATURE);
  t.is(umiTransaction.signatures[1].length, 64);
  t.notDeepEqual(bytes(umiTransaction.signatures[1]), ZERO_SIGNATURE);
});

test('it round-trips a signed legacy transaction byte-for-byte', async (t) => {
  const payer = await generateWeb3JsKeypair();
  const from = await generateWeb3JsKeypair();
  const to = (await generateWeb3JsKeypair()).publicKey;
  const original = new Web3JsLegacyTransaction();
  original.recentBlockhash = BLOCKHASH;
  original.feePayer = payer.publicKey;
  original.add(createWeb3JsTransferInstruction(from.publicKey, to));
  await original.sign(payer, from);

  const roundTripped = toWeb3JsLegacyTransaction(
    fromWeb3JsLegacyTransaction(original)
  );
  t.deepEqual(
    bytes(
      await roundTripped.serialize({
        requireAllSignatures: true,
        verifySignatures: true,
      })
    ),
    bytes(
      await original.serialize({
        requireAllSignatures: true,
        verifySignatures: true,
      })
    )
  );
});
