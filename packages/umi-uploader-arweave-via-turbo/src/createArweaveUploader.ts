import { TurboPaymentError, TurboUpload } from '@ardrive/turbo-upload';
import {
  Amount,
  Context,
  createGenericFileFromJson,
  createSignerFromKeypair,
  GenericFile,
  GenericFileTag,
  lamports,
  publicKey,
  publicKeyBytes,
  Signer,
  sol,
  SolAmount,
  transactionBuilder,
  UploaderInterface,
  UsdAmount,
} from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';
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
import {
  ArweaveFundError,
  AssetUploadFailedError,
  FailedToConnectToArweaveAddressError,
} from './errors';
import { transferSolInstruction } from './transferSol';

export type ArweaveUploader = UploaderInterface & {
  /** Get the current Arweave Turbo client */
  arweave: () => Promise<TurboUpload>;
  /** Get the SOL and winc estimated price for an amount of bytes */
  getUploadPriceFromBytes: (
    bytes: number
  ) => Promise<{ solAmount: SolAmount; wincAmount: BigNumber }>;
  /** Get the current SOL equivalent balance from connected Arweave Bundler */
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
  /** @deprecated Ignored. The SOL transfer is sent through the Umi RPC. */
  solRpcUrl?: string;
  uploadServiceUrl?: string;
  paymentServiceUrl?: string;
  priceMultiplier?: number;
  payer?: Signer;
};

/** @deprecated Unused. The uploader signs through any Umi `Signer`. */
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

const CREDIT_SHARE_EXPIRY_SECONDS = 60 * 20;
const FUND_POLL_INTERVAL_MS = 2_000;
const FUND_POLL_ATTEMPTS = 60;

