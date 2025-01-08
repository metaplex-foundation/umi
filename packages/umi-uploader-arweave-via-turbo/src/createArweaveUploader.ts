import {
  lamportToTokenAmount,
  TurboAuthenticatedClient,
  TurboFactory,
  USD,
} from '@ardrive/turbo-sdk';

import {
  Amount,
  Context,
  GenericFile,
  GenericFileTag,
  Signer,
  SolAmount,
  UploaderInterface,
  UsdAmount,
  createGenericFileFromJson,
  createSignerFromKeypair,
  isKeypairSigner,
  publicKey,
  sol,
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
  /** Get the SOL and winc estimated price for an amount of bytes */
  getUploadPriceFromBytes: (
    bytes: number
  ) => Promise<{ solAmount: SolAmount; wincAmount: BigNumber }>;
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

const FREE_UPLOAD_BYTE_LIMIT = 107_520; // 105 KiB

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

  const getUploadPriceFromBytes = async (
    bytes: number
  ): Promise<{ solAmount: SolAmount; wincAmount: BigNumber }> => {
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
    const solPriceForGivenBytes = solPriceForOneByte.multipliedBy(bytes);
    const wincPriceForGivenBytes = BigNumber(wincPriceForOneGiB)
      .multipliedBy(bytes / 2 ** 30)
      .integerValue(BigNumber.ROUND_CEIL);

    const solAmount = sol(
      solPriceForGivenBytes
        .multipliedBy(options.priceMultiplier ?? 1.1)
        .toNumber()
    );
    return { solAmount, wincAmount: wincPriceForGivenBytes };
  };

  const getBytesFromFiles = (files: GenericFile[]): number =>
    files.reduce((sum, file) => sum + HEADER_SIZE + file.buffer.byteLength, 0);

  const getUploadSolAndWincPrice = async (
    files: GenericFile[]
  ): Promise<{ solAmount: SolAmount; wincAmount: BigNumber }> => {
    const bytes = getBytesFromFiles(files);

    if (bytes <= FREE_UPLOAD_BYTE_LIMIT) {
      return { solAmount: sol(0), wincAmount: new BigNumber(0) };
    }

    return getUploadPriceFromBytes(bytes);
  };

  const getUploadPrice = async (files: GenericFile[]): Promise<SolAmount> => {
    const { solAmount } = await getUploadSolAndWincPrice(files);
    return solAmount;
  };

  const upload = async (files: GenericFile[]): Promise<string[]> => {
    const arweave = await getArweave();
    const { solAmount, wincAmount } = await getUploadSolAndWincPrice(files);
    await fund(solAmount);

    const ephemeralKey = context.eddsa.generateKeypair();
    const ephemeralArweave = await initArweave(
      createSignerFromKeypair(context, ephemeralKey)
    );

    if (wincAmount.isGreaterThan(0)) {
      // Share credits to ephemeral key
      await arweave.shareCredits({
        approvedAddress: await ephemeralArweave.signer.getNativeAddress(),
        approvedWincAmount: wincAmount,
        // TODO: Could make configurable to prevent upload timeouts
        expiresBySeconds: 60 * 20, // Provides 20 minutes to upload, expiring any un-used credits back to the payer.
      });
    }

    const paidBy = await arweave.signer.getNativeAddress();
    const promises = files.map(async (file) => {
      const buffer = Buffer.from(file.buffer);

      let dataItemId;
      try {
        // Send uploads with ephemeral key to avoid signing each upload with the payer's key.
        const { id } = await ephemeralArweave.uploadFile({
          fileStreamFactory: () => buffer,
          fileSizeFactory: () => buffer.byteLength,
          dataItemOpts: {
            tags: getGenericFileTagsWithContentType(file),
            paidBy,
          },
        });
        dataItemId = id;
      } catch (error) {
        throw new AssetUploadFailedError(error);
      }

      const gateway =
        context.rpc.getCluster() === 'devnet'
          ? 'https://turbo.ardrive.dev/raw'
          : 'https://arweave.net';

      return `${gateway}/${dataItemId}`;
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

    return sol(solEquivalent.toNumber());
  };

  const fund = async (
    amount: SolAmount,
    skipBalanceCheck = false
  ): Promise<void> => {
    let toFundLamports = amountToBigNumber(amount);

    if (!skipBalanceCheck) {
      const lamportEquivalentBalance = amountToBigNumber(await getBalance());

      toFundLamports = toFundLamports.isGreaterThan(lamportEquivalentBalance)
        ? toFundLamports.minus(lamportEquivalentBalance)
        : new BigNumber(0);
    }

    if (toFundLamports.isLessThanOrEqualTo(0)) {
      return;
    }

    await (
      await getArweave()
    ).topUpWithTokens({
      tokenAmount: lamportToTokenAmount(toFundLamports),
    });
  };

  const getStripeCheckoutSession = async (
    amount: UsdAmount
  ): Promise<{
    turboStorageCredits: BigNumber.Value;
    checkoutSessionUrl: string;
  }> => {
    const arweave = await getArweave();

    const usdAmount = amountToBigNumber(amount).shiftedBy(-2).toNumber();

    const { winc, url } = await arweave.createCheckoutSession({
      amount: USD(usdAmount),
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

  const defaultAddresses =
    context.rpc.getCluster() === 'devnet'
      ? {
          uploadServiceUrl: 'https://upload.ardrive.dev',
          paymentServiceUrl: 'https://payment.ardrive.dev',
        }
      : {
          uploadServiceUrl: 'https://upload.ardrive.io',
          paymentServiceUrl: 'https://payment.ardrive.io',
        };

  const initArweave = async (
    payer: Signer = options.payer ?? context.payer
  ): Promise<TurboAuthenticatedClient> => {
    let arweave;
    if (isKeypairSigner(payer)) {
      arweave = TurboFactory.authenticated({
        token: 'solana',
        privateKey: base58.deserialize(payer.secretKey)[0],
        gatewayUrl: options.solRpcUrl,
        uploadServiceConfig: {
          url: options.uploadServiceUrl ?? defaultAddresses.uploadServiceUrl,
        },
        paymentServiceConfig: {
          url: options.paymentServiceUrl ?? defaultAddresses.paymentServiceUrl,
        },
      });
    } else {
      arweave = await initWebArweave(payer, options);
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

  const initWebArweave = async (
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
      uploadServiceConfig: {
        url: options.uploadServiceUrl ?? defaultAddresses.uploadServiceUrl,
      },
      paymentServiceConfig: {
        url: options.paymentServiceUrl ?? defaultAddresses.paymentServiceUrl,
      },
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
  'arweave' in uploader && 'getBalance' in uploader && 'fund' in uploader;

const amountToBigNumber = (amount: Amount): BigNumber =>
  new BigNumber(amount.basisPoints.toString());

const getGenericFileTagsWithContentType = (
  file: GenericFile
): GenericFileTag[] => {
  if (!file.contentType) {
    return file.tags;
  }

  return [{ name: 'Content-Type', value: file.contentType }, ...file.tags];
};
