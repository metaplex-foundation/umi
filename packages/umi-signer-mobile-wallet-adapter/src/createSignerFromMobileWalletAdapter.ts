import type { MobileSigner, Transaction } from '@metaplex-foundation/umi';
import {
  publicKey,
  type PublicKey,
} from '@metaplex-foundation/umi-public-keys';
import {
  fromWeb3JsTransaction,
  toWeb3JsTransaction,
} from '@metaplex-foundation/umi-web3js-adapters';
import type {
  Account,
  AuthorizationResult,
  AuthToken,
  Cluster,
} from '@solana-mobile/mobile-wallet-adapter-protocol';
import type { Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { VersionedTransaction } from '@solana/web3.js';
import { base58, base64 } from '@metaplex-foundation/umi-serializers';
import {
  MobileWalletSigningError,
  UninitializedMobileWalletError,
} from './errors';

export type MobileWalletAdapterConfig = {
  appIdentity: Readonly<{
    uri?: string;
    icon?: string;
    name?: string;
  }>;
  cluster?: Cluster;
};

type Authorization = Readonly<{
  accounts: Account[];
  authToken: AuthToken;
  selectedAccount: Account;
}>;

function transformAuthorizationResult(
  result: AuthorizationResult
): Authorization {
  return {
    accounts: result.accounts,
    authToken: result.auth_token,
    selectedAccount: result.accounts[0],
  };
}

export const createSignerFromMobileWalletAdapter = (
  config: MobileWalletAdapterConfig
): MobileSigner => {
  let authorization: Authorization | null = null;

  return {
    isConnected: () => authorization?.selectedAccount != null,

    connect: async () => {
      console.log('Starting connect...');
      await transact(async (wallet: Web3MobileWallet) => {
        console.log('Inside transact, authorizing...');
        const auth = await wallet.authorize({
          identity: config.appIdentity,
          cluster: config.cluster ?? 'devnet',
        });

        if (!auth.accounts?.[0]) {
          console.error('No accounts in authorization result');
          throw new UninitializedMobileWalletError();
        }

        authorization = transformAuthorizationResult(auth);
        console.log(
          'Authorization successful, selected account:',
          authorization.selectedAccount.address
        );
        return authorization.selectedAccount;
      });
    },

    disconnect: async () => {
      const currentAuth = authorization;
      if (!currentAuth?.authToken) return;
      await transact(async (wallet: Web3MobileWallet) => {
        await wallet.deauthorize({ auth_token: currentAuth.authToken });
        authorization = null;
      });
    },

    signMessage: async (message: Uint8Array): Promise<Uint8Array> => {
      console.log('Starting signMessage...');
      const result = await transact(async (wallet: Web3MobileWallet) => {
        console.log('Inside transact, reauthorizing...');
        // Reauthorize before signing
        const auth = await wallet.authorize({
          identity: config.appIdentity,
          cluster: config.cluster ?? 'devnet',
        });

        console.log('Authorization result:', {
          accounts: auth.accounts?.map((acc) => acc.address),
          authToken: auth.auth_token ? '[present]' : '[missing]',
        });

        if (!auth.accounts?.[0]) {
          console.error('No accounts in authorization result');
          throw new UninitializedMobileWalletError();
        }

        authorization = transformAuthorizationResult(auth);
        console.log(
          'Transformed authorization, selected account:',
          authorization.selectedAccount.address
        );

        console.log('Calling signMessages...');
        const response = await wallet.signMessages({
          addresses: [authorization.selectedAccount.address],
          payloads: [message],
        });
        console.log('signMessages response received');

        if (!response?.[0]) {
          console.error('No signed payloads in response');
          throw new MobileWalletSigningError('sign message');
        }
        const signedMessage = response[0];
        console.log('Got signed payload');

        return signedMessage;
      });
      console.log('payload', result);
      console.log('Signing complete, returning result');
      return result;
    },

    signTransaction: async (transaction: Transaction): Promise<Transaction> => {
      console.log('Starting signTransaction...');
      const web3JsTransaction = toWeb3JsTransaction(transaction);

      const signedPayload = await transact(async (wallet: Web3MobileWallet) => {
        // Reauthorize before signing
        if (!authorization) {
          const authRes = await wallet.authorize({
            identity: config.appIdentity,
            cluster: config.cluster ?? 'devnet',
          });
          if (!authRes.accounts?.[0]) {
            throw new UninitializedMobileWalletError();
          }
          authorization = transformAuthorizationResult(authRes);
        } else {
          const authRes = await wallet.reauthorize({
            auth_token: authorization.authToken,
            identity: config.appIdentity,
          });
          if (!authRes.accounts?.[0]) {
            throw new UninitializedMobileWalletError();
          }
          authorization = transformAuthorizationResult(authRes);
        }

        const response = await wallet.signTransactions({
          transactions: [web3JsTransaction],
        });

        const signed = response;
        if (!signed?.[0]) {
          throw new MobileWalletSigningError('sign transaction');
        }

        return fromWeb3JsTransaction(signed[0]);
      });

      return signedPayload;
    },

    signAllTransactions: async (
      transactions: Transaction[]
    ): Promise<Transaction[]> => {
      const web3JsTransactions = transactions.map(toWeb3JsTransaction);
      const serializedTxs = web3JsTransactions.map((tx) =>
        Buffer.from(tx.serialize()).toString('base64')
      );

      const signedPayloads = await transact(
        async (wallet: Web3MobileWallet) => {
          // Reauthorize before signing
          const auth = await wallet.authorize({
            identity: config.appIdentity,
            cluster: config.cluster ?? 'devnet',
          });

          if (!auth.accounts?.[0]) {
            throw new UninitializedMobileWalletError();
          }

          authorization = transformAuthorizationResult(auth);

          const response = await (wallet as any).signTransactions({
            transactions: serializedTxs,
          });

          const signed = response as string[];
          if (!signed?.length) {
            throw new MobileWalletSigningError('sign all transactions');
          }

          return signed;
        }
      );

      return signedPayloads.map((signedPayload) => {
        const signedTx = VersionedTransaction.deserialize(
          new Uint8Array(Buffer.from(signedPayload, 'base64'))
        );
        return fromWeb3JsTransaction(signedTx);
      });
    },

    get publicKey(): PublicKey {
      if (!authorization?.selectedAccount?.address) {
        throw new UninitializedMobileWalletError();
      }

      const serializedAddress = base64.serialize(
        authorization.selectedAccount.address
      );
      return publicKey(base58.deserialize(serializedAddress));
    },

    get authToken(): string {
      if (!authorization?.authToken) {
        throw new UninitializedMobileWalletError();
      }
      return authorization.authToken;
    },
  };
};
