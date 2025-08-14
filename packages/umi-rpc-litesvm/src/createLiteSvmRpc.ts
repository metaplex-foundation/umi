/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ACCOUNT_HEADER_SIZE,
  BlockhashWithExpiryBlockHeight,
  Cluster,
  Commitment,
  Context,
  DateTime,
  ErrorWithLogs,
  isZeroAmount,
  lamports,
  MaybeRpcAccount,
  ProgramError,
  PublicKey,
  RpcAccount,
  RpcAccountExistsOptions,
  RpcAirdropOptions,
  RpcCallOptions,
  RpcConfirmTransactionOptions,
  RpcConfirmTransactionResult,
  RpcGetAccountOptions,
  RpcGetAccountsOptions,
  RpcGetBalanceOptions,
  RpcGetBlockTimeOptions,
  RpcGetLatestBlockhashOptions,
  RpcGetProgramAccountsOptions,
  RpcGetRentOptions,
  RpcGetSignatureStatusesOptions,
  RpcGetSlotOptions,
  RpcGetTransactionOptions,
  RpcInterface,
  RpcSendTransactionOptions,
  RpcSimulateTransactionOptions,
  RpcSimulateTransactionResult,
  SolAmount,
  Transaction,
  TransactionSignature,
  TransactionStatus,
  TransactionWithMeta,
} from '@metaplex-foundation/umi';
import {
  fromWeb3JsPublicKey,
  toWeb3JsPublicKey,
  toWeb3JsTransaction,
} from '@metaplex-foundation/umi-web3js-adapters';
import { base58, base64 } from '@metaplex-foundation/umi/serializers';
import {
  AccountInfo as Web3JsAccountInfo,
  ConnectionConfig as Web3JsConnectionConfig,
} from '@solana/web3.js';
import { FailedTransactionMetadata, LiteSVM } from "litesvm";

export type Web3JsRpcOptions = Commitment | Web3JsConnectionConfig;