export function createArweaveUploader(
  context: Pick<Context, 'rpc' | 'payer' | 'eddsa' | 'transactions'>,
  options: ArweaveUploaderOptions = {}
): ArweaveUploader {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  let _arweave: TurboUpload | null = null;

  // Custom RPC endpoints keep the production services, since they may be mainnet.
  const defaultAddresses = ['devnet', 'testnet', 'localnet'].includes(
    context.rpc.getCluster()
  )
    ? {
        uploadServiceUrl: 'https://upload.services.ar-io.dev',
        paymentServiceUrl: 'https://payment.services.ar-io.dev',
        gatewayUrl: 'https://ar-io.dev/raw',
      }
    : {
        uploadServiceUrl: 'https://upload.ardrive.io',
        paymentServiceUrl: 'https://payment.ardrive.io',
        gatewayUrl: 'https://arweave.net',
      };
  const uploadServiceUrl =
    options.uploadServiceUrl ?? defaultAddresses.uploadServiceUrl;
  const paymentServiceUrl =
    options.paymentServiceUrl ?? defaultAddresses.paymentServiceUrl;

  const getPayer = (): Signer => options.payer ?? context.payer;

  const createTurboClient = (signer: Signer): TurboUpload =>
    new TurboUpload({
      token: 'solana',
      signer: {
        publicKey: publicKeyBytes(signer.publicKey),
        signMessage: (message: Uint8Array) => signer.signMessage(message),
        verify: (message: Uint8Array, signature: Uint8Array) =>
          context.eddsa.verify(message, signature, signer.publicKey),
      },
      uploadUrl: uploadServiceUrl,
      paymentUrl: paymentServiceUrl,
    });

  const getUploadPriceFromBytes = async (
    bytes: number
  ): Promise<{ solAmount: SolAmount; wincAmount: BigNumber }> => {
    const arweave = await getArweave();
    const wincPriceForOneSol = (await arweave.getWincForToken(LAMPORTS_PER_SOL))
      .winc;

    const wincPriceForOneGiB = (await arweave.getUploadCost(2 ** 30)).winc;

    const solPriceForOneGiB =
      BigNumber(wincPriceForOneGiB).dividedBy(wincPriceForOneSol);
    const solPriceForOneByte = solPriceForOneGiB.dividedBy(2 ** 30);
    const solPriceForGivenBytes = solPriceForOneByte.multipliedBy(bytes);
    const wincPriceForGivenBytes = BigNumber(wincPriceForOneGiB)
      .multipliedBy(bytes / 2 ** 30)
      .integerValue(BigNumber.ROUND_CEIL);

    const solAmount = toLamports(
      solPriceForGivenBytes.multipliedBy(options.priceMultiplier ?? 1.1),
      BigNumber.ROUND_CEIL
    );
    return { solAmount, wincAmount: wincPriceForGivenBytes };
  };

  const getBytesFromFiles = (files: GenericFile[]): number =>
    files.reduce((sum, file) => sum + HEADER_SIZE + file.buffer.byteLength, 0);

  // The upload service applies the free limit to each file, not to the batch.
  const isFree = (file: GenericFile): boolean =>
    HEADER_SIZE + file.buffer.byteLength <= FREE_UPLOAD_BYTE_LIMIT;

  const getUploadSolAndWincPrice = async (
    files: GenericFile[]
  ): Promise<{ solAmount: SolAmount; wincAmount: BigNumber }> => {
    const bytes = getBytesFromFiles(files.filter((file) => !isFree(file)));

    if (bytes === 0) {
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

    // Send uploads with an ephemeral key to avoid signing each upload with the payer's key.
    const ephemeralSigner = createSignerFromKeypair(
      context,
      context.eddsa.generateKeypair()
    );
    const ephemeralArweave = createTurboClient(ephemeralSigner);
    const payFor = async (price: {
      solAmount: SolAmount;
      wincAmount: BigNumber;
    }) => {
      await fund(price.solAmount);
      await arweave.shareCredits({
        approvedAddress: ephemeralSigner.publicKey,
        approvedWincAmount: price.wincAmount.toFixed(),
        expiresBySeconds: CREDIT_SHARE_EXPIRY_SECONDS,
      });
    };

    if (wincAmount.isGreaterThan(0)) {
      await payFor({ solAmount, wincAmount });
    }

    // The per-IP free quota cannot be read beforehand, so a free item can still
    // be refused with a 402. Pay once for every free file not yet accepted, then
    // retry.
    const accepted = new Set<number>();
    let failed = false;
    let payment: Promise<void> | undefined;
    const payForPendingFiles = () => {
      payment ??= getUploadPriceFromBytes(
        getBytesFromFiles(
          files.filter((file, index) => isFree(file) && !accepted.has(index))
        )
      ).then(payFor);
      return payment;
    };

    const promises = files.map(async (file, index) => {
      const tags = getGenericFileTagsWithContentType(file);
      const paidBy = isFree(file) ? undefined : arweave.address;
      const send = (payer?: string) =>
        ephemeralArweave.upload({ data: file.buffer, tags, paidBy: payer });

      try {
        const { id } = await send(paidBy).catch(async (error) => {
          if (paidBy || failed || !(error instanceof TurboPaymentError)) {
            throw error;
          }
          await payForPendingFiles();
          if (failed) throw error;
          return send(arweave.address);
        });
        accepted.add(index);
        return `${defaultAddresses.gatewayUrl}/${id}`;
      } catch (error) {
        failed = true;
        if (error instanceof ArweaveFundError) throw error;
        throw new AssetUploadFailedError(error);
      }
    });

    // Wait for every file, so a payment still in progress finishes before upload() returns.
    const results = await Promise.allSettled(promises);
    const rejected = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    );
    if (rejected) throw rejected.reason;
    return results.map(
      (result) => (result as PromiseFulfilledResult<string>).value
    );
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
      await (await getArweave()).getWincForToken(LAMPORTS_PER_SOL)
    ).winc;

    const solEquivalent = BigNumber(usersWincBalance).dividedBy(wincForOneSol);

    return toLamports(solEquivalent, BigNumber.ROUND_FLOOR);
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

    await sendSol(
      BigInt(toFundLamports.integerValue(BigNumber.ROUND_CEIL).toFixed())
    );
  };

  const sendSol = async (amount: bigint): Promise<void> => {
    const arweave = await getArweave();
    const payer = getPayer();

    const fundingAddress = publicKey(await arweave.getFundingAddress());
    const builder = await transactionBuilder([
      transferSolInstruction(payer, fundingAddress, amount),
    ])
      .setFeePayer(payer)
      .setLatestBlockhash(context);
    const signature = await builder.send(context);
    const txId = base58.deserialize(signature)[0];
    const resubmit = `Submit it again with \`(await uploader.arweave()).submitFundTransaction('${txId}')\`.`;

    const result = await builder
      .confirm(context, signature, { commitment: 'finalized' })
      .catch((error) => {
        throw new ArweaveFundError(
          `The SOL transfer [${txId}] was sent but not confirmed. ${resubmit}`,
          error
        );
      });
    if (result.value.err) {
      throw new ArweaveFundError(
        `The SOL transfer [${txId}] failed: ${JSON.stringify(result.value.err)}`
      );
    }

    for (let attempt = 0; attempt < FUND_POLL_ATTEMPTS; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      const { status } = await arweave
        .submitFundTransaction(txId)
        .catch((error) => {
          throw new ArweaveFundError(
            `The payment service did not accept the SOL transfer [${txId}]. ${resubmit}`,
            error
          );
        });
      if (status === 'confirmed') return;
      if (status === 'failed') {
        throw new ArweaveFundError(
          `The payment service could not credit the SOL transfer [${txId}].`
        );
      }
      // eslint-disable-next-line no-await-in-loop
      await sleep(FUND_POLL_INTERVAL_MS);
    }

    throw new ArweaveFundError(
      `The payment service has not credited the SOL transfer [${txId}] yet. ${resubmit}`
    );
  };

  const getStripeCheckoutSession = async (
    amount: UsdAmount
  ): Promise<{
    turboStorageCredits: BigNumber.Value;
    checkoutSessionUrl: string;
  }> => {
    const arweave = await getArweave();

    const { winc, url } = await arweave.createCheckoutSession({
      owner: getPayer().publicKey,
      currency: 'usd',
      amount: Number(amount.basisPoints),
    });
    if (!url) {
      throw new Error('Failed to create Stripe Checkout Session');
    }
    return {
      // One Turbo Storage Credit is 10^12 winc.
      turboStorageCredits: new BigNumber(winc).shiftedBy(-12),
      checkoutSessionUrl: url,
    };
  };

  const getArweave = async (): Promise<TurboUpload> => {
    const payer = getPayer();
    if (_arweave && _arweave.address !== payer.publicKey) {
      _arweave = null;
    }

    if (!_arweave) {
      _arweave = await initArweave(payer);
    }

    return _arweave;
  };

  const initArweave = async (payer: Signer): Promise<TurboUpload> => {
    const arweave = createTurboClient(payer);

    try {
      // Check for a valid payment service.
      await arweave.getFundingAddress();
    } catch (error) {
      throw new FailedToConnectToArweaveAddressError(
        uploadServiceUrl,
        paymentServiceUrl,
        error as Error
      );
    }

    return arweave;
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

// `sol()` cannot parse amounts below 0.000001 SOL, which JavaScript writes in exponent notation.
const toLamports = (
  solAmount: BigNumber,
  roundingMode: BigNumber.RoundingMode
): SolAmount =>
  lamports(BigInt(solAmount.shiftedBy(9).integerValue(roundingMode).toFixed()));

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getGenericFileTagsWithContentType = (
  file: GenericFile
): GenericFileTag[] => {
  if (!file.contentType) {
    return file.tags;
  }

  return [{ name: 'Content-Type', value: file.contentType }, ...file.tags];
};
