import type { TransactionVersion } from '@metaplex-foundation/umi';
import { OperationNotSupportedByWalletAdapterError } from './errors';

/**
 * The transaction versions a wallet adapter says it can sign, as exposed by
 * `@solana/wallet-adapter-base`. `null` or `undefined` means the wallet only
 * signs legacy transactions.
 */
export type SupportedTransactionVersions =
  | ReadonlySet<TransactionVersion>
  | null
  | undefined;

/**
 * The parts of a wallet adapter (e.g. a `StandardWalletAdapter`) that are
 * read to find out which transaction versions it can sign.
 */
export type WalletAdapterWithTransactionVersions = {
  publicKey?: unknown;
  signTransaction?: unknown;
  supportedTransactionVersions?: SupportedTransactionVersions;
  /** The underlying wallet-standard wallet, on a `StandardWalletAdapter`. */
  wallet?: unknown;
};

/**
 * Anything we can read a wallet's supported transaction versions from:
 * - a wallet adapter itself (e.g. `useWallet().wallet.adapter`), or
 * - the `useWallet()` state from `@solana/wallet-adapter-react`, whose
 *   selected wallet holds the adapter.
 */
export type WalletWithTransactionVersions =
  | WalletAdapterWithTransactionVersions
  | { wallet?: { adapter: WalletAdapterWithTransactionVersions } | null };

const SOLANA_SIGN_TRANSACTION = 'solana:signTransaction';
const KNOWN_VERSIONS: readonly TransactionVersion[] = ['legacy', 0, 1];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const resolveAdapter = (
  input: WalletWithTransactionVersions
): WalletAdapterWithTransactionVersions => {
  // The useWallet() state holds the adapter of the selected wallet. A
  // wallet-standard wallet (the `wallet` of a StandardWalletAdapter) has no
  // `adapter`, so this cannot mistake an adapter for the useWallet() state.
  const { wallet } = input;
  if (isObject(wallet) && isObject(wallet.adapter)) {
    return wallet.adapter as WalletAdapterWithTransactionVersions;
  }
  return input as WalletAdapterWithTransactionVersions;
};

/**
 * The versions listed by the wallet-standard `solana:signTransaction`
 * feature, if the adapter wraps a wallet-standard wallet.
 */
const getSignTransactionFeatureVersions = (
  adapter: WalletAdapterWithTransactionVersions
): readonly unknown[] | undefined => {
  const { wallet } = adapter;
  if (!isObject(wallet) || !isObject(wallet.features)) return undefined;
  const feature = wallet.features[SOLANA_SIGN_TRANSACTION];
  if (!isObject(feature)) return undefined;
  const versions = feature.supportedTransactionVersions;
  return Array.isArray(versions) ? versions : undefined;
};

/**
 * Returns the transaction versions the given wallet can sign.
 *
 * Umi always signs through `signTransaction`, so for wallet-standard wallets
 * this reads the `solana:signTransaction` feature directly. The adapter's own
 * `supportedTransactionVersions` prefers the `solana:signAndSendTransaction`
 * feature's list when a wallet has both, which may differ. Other adapters
 * only have `supportedTransactionVersions`, which is used as a fallback.
 *
 * Wallets that do not advertise any versions — including when no wallet is
 * selected yet — are treated as legacy-only, matching wallet-adapter's own
 * semantics.
 *
 * @throws {OperationNotSupportedByWalletAdapterError} If the wallet is
 * connected but cannot sign transactions at all.
 */
export const getSupportedTransactionVersions = (
  wallet: WalletWithTransactionVersions
): ReadonlySet<TransactionVersion> => {
  const adapter = resolveAdapter(wallet);

  if (adapter.publicKey && typeof adapter.signTransaction !== 'function') {
    throw new OperationNotSupportedByWalletAdapterError('signTransaction');
  }

  const advertised: Iterable<unknown> =
    getSignTransactionFeatureVersions(adapter) ??
    adapter.supportedTransactionVersions ??
    [];
  const versions = new Set<TransactionVersion>(
    KNOWN_VERSIONS.filter((version) => new Set(advertised).has(version))
  );
  return versions.size > 0 ? versions : new Set(['legacy']);
};

/**
 * Returns the most recent transaction version the given wallet can sign:
 * `1` if supported, otherwise `0` if supported, otherwise `'legacy'`.
 *
 * The version decides how a transaction must be built, so call this before
 * building, not as a last step. V1 sets the compute budget with
 * `setTransactionConfig()` and cannot use address lookup tables, whereas
 * legacy and V0 use ComputeBudget instructions, and V0 can use lookup tables.
 * `build()` throws if a builder mixes the two.
 *
 * @throws {OperationNotSupportedByWalletAdapterError} If the wallet is
 * connected but cannot sign transactions at all.
 *
 * @example
 * ```ts
 * const version = getLatestSupportedTransactionVersion(useWallet());
 *
 * const builder =
 *   version === 1
 *     ? transactionBuilder()
 *         .add(instruction)
 *         .useV1()
 *         .setTransactionConfig({
 *           computeUnitLimit: 600_000,
 *           priorityFee: lamports(600),
 *         })
 *     : transactionBuilder()
 *         .add(setComputeUnitLimit(umi, { units: 600_000 }))
 *         .add(setComputeUnitPrice(umi, { microLamports: 1_000 }))
 *         .add(instruction)
 *         .setVersion(version);
 *
 * await builder.sendAndConfirm(umi);
 * ```
 */
export const getLatestSupportedTransactionVersion = (
  wallet: WalletWithTransactionVersions
): TransactionVersion => {
  const versions = getSupportedTransactionVersions(wallet);
  if (versions.has(1)) return 1;
  if (versions.has(0)) return 0;
  return 'legacy';
};