export function createLiteSvmRpc(
  context: Pick<Context, 'programs' | 'transactions'>,
  liteSvm: LiteSVM
): RpcInterface & { liteSvm: LiteSVM } {
  let liteSvmInstance: LiteSVM = liteSvm;
  const getLiteSvm = () => {
    if (liteSvmInstance) {
      return liteSvmInstance;
    }
    liteSvmInstance = new LiteSVM();
    return liteSvmInstance;
  };

  const getAccount = async (
    publicKey: PublicKey,
    options: RpcGetAccountOptions = {}
  ): Promise<MaybeRpcAccount> => {
    const account = await getLiteSvm().getAccount(
      toWeb3JsPublicKey(publicKey),
    );
    return parseMaybeAccount(account, publicKey);
  };

  const getAccounts = async (
    publicKeys: PublicKey[],
    options: RpcGetAccountsOptions = {}
  ): Promise<MaybeRpcAccount[]> => {
    const accounts = await Promise.all(publicKeys.map(async (publicKey) => {
      const account = await getLiteSvm().getAccount(
        toWeb3JsPublicKey(publicKey),
      );
      return parseMaybeAccount(account, publicKey);
    }));
    return accounts;
  };

  const getProgramAccounts = async (
    programId: PublicKey,
    options: RpcGetProgramAccountsOptions = {}
  ): Promise<RpcAccount[]> => {
    throw new Error('Not implemented');
  };

  const getBlockTime = async (
    slot: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: RpcGetBlockTimeOptions = {}
  ): Promise<DateTime | null> => {
    throw new Error('Not implemented');
  };

  const getBalance = async (
    publicKey: PublicKey,
    options: RpcGetBalanceOptions = {}
  ): Promise<SolAmount> => {
    const balanceInLamports = getLiteSvm().getBalance(
      toWeb3JsPublicKey(publicKey)
    );
    return lamports(balanceInLamports ?? 0n);
  };

  const getGenesisHash = async (): Promise<string> => {
    throw new Error('Not implemented');
  };

  const getRent = async (
    bytes: number,
    options: RpcGetRentOptions = {}
  ): Promise<SolAmount> => {
    const rentFor = (bytes: number) =>
      getLiteSvm().minimumBalanceForRentExemption(
        BigInt(bytes),
      );
    if (options.includesHeaderBytes ?? false) {
      const headerRent = await rentFor(0);
      const rentPerByte = BigInt(headerRent) / BigInt(ACCOUNT_HEADER_SIZE);
      return lamports(rentPerByte * BigInt(bytes));
    }
    return lamports(await rentFor(bytes));
  };

  const getLatestBlockhash = async (
    options: RpcGetLatestBlockhashOptions = {}
  ): Promise<BlockhashWithExpiryBlockHeight> => ({
    blockhash: getLiteSvm().latestBlockhash(),
    lastValidBlockHeight: -1,
  });

  const getTransaction = async (
    signature: TransactionSignature,
    options: RpcGetTransactionOptions = {}
  ): Promise<TransactionWithMeta | null> => {
    throw new Error('Not implemented');
    // const response = getLiteSvm().getTransaction(
    //   signature,
    // );

    // if (!response || response instanceof FailedTransactionMetadata) {
    //   return null;
    // }

    // TODO: Implement this

    // const { transaction, meta } = response;
    // const message = fromWeb3JsMessage(transaction.message);
    // const mapPublicKey = (key: string) =>
    //   fromWeb3JsPublicKey(new Web3JsPublicKey(key));
    // const mapTokenBalance = (
    //   tokenBalance: Web3JsTokenBalance
    // ): TransactionMetaTokenBalance => ({
    //   accountIndex: tokenBalance.accountIndex,
    //   amount: createAmount(
    //     tokenBalance.uiTokenAmount.amount,
    //     'splToken',
    //     tokenBalance.uiTokenAmount.decimals
    //   ),
    //   mint: mapPublicKey(tokenBalance.mint),
    //   owner: tokenBalance.owner ? mapPublicKey(tokenBalance.owner) : null,
    // });

    // return {
    //   message,
    //   serializedMessage: context.transactions.serializeMessage(message),
    //   signatures: transaction.signatures.map(base58.serialize),
    //   meta: {
    //     fee: lamports(meta.fee),
    //     logs: meta.logMessages ?? [],
    //     preBalances: meta.preBalances.map(lamports),
    //     postBalances: meta.postBalances.map(lamports),
    //     preTokenBalances: (meta.preTokenBalances ?? []).map(mapTokenBalance),
    //     postTokenBalances: (meta.postTokenBalances ?? []).map(mapTokenBalance),
    //     innerInstructions:
    //       meta.innerInstructions?.map(
    //         (inner): TransactionMetaInnerInstruction => ({
    //           index: inner.index,
    //           instructions: inner.instructions.map(
    //             (instruction): CompiledInstruction => ({
    //               programIndex: instruction.programIdIndex,
    //               accountIndexes: instruction.accounts,
    //               data: base58.serialize(instruction.data),
    //             })
    //           ),
    //         })
    //       ) ?? null,
    //     loadedAddresses: {
    //       writable: (meta.loadedAddresses?.writable ?? []).map(
    //         fromWeb3JsPublicKey
    //       ),
    //       readonly: (meta.loadedAddresses?.readonly ?? []).map(
    //         fromWeb3JsPublicKey
    //       ),
    //     },
    //     computeUnitsConsumed: meta.computeUnitsConsumed
    //       ? BigInt(meta.computeUnitsConsumed)
    //       : null,
    //     err: meta.err,
    //   },
    // };
  };

  const getSignatureStatuses = async (
    signatures: TransactionSignature[],
    options: RpcGetSignatureStatusesOptions = {}
  ): Promise<Array<TransactionStatus | null>> => {
    throw new Error('Not implemented');
  };

  const accountExists = async (
    publicKey: PublicKey,
    options: RpcAccountExistsOptions = {}
  ): Promise<boolean> => !isZeroAmount(await getBalance(publicKey, options));

  const airdrop = async (
    publicKey: PublicKey,
    amount: SolAmount,
    options: RpcAirdropOptions = {}
  ): Promise<void> => {
    getLiteSvm().airdrop(
      toWeb3JsPublicKey(publicKey),
      amount.basisPoints
    );
  };

  const call = async <
    Result,
    Params extends any[] | Record<string, any> = any[]
  >(
    method: string,
    params?: Params,
    options: RpcCallOptions = {}
  ): Promise<Result> => {
    throw new Error('Not implemented');
  };

  const sendTransaction = async (
    transaction: Transaction,
    options: RpcSendTransactionOptions = {}
  ): Promise<TransactionSignature> => {
    try {
      const response = getLiteSvm().sendTransaction(
        toWeb3JsTransaction(transaction),
      );
      if (response instanceof FailedTransactionMetadata) {
        throw new Error('Transaction failed');
      }
      return base58.serialize(base58.deserialize(response.signature())[0]);
    } catch (error: any) {
      let resolvedError: ProgramError | null = null;
      if (error instanceof Error && 'logs' in error) {
        resolvedError = context.programs.resolveError(
          error as ErrorWithLogs,
          transaction
        );
      }
      throw resolvedError || error;
    }
  };

  const simulateTransaction = async (
    transaction: Transaction,
    options: RpcSimulateTransactionOptions = {}
  ): Promise<RpcSimulateTransactionResult> => {
    try {
      const tx = toWeb3JsTransaction(transaction);
      const liteSvm = getLiteSvm().withSigverify(false);
      const result = liteSvm.simulateTransaction(tx);
      console.log("result", result);
      if (result instanceof FailedTransactionMetadata) {
        console.log("result.err().constructor.name", result.err().constructor.name)
        return {
          err: result.err(),
          logs: result.meta().logs(),
        };
      } 
      console.log("result.meta()", result.meta());
      console.log("result.meta().logs()", result.meta().logs());
      console.log("result.postAccounts()", result.postAccounts().map(account => account[1].lamports()));
        return {
          err: null,
          unitsConsumed: Number(result.meta().computeUnitsConsumed()),
          logs: result.meta().logs(),
          returnData: {
            data: [base64.deserialize(result.meta().returnData().data())[0], 'base64'],
            programId: base58.deserialize(result.meta().returnData().programId())[0],
          },
        };
      

    } catch (error: any) {
      let resolvedError: ProgramError | null = null;
      if (error instanceof Error && 'logs' in error) {
        resolvedError = context.programs.resolveError(
          error as ErrorWithLogs,
          transaction
        );
      }
      throw resolvedError || error;
    }
  };

  const confirmTransaction = async (
    signature: TransactionSignature,
    options: RpcConfirmTransactionOptions
  ): Promise<RpcConfirmTransactionResult> => {
    throw new Error('Not implemented');
  };

  return {
    getEndpoint: (): string => 'http://localhost:8899',
    getCluster: (): Cluster => 'localnet',
    getAccount,
    getAccounts,
    getProgramAccounts,
    getBlockTime,
    getGenesisHash,
    getBalance,
    getRent,
    getSlot: async (options: RpcGetSlotOptions = {}) =>
      Number(getLiteSvm().getClock().slot),
    getLatestBlockhash,
    getTransaction,
    getSignatureStatuses,
    accountExists,
    airdrop,
    call,
    sendTransaction,
    simulateTransaction,
    confirmTransaction,
    get liteSvm() {
      return getLiteSvm();
    },
  };
}

function parseAccount(
  account: Web3JsAccountInfo<Uint8Array>,
  publicKey: PublicKey
): RpcAccount {
  return {
    executable: account.executable,
    owner: fromWeb3JsPublicKey(account.owner),
    lamports: lamports(account.lamports),
    rentEpoch: account.rentEpoch ? BigInt(account.rentEpoch) : undefined,
    publicKey,
    data: new Uint8Array(account.data),
  };
}

function parseMaybeAccount(
  account: Web3JsAccountInfo<Uint8Array> | null,
  publicKey: PublicKey
): MaybeRpcAccount {
  return account
    ? { ...parseAccount(account, publicKey), exists: true }
    : { exists: false, publicKey };
}

