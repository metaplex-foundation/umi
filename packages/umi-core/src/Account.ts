import type { SolAmount } from './Amount';
import { AccountNotFoundError, UnexpectedAccountError } from './errors';
import type { PublicKey } from './PublicKey';
import type { Serializer } from './Serializer';

export const ACCOUNT_HEADER_SIZE = 128;

export type AccountHeader = {
  executable: boolean;
  owner: PublicKey;
  lamports: SolAmount;
  rentEpoch?: number;
};

export type RpcAccount = AccountHeader & {
  publicKey: PublicKey;
  data: Uint8Array;
};

export type MaybeRpcAccount =
  | ({ exists: true } & RpcAccount)
  | { exists: false; publicKey: PublicKey };

export type Account<T extends object> = T & {
  publicKey: PublicKey;
  header: AccountHeader;
};

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

export function assertAccountExists(
  account: MaybeRpcAccount,
  name?: string,
  solution?: string
): asserts account is MaybeRpcAccount & { exists: true } {
  if (!account.exists) {
    throw new AccountNotFoundError(account.publicKey, name, solution);
  }
}
