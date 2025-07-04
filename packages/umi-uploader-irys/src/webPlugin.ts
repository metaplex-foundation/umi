import {
  Commitment,
  Signer,
  base58,
  createSignerFromKeypair,
  signTransaction,
  Context,

} from '@metaplex-foundation/umi';
import {
  fromWeb3JsKeypair,
  fromWeb3JsLegacyTransaction,
  toWeb3JsLegacyTransaction,
  toWeb3JsPublicKey,
} from '@metaplex-foundation/umi-web3js-adapters';
import {
  Connection as Web3JsConnection,
  Keypair as Web3JsKeypair,
  SendOptions as Web3JsSendOptions,
  Signer as Web3JsSigner,
  Transaction as Web3JsTransaction,
  TransactionSignature as Web3JsTransactionSignature,
} from '@solana/web3.js';

import {WebUploader} from "@irys/web-upload"
import {WebSolana} from "@irys/web-upload-solana"
import BaseWebIrys from '@irys/web-upload/dist/types/base';
import type { UmiPlugin } from '@metaplex-foundation/umi';
import { IrysWalletAdapter , createBaseIrysUploader as CIU, IrysUploaderOptions, IrysUploader } from './createIrysUploader';
import {
  FailedToInitializeIrysError,
} from './errors';


export const irysUploader = (options?: IrysUploaderOptions): UmiPlugin => ({
  install(umi) {
    umi.uploader = createIrysUploader(umi, options);
  },
});

export function createIrysUploader(
  context: Pick<Context, 'rpc' | 'payer' | 'eddsa'>,
  uploaderOptions: IrysUploaderOptions = {}
): IrysUploader {
  return CIU(initWebIrys, context, uploaderOptions)
}

  
export const initWebIrys = async (
    address: string,
    payer: Signer,
    options: any,
    context: any
  ): Promise<BaseWebIrys> => {
    const wallet: IrysWalletAdapter = {
      publicKey: toWeb3JsPublicKey(payer.publicKey),
      signMessage: (message: Uint8Array) => payer.signMessage(message),
      signTransaction: async (web3JsTransaction: Web3JsTransaction) =>
        toWeb3JsLegacyTransaction(
          await payer.signTransaction(
            fromWeb3JsLegacyTransaction(web3JsTransaction)
          )
        ),
      signAllTransactions: async (web3JsTransactions: Web3JsTransaction[]) => {
        const transactions = web3JsTransactions.map(
          fromWeb3JsLegacyTransaction
        );
        const signedTransactions = await payer.signAllTransactions(
          transactions
        );
        return signedTransactions.map(toWeb3JsLegacyTransaction);
      },
      sendTransaction: async (
        web3JsTransaction: Web3JsTransaction,
        connection: Web3JsConnection,
        options: Web3JsSendOptions & { signers?: Web3JsSigner[] } = {}
      ): Promise<Web3JsTransactionSignature> => {
        const { signers: web3JsSigners = [], ...sendOptions } = options;
        const signers = web3JsSigners.map((web3JsSigner) =>
          createSignerFromKeypair(
            context,
            fromWeb3JsKeypair(
              Web3JsKeypair.fromSecretKey(web3JsSigner.secretKey)
            )
          )
        );

        let transaction = fromWeb3JsLegacyTransaction(web3JsTransaction);
        transaction = await signTransaction(transaction, [payer, ...signers]);

        const signature = await context.rpc.sendTransaction(transaction, {
          ...sendOptions,
          preflightCommitment: sendOptions.preflightCommitment as Commitment,
        });

        return base58.deserialize(signature)[0];
      },
    };

    try {
    return await WebUploader(WebSolana)
      .withProvider(wallet)
      .bundlerUrl(address)
      .withIrysConfig(options)
      .build();
    } catch (error) {
      throw new FailedToInitializeIrysError(error as Error);
    }

  };