/* eslint-disable import/no-extraneous-dependencies */
import {
  createUmi as baseCreateUmi,
  generateSigner,
  TransactionMessage,
  Umi,
} from '@metaplex-foundation/umi-core';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import { beetSerializer } from '@metaplex-foundation/umi-serializer-beet';
import {
  fromWeb3JsMessage,
  toWeb3JsPublicKey,
} from '@metaplex-foundation/umi-web3js-adapters';
import {
  AddressLookupTableAccount as Web3JsAddressLookupTableAccount,
  Message as Web3JsLegacyMessage,
  MessageV0 as Web3JsV0Message,
  SystemProgram,
} from '@solana/web3.js';
import { web3JsTransactionFactory } from '../src';

export const createUmi = (): Umi =>
  baseCreateUmi()
    .use(beetSerializer())
    .use(web3JsEddsa())
    .use(web3JsTransactionFactory());

export const createLegacyMessage = (
  umi: Umi
): [TransactionMessage, Web3JsLegacyMessage] => {
  const fromPubkey = toWeb3JsPublicKey(generateSigner(umi).publicKey);
  const toPubkey = toWeb3JsPublicKey(generateSigner(umi).publicKey);
  const web3JsLegacyMessage = Web3JsLegacyMessage.compile({
    payerKey: toWeb3JsPublicKey(generateSigner(umi).publicKey),
    instructions: [
      SystemProgram.transfer({ fromPubkey, toPubkey, lamports: 1_000_000_000 }),
    ],
    recentBlockhash: '11111111111111111111111111111111',
  });
  return [fromWeb3JsMessage(web3JsLegacyMessage), web3JsLegacyMessage];
};

export const createV0Message = (
  umi: Umi
): [TransactionMessage, Web3JsV0Message] => {
  const fromPubkey = toWeb3JsPublicKey(generateSigner(umi).publicKey);
  const toPubkey = toWeb3JsPublicKey(generateSigner(umi).publicKey);
  const web3JsV0Message = Web3JsV0Message.compile({
    payerKey: toWeb3JsPublicKey(generateSigner(umi).publicKey),
    instructions: [
      SystemProgram.transfer({ fromPubkey, toPubkey, lamports: 1_000_000_000 }),
    ],
    recentBlockhash: '11111111111111111111111111111111',
    addressLookupTableAccounts: [
      new Web3JsAddressLookupTableAccount({
        key: toWeb3JsPublicKey(generateSigner(umi).publicKey),
        state: {
          deactivationSlot: BigInt(`0x${'ff'.repeat(8)}`),
          lastExtendedSlot: 0,
          lastExtendedSlotStartIndex: 0,
          addresses: [
            toPubkey,
            toWeb3JsPublicKey(generateSigner(umi).publicKey),
          ],
        },
      }),
    ],
  });
  return [fromWeb3JsMessage(web3JsV0Message), web3JsV0Message];
};
