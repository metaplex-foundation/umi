/* eslint-disable import/no-extraneous-dependencies */
import {
  createUmi as baseCreateUmi,
  generateSigner,
  Instruction,
  KeypairSigner,
  Transaction,
  TransactionMessage,
  Umi,
} from '@metaplex-foundation/umi';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import { dataViewSerializer } from '@metaplex-foundation/umi-serializer-data-view';
import {
  fromWeb3JsInstruction,
  fromWeb3JsMessage,
  fromWeb3JsTransaction,
  toWeb3JsKeypair,
  toWeb3JsPublicKey,
  toWeb3JsTransaction,
} from '@metaplex-foundation/umi-web3js-adapters';
import {
  AddressLookupTableAccount as Web3JsAddressLookupTableAccount,
  Message as Web3JsLegacyMessage,
  MessageV0 as Web3JsV0Message,
  SystemProgram,
  TransactionInstruction as Web3JsInstruction,
  VersionedTransaction as Web3JsTransaction,
} from '@solana/web3.js';
import { web3JsTransactionFactory } from '../src';

export const createUmi = (): Umi =>
  baseCreateUmi()
    .use(dataViewSerializer())
    .use(web3JsEddsa())
    .use(web3JsTransactionFactory());

export const createTransferInstruction = (
  umi: Umi
): [Instruction, Web3JsInstruction, KeypairSigner[]] => {
  const signer = generateSigner(umi);
  const web3JsInstruction = SystemProgram.transfer({
    fromPubkey: toWeb3JsPublicKey(signer.publicKey),
    toPubkey: toWeb3JsPublicKey(generateSigner(umi).publicKey),
    lamports: 1_000_000_000,
  });
  const instruction = fromWeb3JsInstruction(web3JsInstruction);
  return [instruction, web3JsInstruction, [signer]];
};

export const createLegacyMessage = (
  umi: Umi
): [TransactionMessage, Web3JsLegacyMessage, KeypairSigner[]] => {
  const payer = generateSigner(umi);
  const [, web3JsInstruction, signers] = createTransferInstruction(umi);
  const web3JsLegacyMessage = Web3JsLegacyMessage.compile({
    payerKey: toWeb3JsPublicKey(payer.publicKey),
    instructions: [web3JsInstruction],
    recentBlockhash: '11111111111111111111111111111111',
  });
  return [
    fromWeb3JsMessage(web3JsLegacyMessage),
    web3JsLegacyMessage,
    [payer, ...signers],
  ];
};

export const createV0Message = (
  umi: Umi
): [TransactionMessage, Web3JsV0Message, KeypairSigner[]] => {
  const payer = generateSigner(umi);
  const [, web3JsInstruction, signers] = createTransferInstruction(umi);
  const web3JsV0Message = Web3JsV0Message.compile({
    payerKey: toWeb3JsPublicKey(payer.publicKey),
    instructions: [web3JsInstruction],
    recentBlockhash: '11111111111111111111111111111111',
    addressLookupTableAccounts: [
      new Web3JsAddressLookupTableAccount({
        key: toWeb3JsPublicKey(generateSigner(umi).publicKey),
        state: {
          deactivationSlot: BigInt(`0x${'ff'.repeat(8)}`),
          lastExtendedSlot: 0,
          lastExtendedSlotStartIndex: 0,
          addresses: [
            web3JsInstruction.keys[1].pubkey,
            toWeb3JsPublicKey(generateSigner(umi).publicKey),
          ],
        },
      }),
    ],
  });
  return [
    fromWeb3JsMessage(web3JsV0Message),
    web3JsV0Message,
    [payer, ...signers],
  ];
};

export const createV0Transaction = (
  umi: Umi
): [Transaction, Web3JsTransaction] => {
  const [, web3JsV0Message, signers] = createV0Message(umi);
  const web3JsTransaction = new Web3JsTransaction(web3JsV0Message);
  web3JsTransaction.sign(signers.map(toWeb3JsKeypair));
  return [fromWeb3JsTransaction(web3JsTransaction), web3JsTransaction];
};

export const createOversizedTransaction = (
  umi: Umi
): [Transaction, Web3JsTransaction] => {
  const payer = generateSigner(umi);
  const signers = [payer] as KeypairSigner[];
  const createInstruction = () => {
    const [instruction, , ixSigners] = createTransferInstruction(umi);
    signers.push(...ixSigners);
    return instruction;
  };
  const unsignedTransaction: Transaction = umi.transactions.create({
    version: 0,
    payer: payer.publicKey,
    instructions: Array.from({ length: 100 }, createInstruction),
    blockhash: '11111111111111111111111111111111',
  });
  const transaction: Transaction = {
    ...unsignedTransaction,
    signatures: signers.map((signer) =>
      umi.eddsa.sign(unsignedTransaction.serializedMessage, signer)
    ),
  };
  return [transaction, toWeb3JsTransaction(transaction)];
};
