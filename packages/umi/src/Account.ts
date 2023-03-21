import type { SolAmount } from './Amount';
import { AccountNotFoundError, UnexpectedAccountError } from './errors';
import type { PublicKey } from './PublicKey';
import type { Serializer } from './Serializer';

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
  rentEpoch?: number;
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
export function deserializeAccount<T extends object>(
  rawAccount: RpcAccount,
  dataSerializer: Serializer<T>
): Account<T> {
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
