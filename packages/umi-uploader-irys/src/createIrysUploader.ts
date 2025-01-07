import type { BaseWebIrys } from '@irys/web-upload/dist/types/base';
import type { BaseNodeIrys } from '@irys/upload/dist/types/base';
import {
  Commitment,
  Context,
  GenericFile,
  GenericFileTag,
  Keypair,
  Signer,
  SolAmount,
  UploaderInterface,
  UploaderUploadOptions,
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
import PromisePool from '@supercharge/promise-pool';
import {
  AssetUploadFailedError,
  IrysWithdrawError,
  FailedToConnectToIrysAddressError,
  FailedToInitializeIrysError,
  IrysAbortError,
} from './errors';
// PromisePool is a dependency the Irys client already requires, so using it here has no extra cost.

/**
 * This method is necessary to import the Irys package on both ESM and CJS modules.
 * Without this, we get a different structure on each module:
 * - CJS: { default: [Getter], WebIrys: [Getter] }
 * - ESM: { default: { default: [Getter], WebIrys: [Getter] } }
 * This method fixes this by ensure there is not double default in the imported package.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
function _removeDoubleDefault<T>(pkg: T): T {
  if (
    pkg &&
    typeof pkg === 'object' &&
    'default' in pkg &&
    'default' in (pkg as any).default
  ) {
    return (pkg as any).default;
  }

  return pkg;
}

export type IrysUploader = UploaderInterface & {
  irys: () => Promise<BaseNodeIrys | BaseWebIrys>;
  getUploadPriceFromBytes: (bytes: number) => Promise<SolAmount>;
  getBalance: () => Promise<SolAmount>;
  fund: (amount: SolAmount, skipBalanceCheck: boolean) => Promise<void>;
  withdrawAll: (amount: SolAmount) => Promise<void>;
  withdraw: (amount: SolAmount) => Promise<void>;
};

export type IrysUploaderOptions = {
  address?: string;
  timeout?: number;
  providerUrl?: string;
  priceMultiplier?: number;
  payer?: Signer;
  uploadConcurrency?: number;
};

export type IrysWalletAdapter = {
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

// Size of Irys transaction header.
const HEADER_SIZE = 2_000;

// Minimum file size for cost calculation.
const MINIMUM_SIZE = 80_000;

const gatewayUrl = (id: string) => `https://gateway.irys.xyz/${id}`;

export function createIrysUploader(
  context: Pick<Context, 'rpc' | 'payer' | 'eddsa'>,
  uploaderOptions: IrysUploaderOptions = {}
): IrysUploader {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  let _irys: BaseNodeIrys | BaseWebIrys | null = null;
  uploaderOptions = {
    providerUrl: context.rpc.getEndpoint(),
    ...uploaderOptions,
  };

  const getUploadPriceFromBytes = async (bytes: number): Promise<SolAmount> => {
    const irys = await getIrys();
    const price = await irys.getPrice(bytes);

    return bigNumberToAmount(
      price.multipliedBy(uploaderOptions.priceMultiplier ?? 1.1)
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

  const upload = async (
    files: GenericFile[],
    options?: UploaderUploadOptions
  ): Promise<string[]> => {
    const irys = await getIrys();
    const amount = await getUploadPrice(files);
    await fund(amount);

    const manifestMap = options?.manifest === true ? new Map() : undefined;

    const result = await PromisePool.for(files)
      .withConcurrency(uploaderOptions.uploadConcurrency ?? 10)
      .onTaskFinished((_, pool) =>
        options?.onProgress?.(pool.processedPercentage())
      )
      .process(async (file) => {
        if (options?.signal?.aborted) throw new IrysAbortError();

        const buffer = Buffer.from(file.buffer);
        const irysTx = irys.createTransaction(buffer, {
          tags: getGenericFileTagsWithContentType(file),
        });
        await irysTx.sign();
        const {
          status,
          data: { id },
        } = await irys.uploader.uploadTransaction(irysTx);

        if (status >= 300) throw new AssetUploadFailedError(status);

        manifestMap?.set(file.fileName, id);

        return id;
      });

    if (manifestMap) {
      const manifest = await irys.uploader.generateFolder({
        items: manifestMap,
      });
      const { id } = await irys.upload(JSON.stringify(manifest), {
        tags: [
          { name: 'Type', value: 'manifest' },
          { name: 'Content-Type', value: 'application/x.irys-manifest+json' },
          // ...(options?.manifestTags ?? []),
        ],
      });
      return [gatewayUrl(id)];
    }

    return result.results.map(gatewayUrl);
  };

  const uploadJson = async <T>(json: T): Promise<string> => {
    const file = createGenericFileFromJson(json);
    const uris = await upload([file]);
    return uris[0];
  };

  const getBalance = async (): Promise<SolAmount> => {
    const irys = await getIrys();
    const balance = await irys.getBalance();

    return bigNumberToAmount(balance);
  };

  const fund = async (
    amount: SolAmount,
    skipBalanceCheck = false
  ): Promise<void> => {
    const irys = await getIrys();
    let toFund = amountToBigNumber(amount);

    if (!skipBalanceCheck) {
      const balance = await irys.getBalance();

      toFund = toFund.isGreaterThan(balance)
        ? toFund.minus(balance)
        : new BigNumber(0);
    }

    if (toFund.isLessThanOrEqualTo(0)) {
      return;
    }

    await irys.fund(toFund);
  };

  const withdrawAll = async (): Promise<void> => {
    const irys = await getIrys();
    const balance = await irys.getBalance();
    const minimumBalance = new BigNumber(5000);

    if (balance.isLessThan(minimumBalance)) {
      return;
    }

    await irys.withdrawAll();
  };

  const withdraw = async (amount: SolAmount): Promise<void> => {
    const irys = await getIrys();
    try {
      await irys.withdrawBalance(amountToBigNumber(amount));
    } catch (e: any) {
      throw new IrysWithdrawError(
        e instanceof Error ? e.message : e.toString()
      );
    }
  };

  const getIrys = async (): Promise<BaseWebIrys | BaseNodeIrys> => {
    const oldPayer = _irys?.getSigner().publicKey;
    const newPayer = uploaderOptions.payer ?? context.payer;
    if (
      oldPayer &&
      publicKey(new Uint8Array(oldPayer)) !== newPayer.publicKey
    ) {
      _irys = null;
    }

    if (!_irys) {
      _irys = await initIrys();
    }

    return _irys;
  };

  const initIrys = async (): Promise<BaseWebIrys | BaseNodeIrys> => {
    const token = 'solana';
    const defaultAddress =
      context.rpc.getCluster() === 'devnet'
        ? 'https://devnet.irys.xyz'
        : 'https://uploader.irys.xyz';
    const address = uploaderOptions?.address ?? defaultAddress;
    const irysOptions = {
      timeout: uploaderOptions.timeout,
      providerUrl: uploaderOptions.providerUrl,
    };

    const payer: Signer = uploaderOptions.payer ?? context.payer;

    // If in node use node irys, else use web irys.
    const isNode =
      // eslint-disable-next-line no-prototype-builtins
      typeof window === 'undefined' || window.process?.hasOwnProperty('type');

    let irys;
    if (isNode && isKeypairSigner(payer))
      irys = await initNodeIrys(address, payer, irysOptions);
    else {
      irys = await initWebIrys(address, payer, irysOptions);
    }

    try {
      // Check for valid irys node.
      await irys.utils.getBundlerAddress(token);
    } catch (error) {
      throw new FailedToConnectToIrysAddressError(address, error as Error);
    }

    return irys;
  };

  const initNodeIrys = async (
    address: string,
    keypair: Keypair,
    options: any
  ): Promise<BaseNodeIrys> => {
    const bPackage = _removeDoubleDefault(await import('@irys/upload'));
    const cPackage = _removeDoubleDefault(await import('@irys/upload-solana'));
    return bPackage
      .Uploader(cPackage.Solana)
      .bundlerUrl(address)
      .withWallet(keypair.secretKey)
      .withIrysConfig(options)
      .build();
  };

  const initWebIrys = async (
    address: string,
    payer: Signer,
    options: any
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

    const bPackage = _removeDoubleDefault(await import('@irys/web-upload'));
    const cPackage = _removeDoubleDefault(
      await import('@irys/web-upload-solana')
    );

    const irys = await bPackage
      .WebUploader(cPackage.WebSolana)
      .withProvider(wallet)
      .bundlerUrl(address)
      .withIrysConfig(options)
      .build();

    try {
      // Try to initiate irys.
      await irys.ready();
    } catch (error) {
      throw new FailedToInitializeIrysError(error as Error);
    }

    return irys;
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
    irys: getIrys,
  };
}

export const isIrysUploader = (
  uploader: UploaderInterface
): uploader is IrysUploader =>
  'irys' in uploader &&
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
