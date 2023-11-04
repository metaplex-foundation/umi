// eslint-disable-next-line import/no-named-default
import type { default as NodeBundlr, WebBundlr } from '@bundlr-network/client';
import {
  Commitment,
  Context,
  GenericFile,
  GenericFileTag,
  Keypair,
  Signer,
  SolAmount,
  UploaderInterface,
  base58,
  createGenericFileFromJson,
  createSignerFromKeypair,
  isKeypairSigner,
  lamports,
  publicKey,
  signTransaction,
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
  PublicKey as Web3JsPublicKey,
  SendOptions as Web3JsSendOptions,
  Signer as Web3JsSigner,
  Transaction as Web3JsTransaction,
  TransactionSignature as Web3JsTransactionSignature,
} from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { Buffer } from 'buffer';
import {
  AssetUploadFailedError,
  BundlrWithdrawError,
  FailedToConnectToBundlrAddressError,
  FailedToInitializeBundlrError,
} from './errors';

/**
 * This method is necessary to import the Bundlr package on both ESM and CJS modules.
 * Without this, we get a different structure on each module:
 * - CJS: { default: [Getter], WebBundlr: [Getter] }
 * - ESM: { default: { default: [Getter], WebBundlr: [Getter] } }
 * This method fixes this by ensure there is not double default in the imported package.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
function _removeDoubleDefault(pkg: any) {
  if (
    pkg &&
    typeof pkg === 'object' &&
    'default' in pkg &&
    'default' in pkg.default
  ) {
    return pkg.default;
  }

  return pkg;
}

export type BundlrUploader = UploaderInterface & {
  bundlr: () => Promise<NodeBundlr | WebBundlr>;
  getUploadPriceFromBytes: (bytes: number) => Promise<SolAmount>;
  getBalance: () => Promise<SolAmount>;
  fund: (amount: SolAmount, skipBalanceCheck: boolean) => Promise<void>;
  withdrawAll: (amount: SolAmount) => Promise<void>;
  withdraw: (amount: SolAmount) => Promise<void>;
};

export type BundlrUploaderOptions = {
  address?: string;
  timeout?: number;
  providerUrl?: string;
  priceMultiplier?: number;
  payer?: Signer;
};

export type BundlrWalletAdapter = {
  publicKey: Web3JsPublicKey | null;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
  signTransaction?: (
    transaction: Web3JsTransaction
  ) => Promise<Web3JsTransaction>;
  signAllTransactions?: (
    transactions: Web3JsTransaction[]
  ) => Promise<Web3JsTransaction[]>;
  sendTransaction: (
    transaction: Web3JsTransaction,
    connection: Web3JsConnection,
    options?: Web3JsSendOptions & { signers?: Web3JsSigner[] }
  ) => Promise<Web3JsTransactionSignature>;
};

// Size of Bundlr transaction header.
const HEADER_SIZE = 2_000;

// Minimum file size for cost calculation.
const MINIMUM_SIZE = 80_000;

export function createBundlrUploader(
  context: Pick<Context, 'rpc' | 'payer' | 'eddsa'>,
  options: BundlrUploaderOptions = {}
): BundlrUploader {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  let _bundlr: WebBundlr | NodeBundlr | null = null;
  options = {
    providerUrl: context.rpc.getEndpoint(),
    ...options,
  };

  const getUploadPriceFromBytes = async (bytes: number): Promise<SolAmount> => {
    const bundlr = await getBundlr();
    const price = await bundlr.getPrice(bytes);

    return bigNumberToAmount(
      price.multipliedBy(options.priceMultiplier ?? 1.1)
    );
  };

  const getUploadPrice = async (files: GenericFile[]): Promise<SolAmount> => {
    const bytes: number = files.reduce(
      (sum, file) =>
        sum + HEADER_SIZE + Math.max(MINIMUM_SIZE, file.buffer.byteLength),
      0
    );

    return getUploadPriceFromBytes(bytes);
  };

  const upload = async (files: GenericFile[]): Promise<string[]> => {
    const bundlr = await getBundlr();
    const amount = await getUploadPrice(files);
    await fund(amount);

    const promises = files.map(async (file) => {
      const buffer = Buffer.from(file.buffer);
      const { status, data } = await bundlr.uploader.upload(buffer, {
        tags: getGenericFileTagsWithContentType(file),
      });

      if (status >= 300) {
        throw new AssetUploadFailedError(status);
      }

      return `https://arweave.net/${data.id}`;
    });

    return Promise.all(promises);
  };

  const uploadJson = async <T>(json: T): Promise<string> => {
    const file = createGenericFileFromJson(json);
    const uris = await upload([file]);
    return uris[0];
  };

  const getBalance = async (): Promise<SolAmount> => {
    const bundlr = await getBundlr();
    const balance = await bundlr.getLoadedBalance();

    return bigNumberToAmount(balance);
  };

  const fund = async (
    amount: SolAmount,
    skipBalanceCheck = false
  ): Promise<void> => {
    const bundlr = await getBundlr();
    let toFund = amountToBigNumber(amount);

    if (!skipBalanceCheck) {
      const balance = await bundlr.getLoadedBalance();

      toFund = toFund.isGreaterThan(balance)
        ? toFund.minus(balance)
        : new BigNumber(0);
    }

    if (toFund.isLessThanOrEqualTo(0)) {
      return;
    }

    await bundlr.fund(toFund);
  };

  const withdrawAll = async (): Promise<void> => {
    // TODO(loris): Replace with "withdrawAll" when available on Bundlr.
    const bundlr = await getBundlr();
    const balance = await bundlr.getLoadedBalance();
    const minimumBalance = new BigNumber(5000);

    if (balance.isLessThan(minimumBalance)) {
      return;
    }

    const balanceToWithdraw = balance.minus(minimumBalance);
    await withdraw(bigNumberToAmount(balanceToWithdraw));
  };

  const withdraw = async (amount: SolAmount): Promise<void> => {
    const bundlr = await getBundlr();

    const { status } = await bundlr.withdrawBalance(amountToBigNumber(amount));

    if (status >= 300) {
      throw new BundlrWithdrawError(status);
    }
  };

  const getBundlr = async (): Promise<WebBundlr | NodeBundlr> => {
    const oldPayer = _bundlr?.getSigner().publicKey;
    const newPayer = options.payer ?? context.payer;
    if (
      oldPayer &&
      publicKey(new Uint8Array(oldPayer)) !== newPayer.publicKey
    ) {
      _bundlr = null;
    }

    if (!_bundlr) {
      _bundlr = await initBundlr();
    }

    return _bundlr;
  };

  const initBundlr = async (): Promise<WebBundlr | NodeBundlr> => {
    const currency = 'solana';
    const defaultAddress =
      context.rpc.getCluster() === 'devnet'
        ? 'https://devnet.bundlr.network'
        : 'https://node1.bundlr.network';
    const address = options?.address ?? defaultAddress;
    const bundlrOptions = {
      timeout: options.timeout,
      providerUrl: options.providerUrl,
    };

    const payer: Signer = options.payer ?? context.payer;

    // If in node use node bundlr, else use web bundlr.
    const isNode =
      // eslint-disable-next-line no-prototype-builtins
      typeof window === 'undefined' || window.process?.hasOwnProperty('type');

    let bundlr;
    if (isNode && isKeypairSigner(payer))
      bundlr = await initNodeBundlr(address, currency, payer, bundlrOptions);
    else {
      bundlr = await initWebBundlr(address, currency, payer, bundlrOptions);
    }

    try {
      // Check for valid bundlr node.
      await bundlr.utils.getBundlerAddress(currency);
    } catch (error) {
      throw new FailedToConnectToBundlrAddressError(address, error as Error);
    }

    return bundlr;
  };

  const initNodeBundlr = async (
    address: string,
    currency: string,
    keypair: Keypair,
    options: any
  ): Promise<NodeBundlr> => {
    const bPackage = _removeDoubleDefault(
      await import('@bundlr-network/client')
    );
    // eslint-disable-next-line new-cap
    return new bPackage.default(address, currency, keypair.secretKey, options);
  };

  const initWebBundlr = async (
    address: string,
    currency: string,
    payer: Signer,
    options: any
  ): Promise<WebBundlr> => {
    const wallet: BundlrWalletAdapter = {
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

    const bPackage = _removeDoubleDefault(
      await import('@bundlr-network/client')
    );
    const bundlr = new bPackage.WebBundlr(address, currency, wallet, options);

    try {
      // Try to initiate bundlr.
      await bundlr.ready();
    } catch (error) {
      throw new FailedToInitializeBundlrError(error as Error);
    }

    return bundlr;
  };

  return {
    getUploadPriceFromBytes,
    getUploadPrice,
    upload,
    uploadJson,
    getBalance,
    fund,
    withdrawAll,
    withdraw,
    bundlr: getBundlr,
  };
}

export const isBundlrUploader = (
  uploader: UploaderInterface
): uploader is BundlrUploader =>
  'bundlr' in uploader &&
  'getBalance' in uploader &&
  'fund' in uploader &&
  'withdrawAll' in uploader;

const bigNumberToAmount = (bigNumber: BigNumber): SolAmount =>
  lamports(bigNumber.decimalPlaces(0).toString());

const amountToBigNumber = (amount: SolAmount): BigNumber =>
  new BigNumber(amount.basisPoints.toString());

const getGenericFileTagsWithContentType = (
  file: GenericFile
): GenericFileTag[] => {
  if (!file.contentType) {
    return file.tags;
  }

  return [{ name: 'Content-Type', value: file.contentType }, ...file.tags];
};
