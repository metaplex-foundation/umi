import type { MaybeRpcAccount, RpcAccount } from './Account';
import { SolAmount } from './Amount';
import type { Cluster } from './Cluster';
import { InterfaceImplementationMissingError } from './errors';
import type { GenericAbortSignal } from './GenericAbortSignal';
import type { PublicKey } from './PublicKey';
import type {
  Blockhash,
  BlockhashWithExpiryBlockHeight,
  Transaction,
  TransactionError,
  TransactionSignature,
  TransactionWithMeta,
} from './Transaction';

export interface RpcInterface {
  getEndpoint(): string;
  getCluster(): Cluster;
  getAccount(
    publicKey: PublicKey,
    options?: RpcGetAccountOptions
  ): Promise<MaybeRpcAccount>;
  getAccounts(
    publicKeys: PublicKey[],
    options?: RpcGetAccountsOptions
  ): Promise<MaybeRpcAccount[]>;
  getProgramAccounts(
    programId: PublicKey,
    options?: RpcGetProgramAccountsOptions
  ): Promise<RpcAccount[]>;
  getBalance(
    publicKey: PublicKey,
    options?: RpcGetBalanceOptions
  ): Promise<SolAmount>;
  getRent(bytes: number, options?: RpcGetRentOptions): Promise<SolAmount>;
  getSlot(options?: RpcGetSlotOptions): Promise<number>;
  getLatestBlockhash(
    options?: RpcGetLatestBlockhashOptions
  ): Promise<BlockhashWithExpiryBlockHeight>;
  getTransaction(
    signature: TransactionSignature,
    options?: RpcGetTransactionOptions
  ): Promise<TransactionWithMeta | null>;
  accountExists(
    publicKey: PublicKey,
    options?: RpcAccountExistsOptions
  ): Promise<boolean>;
  airdrop(
    publicKey: PublicKey,
    amount: SolAmount,
    options?: RpcAirdropOptions
  ): Promise<void>;
  call<R, P extends any[] = any[]>(
    method: string,
    params?: [...P],
    options?: RpcCallOptions
  ): Promise<R>;
  sendTransaction(
    transaction: Transaction,
    options?: RpcSendTransactionOptions
  ): Promise<TransactionSignature>;
  confirmTransaction(
    signature: TransactionSignature,
    options: RpcConfirmTransactionOptions
  ): Promise<RpcConfirmTransactionResult>;
}

export type Commitment = 'processed' | 'confirmed' | 'finalized';
export type RpcDataSlice = { offset: number; length: number };
export type RpcDataFilter = RpcDataFilterSize | RpcDataFilterMemcmp;
export type RpcDataFilterSize = { dataSize: number };
export type RpcDataFilterMemcmp = {
  memcmp: { offset: number; bytes: Uint8Array };
};

export type RpcResultWithContext<Value> = {
  context: { slot: number };
  value: Value;
};

export type RpcBaseOptions = {
  id?: string;
  signal?: GenericAbortSignal;
  commitment?: Commitment;
  minContextSlot?: number;
};

export type RpcGetAccountOptions = RpcBaseOptions & {
  dataSlice?: RpcDataSlice;
};

export type RpcGetAccountsOptions = RpcBaseOptions & {
  dataSlice?: RpcDataSlice;
};

export type RpcGetProgramAccountsOptions = RpcBaseOptions & {
  dataSlice?: RpcDataSlice;
  filters?: RpcDataFilter[];
};

export type RpcGetBalanceOptions = RpcBaseOptions;

export type RpcGetRentOptions = RpcBaseOptions & {
  /** @defaultValue `false` */
  includesHeaderBytes?: boolean;
};

export type RpcGetSlotOptions = RpcBaseOptions;

export type RpcGetLatestBlockhashOptions = RpcBaseOptions;

export type RpcGetTransactionOptions = RpcBaseOptions;

export type RpcAccountExistsOptions = RpcBaseOptions;

export type RpcAirdropOptions = Partial<RpcConfirmTransactionOptions>;

export type RpcCallOptions = RpcBaseOptions & {
  extra?: object;
};

export type RpcSendTransactionOptions = RpcBaseOptions & {
  skipPreflight?: boolean;
  preflightCommitment?: Commitment;
  maxRetries?: number;
};

export type RpcConfirmTransactionOptions = RpcBaseOptions & {
  strategy: RpcConfirmTransactionStrategy;
};

export type RpcConfirmTransactionStrategy =
  | {
      type: 'blockhash';
      blockhash: Blockhash;
      lastValidBlockHeight: number;
    }
  | {
      type: 'durableNonce';
      minContextSlot: number;
      nonceAccountPubkey: PublicKey;
      nonceValue: string;
    };

export type RpcConfirmTransactionResult = RpcResultWithContext<{
  err: TransactionError | null;
}>;

export class NullRpc implements RpcInterface {
  private readonly error = new InterfaceImplementationMissingError(
    'RpcInterface',
    'rpc'
  );

  getEndpoint(): string {
    throw this.error;
  }

  getCluster(): Cluster {
    throw this.error;
  }

  getAccount(): Promise<MaybeRpcAccount> {
    throw this.error;
  }

  getAccounts(): Promise<MaybeRpcAccount[]> {
    throw this.error;
  }

  getProgramAccounts(): Promise<RpcAccount[]> {
    throw this.error;
  }

  getBalance(): Promise<SolAmount> {
    throw this.error;
  }

  getRent(): Promise<SolAmount> {
    throw this.error;
  }

  getSlot(): Promise<number> {
    throw this.error;
  }

  getLatestBlockhash(): Promise<BlockhashWithExpiryBlockHeight> {
    throw this.error;
  }

  getTransaction(): Promise<TransactionWithMeta | null> {
    throw this.error;
  }

  accountExists(): Promise<boolean> {
    throw this.error;
  }

  airdrop(): Promise<void> {
    throw this.error;
  }

  call<Result>(): Promise<Result> {
    throw this.error;
  }

  sendTransaction(): Promise<TransactionSignature> {
    throw this.error;
  }

  confirmTransaction(): Promise<RpcConfirmTransactionResult> {
    throw this.error;
  }
}
