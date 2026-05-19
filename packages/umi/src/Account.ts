import {
  Pda,
  PublicKey,
  publicKey as toPublicKey,
} from '@metaplex-foundation/umi-public-keys';
import type { Serializer } from '@metaplex-foundation/umi-serializers';
import type { SolAmount } from './Amount';
import type { Context } from './Context';
import { AccountNotFoundError, UnexpectedAccountError } from './errors';
import type { RpcGetAccountsOptions } from './RpcInterface';

/**
 * The size of an account header in bytes.
 * @category Accounts
 */
export const ACCOUNT_HEADER_SIZE = 128;

/**
 * Describes the header of an account.
 * @category Accounts
 */
export type AccountHeader = {
  executable: boolean;
  owner: PublicKey;
  lamports: SolAmount;
  rentEpoch?: bigint;
};

/**
 * Describes a raw account that has not been deserialized.
 * @category Accounts
 */
export type RpcAccount = AccountHeader & {
  publicKey: PublicKey;
  data: Uint8Array;
};

/**
 * Describes a raw account that may or may not exist.
 * @category Accounts
 */
export type MaybeRpcAccount =
  | ({ exists: true } & RpcAccount)
  | { exists: false; publicKey: PublicKey };

/**
 * Describes a deserialized account.
 * @category Accounts
 */
export type Account<T extends object> = T & {
  publicKey: PublicKey;
  header: AccountHeader;
};

/**
 * Given an account data serializer,
 * returns a deserialized account from a raw account.
 * @category Accounts
 */
export function deserializeAccount<From extends object, To extends From = From>(
  rawAccount: RpcAccount,
  dataSerializer: Serializer<From, To>
): Account<To> {
  const { data, publicKey, ...rest } = rawAccount;
  try {
    const [parsedData] = dataSerializer.deserialize(data);
    return { publicKey, header: rest, ...parsedData };
  } catch (error: any) {
    throw new UnexpectedAccountError(
      publicKey,
      dataSerializer.description,
      error
    );
  }
}

/**
 * Ensures an account that may or may not exist actually exists.
 * @category Accounts
 */
export function assertAccountExists(
  account: MaybeRpcAccount,
  name?: string,
  solution?: string
): asserts account is MaybeRpcAccount & { exists: true } {
  if (!account.exists) {
    throw new AccountNotFoundError(account.publicKey, name, solution);
  }
}

/**
 * Defines the input for a single account to be fetched and deserialized
 * as part of a mixed-account batch fetch.
 *
 * The `deserialize` callback must return an {@link Account} (i.e. an object
 * augmented with `publicKey` and `header`), matching the shape produced by
 * the kinobi-generated `deserializeX` helpers.
 *
 * @typeParam T - The deserialized account type.
 * @category Accounts
 */
export type FetchAccountInput<T extends Account<object>> = {
  publicKey: PublicKey | Pda;
  deserialize: (rawAccount: RpcAccount) => T;
};

/** @internal */
type DeserializedAccounts<T extends FetchAccountInput<Account<object>>[]> = {
  [K in keyof T]: T[K] extends FetchAccountInput<infer U> ? U : never;
};

/** @internal */
type MaybeDeserializedAccounts<T extends FetchAccountInput<Account<object>>[]> =
  {
    [K in keyof T]: T[K] extends FetchAccountInput<infer U> ? U | null : never;
  };

/**
 * Fetches multiple accounts of potentially different types in a single RPC
 * call and deserializes each one using its provided deserializer.
 *
 * This is useful when you need to fetch accounts of different types (possibly
 * from different programs) in a single batch. Compared to calling
 * `rpc.getAccounts` directly, the result is a typed tuple where each position
 * is the deserialized type returned by its corresponding deserializer — there
 * is no manual narrowing.
 *
 * The underlying RPC `getMultipleAccounts` call has a limit of 100 accounts
 * per request. This helper does not perform client-side chunking itself, but
 * the Umi bundle defaults (and the `@metaplex-foundation/umi-rpc-chunk-get-accounts`
 * plugin) will transparently chunk requests over that limit; callers only
 * need to apply their own chunking when they want explicit control over
 * concurrency.
 *
 * All accounts must exist, otherwise an error is thrown. Use
 * {@link safeFetchAllMixedAccounts} if some accounts may not exist.
 *
 * @example
 * ```ts
 * const [metadata, edition] = await fetchAllMixedAccounts(context, [
 *   { publicKey: metadataAddr, deserialize: deserializeMetadata },
 *   { publicKey: editionAddr, deserialize: deserializeEdition },
 * ]);
 * // metadata: Metadata, edition: Edition — fully typed!
 * ```
 *
 * @category Accounts
 */
export async function fetchAllMixedAccounts<
  T extends FetchAccountInput<Account<object>>[]
>(
  context: Pick<Context, 'rpc'>,
  inputs: [...T],
  options?: RpcGetAccountsOptions
): Promise<DeserializedAccounts<T>> {
  const publicKeys = inputs.map((input) => toPublicKey(input.publicKey, false));
  const maybeAccounts = await context.rpc.getAccounts(publicKeys, options);
  return maybeAccounts.map((maybeAccount, index) => {
    assertAccountExists(maybeAccount);
    return inputs[index].deserialize(maybeAccount);
  }) as DeserializedAccounts<T>;
}

/**
 * Fetches multiple accounts of potentially different types in a single RPC
 * call and deserializes each one using its provided deserializer.
 *
 * Accounts that do not exist are returned as `null` at the corresponding
 * position in the output tuple. This differs from the kinobi-generated
 * `safeFetchAllX` helpers, which *filter out* missing accounts and return a
 * dense array: positional `null`s are required here so the result tuple can
 * preserve its declared per-element types.
 *
 * @example
 * ```ts
 * const [metadata, edition] = await safeFetchAllMixedAccounts(context, [
 *   { publicKey: metadataAddr, deserialize: deserializeMetadata },
 *   { publicKey: editionAddr, deserialize: deserializeEdition },
 * ]);
 * // metadata: Metadata | null, edition: Edition | null
 * ```
 *
 * @category Accounts
 */
export async function safeFetchAllMixedAccounts<
  T extends FetchAccountInput<Account<object>>[]
>(
  context: Pick<Context, 'rpc'>,
  inputs: [...T],
  options?: RpcGetAccountsOptions
): Promise<MaybeDeserializedAccounts<T>> {
  const publicKeys = inputs.map((input) => toPublicKey(input.publicKey, false));
  const maybeAccounts = await context.rpc.getAccounts(publicKeys, options);
  return maybeAccounts.map((maybeAccount, index) => {
    if (!maybeAccount.exists) return null;
    return inputs[index].deserialize(maybeAccount);
  }) as MaybeDeserializedAccounts<T>;
}
