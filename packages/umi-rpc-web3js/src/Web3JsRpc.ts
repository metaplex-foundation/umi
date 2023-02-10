import {
  ACCOUNT_HEADER_SIZE,
  base58,
  BlockhashWithExpiryBlockHeight,
  Cluster,
  Commitment,
  CompiledInstruction,
  Context,
  ErrorWithLogs,
  isZeroAmount,
  lamports,
  MaybeRpcAccount,
  ProgramError,
  PublicKey,
  resolveClusterFromEndpoint,
  RpcAccount,
  RpcAccountExistsOptions,
  RpcAirdropOptions,
  RpcCallOptions,
  RpcConfirmTransactionOptions,
  RpcConfirmTransactionResult,
  RpcDataFilter,
  RpcGetAccountOptions,
  RpcGetAccountsOptions,
  RpcGetBalanceOptions,
  RpcGetLatestBlockhashOptions,
  RpcGetProgramAccountsOptions,
  RpcGetRentOptions,
  RpcGetTransactionOptions,
  RpcInterface,
  RpcSendTransactionOptions,
  SolAmount,
  createAmount,
  Transaction,
  TransactionMetaInnerInstruction,
  TransactionMetaTokenBalance,
  TransactionSignature,
  TransactionWithMeta,
} from '@lorisleiva/js-core';
import {
  fromWeb3JsMessage,
  fromWeb3JsPublicKey,
  toWeb3JsPublicKey,
} from '@lorisleiva/js-web3js-adapters';
import {
  AccountInfo as Web3JsAccountInfo,
  Connection as Web3JsConnection,
  ConnectionConfig as Web3JsConnectionConfig,
  GetProgramAccountsFilter as Web3JsGetProgramAccountsFilter,
  PublicKey as Web3JsPublicKey,
  TokenBalance as Web3JsTokenBalance,
  TransactionConfirmationStrategy as Web3JsTransactionConfirmationStrategy,
} from '@solana/web3.js';
import type { JSONRPCCallbackTypePlain } from 'jayson';
import type RpcClient from 'jayson/lib/client/browser';

export type Web3JsRpcOptions = Commitment | Web3JsConnectionConfig;

export class Web3JsRpc implements RpcInterface {
  protected readonly context: Pick<Context, 'programs' | 'transactions'>;

  public readonly connection: Web3JsConnection;

  public readonly cluster: Cluster;

  constructor(
    context: Pick<Context, 'programs' | 'transactions'>,
    endpoint: string,
    rpcOptions?: Web3JsRpcOptions
  ) {
    this.context = context;
    this.connection = new Web3JsConnection(endpoint, rpcOptions);
    this.cluster = resolveClusterFromEndpoint(endpoint);
  }

  getEndpoint(): string {
    return this.connection.rpcEndpoint;
  }

  getCluster(): Cluster {
    return this.cluster;
  }

  async getAccount(
    publicKey: PublicKey,
    options: RpcGetAccountOptions = {}
  ): Promise<MaybeRpcAccount> {
    const account = await this.connection.getAccountInfo(
      toWeb3JsPublicKey(publicKey),
      options
    );
    return this.parseMaybeAccount(account, publicKey);
  }

  async getAccounts(
    publicKeys: PublicKey[],
    options: RpcGetAccountsOptions = {}
  ): Promise<MaybeRpcAccount[]> {
    const accounts = await this.connection.getMultipleAccountsInfo(
      publicKeys.map(toWeb3JsPublicKey),
      options
    );
    return accounts.map((account, index) =>
      this.parseMaybeAccount(account, publicKeys[index])
    );
  }

  async getProgramAccounts(
    programId: PublicKey,
    options: RpcGetProgramAccountsOptions = {}
  ): Promise<RpcAccount[]> {
    const accounts = await this.connection.getProgramAccounts(
      toWeb3JsPublicKey(programId),
      {
        ...options,
        filters: options.filters?.map((filter) => this.parseDataFilter(filter)),
      }
    );
    return accounts.map(({ pubkey, account }) =>
      this.parseAccount(account, fromWeb3JsPublicKey(pubkey))
    );
  }

