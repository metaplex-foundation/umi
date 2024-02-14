/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-promise-executor-return */
import test from 'ava';
import { base58 } from '@metaplex-foundation/umi-serializers-encodings';
import { TransactionBuilder, generatedSignerIdentity, publicKey, sol } from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { parseInstructions } from '../src';
import { transferSol } from './_setup';

test('it can parse a transaction', async (t) => {
  const umi = createUmi("http://localhost:8899")
    .use(generatedSignerIdentity());
  await umi.rpc.airdrop(umi.identity.publicKey, sol(1), { commitment: 'finalized' });
  const instructionA = transferSol(umi, { from: umi.identity, lamports: 100 });
  const instructionB = transferSol(umi, { from: umi.identity, lamports: 1_000 });
  const builder = new TransactionBuilder().add(instructionA).add(instructionB);
  const tx = await builder.sendAndConfirm(umi, { send: { skipPreflight: true } });

  const ixes = await parseInstructions(umi, tx.signature);
  // console.log(JSON.stringify(ixes, replacer, 2));

  t.assert(ixes[0].programId === publicKey('11111111111111111111111111111111'));
  t.assert(ixes[0].keys[0].pubkey === umi.identity.publicKey);
  t.assert(ixes[0].data[0] === base58.serialize("2j")[0]);
  t.assert(ixes[1].programId === publicKey('11111111111111111111111111111111'));
  t.assert(ixes[1].keys[0].pubkey === umi.identity.publicKey);
  t.assert(ixes[1].data[0] === base58.serialize("JF")[0]);
});

// function replacer(key: string, value: any) {
//   if (key === 'data') {
//     return base58.deserialize(value)[0];
//   }
//   return value;
// }