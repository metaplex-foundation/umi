import {
  SOLToTokenAmount,
  TurboAuthenticatedClient,
  TurboFactory,
  USD,
} from '@ardrive/turbo-sdk';

import {
  Context,
  GenericFile,
  GenericFileTag,
  Signer,
  SolAmount,
  UploaderInterface,
  UsdAmount,
  createGenericFileFromJson,
  isKeypairSigner,
  lamports,
  publicKey,
} from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';
import { toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';
import {
  LAMPORTS_PER_SOL,
  Connection as Web3JsConnection,
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
  FailedToConnectToArweaveAddressError,
} from './errors';

export type ArweaveUploader = UploaderInterface & {
  /** Get the current Arweave Turbo client */
  arweave: () => Promise<TurboAuthenticatedClient>;
  /** Get the SOL estimated price for an amount of bytes */
  getUploadPriceFromBytes: (bytes: number) => Promise<SolAmount>;
  /** Get the  current SOL equivalent balance from connected Arweave Bundler */
  getBalance: () => Promise<SolAmount>;
  /** Get the current Turbo Storage Credit balance from connected Arweave Bundler */
  getTurboStorageCreditBalance: () => Promise<BigNumber.Value>;
  /** Purchase non-refundable Turbo Storage Credits from the connected Arweave Bundler by transferring SOL to the Bundler's wallet */
  fund: (amount: SolAmount, skipBalanceCheck: boolean) => Promise<void>;
  /** Purchase non-refundable Turbo Storage Credits from the connected Arweave Bundler by generating a Stripe checkout session with a USD amount */
  getStripeCheckoutSession: (amount: UsdAmount) => Promise<{
    turboStorageCredits: BigNumber.Value;
    checkoutSessionUrl: string;
  }>;
};

export type ArweaveUploaderOptions = {
  solRpcUrl?: string;
  uploadServiceUrl?: string;
  paymentServiceUrl?: string;
  priceMultiplier?: number;
  payer?: Signer;
};

export type ArweaveWalletAdapter = {
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

// Size of Arweave transaction header.
const HEADER_SIZE = 2_000;

export function createArweaveUploader(
  context: Pick<Context, 'rpc' | 'payer' | 'eddsa'>,
  options: ArweaveUploaderOptions = {}
): ArweaveUploader {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  let _arweave: TurboAuthenticatedClient | null = null;
  options = {
    solRpcUrl: context.rpc.getEndpoint(),
    ...options,
  };

  const getUploadPriceFromBytes = async (bytes: number): Promise<SolAmount> => {
    const arweave = await getArweave();
    const wincPriceForOneSol = (
      await arweave.getWincForToken({
        tokenAmount: LAMPORTS_PER_SOL,
      })
    ).winc;

    const wincPriceForOneGiB = (
      await arweave.getUploadCosts({
        bytes: [2 ** 30],
      })
    )[0].winc;

    const solPriceForOneGiB =
      BigNumber(wincPriceForOneGiB).dividedBy(wincPriceForOneSol);

    const solPriceForOneByte = solPriceForOneGiB.dividedBy(2 ** 30);

    return bigNumberToAmount(
      solPriceForOneByte
        .multipliedBy(bytes)
        .multipliedBy(options.priceMultiplier ?? 1.1)
    );
  };

  const getUploadPrice = async (files: GenericFile[]): Promise<SolAmount> => {
    const bytes: number = files.reduce(
      (sum, file) => sum + HEADER_SIZE + file.buffer.byteLength,
      0
    );

    return getUploadPriceFromBytes(bytes);
  };

  const upload = async (files: GenericFile[]): Promise<string[]> => {
    const arweave = await getArweave();
    const amount = await getUploadPrice(files);
    await fund(amount);

    const promises = files.map(async (file) => {
      const buffer = Buffer.from(file.buffer);

      let dataItemId;
      try {
        const { id } = await arweave.uploadFile({
          fileStreamFactory: () => buffer,
          fileSizeFactory: () => buffer.byteLength,
          dataItemOpts: {
            tags: getGenericFileTagsWithContentType(file),
          },
        });
        dataItemId = id;
      } catch (error) {
        throw new AssetUploadFailedError(error);
      }

      return `https://arweave.net/${dataItemId}`;
    });

    return Promise.all(promises);
  };

  const uploadJson = async <T>(json: T): Promise<string> => {
    const file = createGenericFileFromJson(json);
    const uris = await upload([file]);
    return uris[0];
  };

  const getTurboStorageCreditBalance = async (): Promise<BigNumber.Value> => {
    const { winc } = await (await getArweave()).getBalance();
    return winc;
  };

  const getBalance = async (): Promise<SolAmount> => {
    const usersWincBalance = await getTurboStorageCreditBalance();

    const wincForOneSol = (
      await (
        await getArweave()
      ).getWincForToken({
        tokenAmount: LAMPORTS_PER_SOL,
      })
    ).winc;

    const solEquivalent = BigNumber(usersWincBalance).dividedBy(wincForOneSol);

    return bigNumberToAmount(solEquivalent);
  };

  const fund = async (
    amount: SolAmount,
    skipBalanceCheck = false
  ): Promise<void> => {
    let toFund = amountToBigNumber(amount);

    if (!skipBalanceCheck) {
      const solEquivalentBalance = amountToBigNumber(await getBalance());

      toFund = toFund.isGreaterThan(solEquivalentBalance)
        ? toFund.minus(solEquivalentBalance)
        : new BigNumber(0);
    }

    if (toFund.isLessThanOrEqualTo(0)) {
      return;
    }

    (await getArweave()).topUpWithTokens({
      tokenAmount: SOLToTokenAmount(toFund),
    });
  };

  const getStripeCheckoutSession = async (
    amount: UsdAmount
  ): Promise<{
    turboStorageCredits: BigNumber.Value;
    checkoutSessionUrl: string;
  }> => {
    const arweave = await getArweave();

    const { winc, url } = await arweave.createCheckoutSession({
      amount: USD(+amount.basisPoints.toString()),
      owner: toWeb3JsPublicKey(context.payer.publicKey).toBase58(),
    });
    if (!url) {
      throw new Error('Failed to create Stripe Checkout Session');
    }
    return {
      turboStorageCredits: BigNumber(winc).exponentiatedBy(12),
      checkoutSessionUrl: url,
    };
  };

  const getArweave = async (): Promise<TurboAuthenticatedClient> => {
    const oldPayer = await _arweave?.signer.getPublicKey();
    const newPayer = options.payer ?? context.payer;
    if (
      oldPayer &&
      publicKey(new Uint8Array(oldPayer)) !== newPayer.publicKey
    ) {
      _arweave = null;
    }

    if (!_arweave) {
      _arweave = await initArweave();
    }

    return _arweave;
  };

  const initArweave = async (): Promise<TurboAuthenticatedClient> => {
    const payer: Signer = options.payer ?? context.payer;

    let arweave;
    if (isKeypairSigner(payer)) {
      arweave = TurboFactory.authenticated({
        token: 'solana',
        privateKey: base58.deserialize(payer.secretKey)[0],
        gatewayUrl: options.solRpcUrl,
        uploadServiceConfig: { url: options.uploadServiceUrl },
        paymentServiceConfig: { url: options.paymentServiceUrl },
      });
    } else {
      arweave = await initWebTurbo(payer, options);
    }

    try {
      // Check for valid Arweave node.
      await arweave.getTurboCryptoWallets();
    } catch (error) {
      throw new FailedToConnectToArweaveAddressError(
        options.uploadServiceUrl ?? '',
        options.paymentServiceUrl ?? '',
        error as Error
      );
    }

    return arweave;
  };

  const initWebTurbo = async (
    payer: Signer,
    options: any
  ): Promise<TurboAuthenticatedClient> => {
    const wallet = {
      publicKey: toWeb3JsPublicKey(payer.publicKey),
      signMessage: payer.signMessage,
    };

    return TurboFactory.authenticated({
      token: 'solana',
      walletAdapter: wallet,
      gatewayUrl: options.solRpcUrl,
      uploadServiceConfig: { url: options.uploadServiceUrl },
      paymentServiceConfig: { url: options.paymentServiceUrl },
    });
  };

  return {
    getUploadPriceFromBytes,
    getUploadPrice,
    upload,
    uploadJson,
    getBalance,
    getTurboStorageCreditBalance,
    fund,
    getStripeCheckoutSession,
    arweave: getArweave,
  };
}

export const isArweaveUploader = (
  uploader: UploaderInterface
): uploader is ArweaveUploader =>
  'Arweave' in uploader && 'getBalance' in uploader && 'fund' in uploader;

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