  async getBalance(
    publicKey: PublicKey,
    options: RpcGetBalanceOptions = {}
  ): Promise<SolAmount> {
    const balanceInLamports = await this.connection.getBalance(
      toWeb3JsPublicKey(publicKey),
      options
    );
    return lamports(balanceInLamports);
  }

  async getRent(
    bytes: number,
    options: RpcGetRentOptions = {}
  ): Promise<SolAmount> {
    const rentFor = (bytes: number) =>
      this.connection.getMinimumBalanceForRentExemption(
        bytes,
        options.commitment
      );
    if (options.includesHeaderBytes ?? false) {
      const headerRent = await rentFor(0);
      const rentPerByte = BigInt(headerRent) / BigInt(ACCOUNT_HEADER_SIZE);
      return lamports(rentPerByte * BigInt(bytes));
    }
    return lamports(await rentFor(bytes));
  }

  async getLatestBlockhash(
    options: RpcGetLatestBlockhashOptions = {}
  ): Promise<BlockhashWithExpiryBlockHeight> {
    return this.connection.getLatestBlockhash(options);
  }

  async getTransaction(
    signature: TransactionSignature,
    options: RpcGetTransactionOptions = {}
  ): Promise<TransactionWithMeta | null> {
    const response = await this.connection.getTransaction(
      base58.deserialize(signature)[0],
      {
        commitment: options.commitment as 'confirmed' | 'finalized' | undefined,
        maxSupportedTransactionVersion: 0,
      }
    );

    if (!response) {
      return null;
    }

    if (!response.meta) {
      // TODO: Custom error.
      throw new Error('Transaction meta is missing.');
    }

    const { transaction, meta } = response;
    const message = fromWeb3JsMessage(transaction.message);
    const mapPublicKey = (key: string) =>
      fromWeb3JsPublicKey(new Web3JsPublicKey(key));
    const mapTokenBalance = (
      tokenBalance: Web3JsTokenBalance
    ): TransactionMetaTokenBalance => ({
      accountIndex: tokenBalance.accountIndex,
      amount: createAmount(
        tokenBalance.uiTokenAmount.amount,
        'splToken',
        tokenBalance.uiTokenAmount.decimals
      ),
      mint: mapPublicKey(tokenBalance.mint),
      owner: tokenBalance.owner ? mapPublicKey(tokenBalance.owner) : null,
    });

    return {
      message,
      serializedMessage: this.context.transactions.serializeMessage(message),
      signatures: transaction.signatures.map(base58.serialize),
      meta: {
        fee: lamports(meta.fee),
        logs: meta.logMessages ?? [],
        preBalances: meta.preBalances.map(lamports),
        postBalances: meta.postBalances.map(lamports),
        preTokenBalances: (meta.preTokenBalances ?? []).map(mapTokenBalance),
        postTokenBalances: (meta.postTokenBalances ?? []).map(mapTokenBalance),
        innerInstructions:
          meta.innerInstructions?.map(
            (inner): TransactionMetaInnerInstruction => ({
              index: inner.index,
              instructions: inner.instructions.map(
                (instruction): CompiledInstruction => ({
                  programIndex: instruction.programIdIndex,
                  accountIndexes: instruction.accounts,
                  data: base58.serialize(instruction.data),
                })
              ),
            })
          ) ?? null,
        loadedAddresses: {
          writable: (meta.loadedAddresses?.writable ?? []).map(
            fromWeb3JsPublicKey
          ),
          readonly: (meta.loadedAddresses?.readonly ?? []).map(
            fromWeb3JsPublicKey
          ),
        },
        computeUnitsConsumed: meta.computeUnitsConsumed
          ? BigInt(meta.computeUnitsConsumed)
          : null,
        err: meta.err,
      },
    };
  }

  async accountExists(
    publicKey: PublicKey,
    options: RpcAccountExistsOptions = {}
  ): Promise<boolean> {
    return !isZeroAmount(await this.getBalance(publicKey, options));
  }

  async airdrop(
    publicKey: PublicKey,
    amount: SolAmount,
    options: RpcAirdropOptions = {}
  ): Promise<void> {
    const signature = await this.connection.requestAirdrop(
      toWeb3JsPublicKey(publicKey),
      Number(amount.basisPoints)
    );
    if (options.strategy) {
      await this.confirmTransaction(
        base58.serialize(signature),
        options as RpcConfirmTransactionOptions
      );
      return;
    }
    await this.confirmTransaction(base58.serialize(signature), {
      ...options,
      strategy: { type: 'blockhash', ...(await this.getLatestBlockhash()) },
    });
  }

  async call<Result, Params extends any[] = any[]>(
    method: string,
    params?: [...Params],
    options: RpcCallOptions = {}
  ): Promise<Result> {
    const client = (this.connection as any)._rpcClient as RpcClient;
    const resolvedParams = this._resolveCallParams(
      (params ? [...params] : []) as [...Params],
      options.commitment,
      options.extra
    );
    return new Promise((resolve, reject) => {
      const callback: JSONRPCCallbackTypePlain = (error, response) =>
        error ? reject(error) : resolve(response.result);
      if (options.id) {
        client.request(method, resolvedParams, options.id, callback);
      } else {
        client.request(method, resolvedParams, callback);
      }
    });
  }

  private _resolveCallParams<Params extends any[]>(
    args: Params,
    override?: Commitment,
    extra?: object
  ): Params {
    const commitment =
      override || (this.connection.commitment as Commitment | undefined);
    if (commitment || extra) {
      let options: any = {};
      if (commitment) {
        options.commitment = commitment;
      }
      if (extra) {
        options = { ...options, ...extra };
      }
      args.push(options);
    }
    return args;
  }

  async sendTransaction(
    transaction: Transaction,
    options: RpcSendTransactionOptions = {}
  ): Promise<TransactionSignature> {
    try {
      const signature = await this.connection.sendRawTransaction(
        this.context.transactions.serialize(transaction),
        options
      );
      return base58.serialize(signature);
    } catch (error: any) {
      let resolvedError: ProgramError | null = null;
      if (error instanceof Error && 'logs' in error) {
        resolvedError = this.context.programs.resolveError(
          error as ErrorWithLogs,
          transaction
        );
      }
      throw resolvedError || error;
    }
  }

  async confirmTransaction(
    signature: TransactionSignature,
    options: RpcConfirmTransactionOptions
  ): Promise<RpcConfirmTransactionResult> {
    return this.connection.confirmTransaction(
      this.parseConfirmStrategy(signature, options),
      options.commitment
    );
  }

  protected parseAccount(
    account: Web3JsAccountInfo<Uint8Array>,
    publicKey: PublicKey
  ): RpcAccount {
    return {
      executable: account.executable,
      owner: fromWeb3JsPublicKey(account.owner),
      lamports: lamports(account.lamports),
      rentEpoch: account.rentEpoch,
      publicKey,
      data: new Uint8Array(account.data),
    };
  }

  protected parseMaybeAccount(
    account: Web3JsAccountInfo<Uint8Array> | null,
    publicKey: PublicKey
  ): MaybeRpcAccount {
    return account
      ? { ...this.parseAccount(account, publicKey), exists: true }
      : { exists: false, publicKey };
  }

  protected parseDataFilter(
    filter: RpcDataFilter
  ): Web3JsGetProgramAccountsFilter {
    if (!('memcmp' in filter)) return filter;
    const { bytes, ...rest } = filter.memcmp;
    return { memcmp: { ...rest, bytes: base58.deserialize(bytes)[0] } };
  }

  protected parseConfirmStrategy(
    signature: TransactionSignature,
    options: RpcConfirmTransactionOptions
  ): Web3JsTransactionConfirmationStrategy {
    if (options.strategy.type === 'blockhash') {
      return {
        ...options.strategy,
        signature: base58.deserialize(signature)[0],
      };
    }
    return {
      ...options.strategy,
      signature: base58.deserialize(signature)[0],
      nonceAccountPubkey: toWeb3JsPublicKey(
        options.strategy.nonceAccountPubkey
      ),
    };
  }
}
