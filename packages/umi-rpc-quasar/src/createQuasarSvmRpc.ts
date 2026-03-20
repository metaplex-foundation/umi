import {
  ACCOUNT_HEADER_SIZE,
  BlockhashWithExpiryBlockHeight,
  Cluster,
  Context,
  DateTime,
  dateTime,
  ErrorWithLogs,
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
  RpcGetTransactionResponseOther,
  RpcInterface,
  RpcSendTransactionOptions,
  RpcSimulateTransactionOptions,
  RpcSimulateTransactionResult,
  SolAmount,
  Transaction,
  TransactionSignature,
  TransactionStatus,
  TransactionVersion,
  TransactionWithMeta,
} from '@metaplex-foundation/umi';
import {
  fromWeb3JsPublicKey,
  toWeb3JsPublicKey,
} from '@metaplex-foundation/umi-web3js-adapters';
import { base58 } from '@metaplex-foundation/umi/serializers';
import {
  PublicKey as Web3JsPublicKey,
  TransactionInstruction as Web3JsTransactionInstruction,
} from '@solana/web3.js';
import type {
  QuasarSvmInstance,
  QuasarKeyedAccount,
} from './quasar-svm';

/**
 * Internal representation of an account in the QuasarSVM store.
 */
interface StoredAccount {
  owner: Web3JsPublicKey;
  lamports: bigint;
  data: Buffer;
  executable: boolean;
}

/**
 * Configuration options for the QuasarSVM RPC.
 */
export interface QuasarSvmRpcOptions {
  /** The rent cost per byte-year in lamports. Defaults to Solana mainnet value. */
  lamportsPerByteYear?: bigint;
  /** The initial slot number. Defaults to 1. */
  initialSlot?: number;
}

/** The default rent cost: 19.055441478439427 lamports per byte, matching Solana's default. */
const DEFAULT_RENT_LAMPORTS_PER_BYTE_YEAR = BigInt(3480);
/** Minimum rent exemption multiplier (2 years). */
const RENT_EXEMPTION_YEARS = BigInt(2);
/** Exemption threshold bytes for the rent calculation formula. */
const RENT_EXEMPTION_THRESHOLD = BigInt(128);
/** System program ID. */
const SYSTEM_PROGRAM_ID = new Web3JsPublicKey(
  '11111111111111111111111111111111'
);

export function createQuasarSvmRpc(
  context: Pick<Context, 'programs' | 'transactions'>,
  svm: QuasarSvmInstance,
  options: QuasarSvmRpcOptions = {}
): RpcInterface & { svm: QuasarSvmInstance } {
  const lamportsPerByteYear =
    options.lamportsPerByteYear ?? DEFAULT_RENT_LAMPORTS_PER_BYTE_YEAR;
  let currentSlot = options.initialSlot ?? 1;
  let blockHeight = 1;
  let blockhashCounter = 0;

  // In-memory account store: base58 pubkey -> StoredAccount
  const accountStore = new Map<string, StoredAccount>();

  // Transaction result store: base58 signature -> stored tx result
  const transactionStore = new Map<
    string,
    TransactionWithMeta & RpcGetTransactionResponseOther
  >();

  // Signature status store
  const signatureStatuses = new Map<string, TransactionStatus>();

  // ---- Helpers ----

  function generateBlockhash(): string {
    blockhashCounter += 1;
    // Generate a deterministic blockhash from the counter
    const bytes = new Uint8Array(32);
    const view = new DataView(bytes.buffer);
    view.setUint32(0, blockhashCounter, true);
    view.setUint32(4, 0x51415352, true); // "QASR" marker
    return base58.deserialize(bytes)[0];
  }

  function getStoredAccount(publicKey: PublicKey): StoredAccount | undefined {
    return accountStore.get(publicKey as string);
  }

  function setStoredAccount(
    publicKey: PublicKey | Web3JsPublicKey,
    account: StoredAccount
  ): void {
    const key =
      publicKey instanceof Web3JsPublicKey
        ? fromWeb3JsPublicKey(publicKey)
        : publicKey;
    accountStore.set(key as string, account);
  }

  function toRpcAccount(
    publicKey: PublicKey,
    account: StoredAccount
  ): RpcAccount {
    return {
      executable: account.executable,
      owner: fromWeb3JsPublicKey(account.owner),
      lamports: lamports(account.lamports),
      publicKey,
      data: new Uint8Array(account.data),
    };
  }

  function toMaybeRpcAccount(
    publicKey: PublicKey,
    account: StoredAccount | undefined
  ): MaybeRpcAccount {
    if (account) {
      return { ...toRpcAccount(publicKey, account), exists: true };
    }
    return { exists: false, publicKey };
  }

  /**
   * Decompile a Umi Transaction back into web3.js TransactionInstructions
   * and gather the required KeyedAccountInfo from the store.
   */
  function decompileTransaction(transaction: Transaction): {
    instructions: Web3JsTransactionInstruction[];
    keyedAccounts: QuasarKeyedAccount[];
  } {
    const { message } = transaction;
    const allAccountKeys = message.accounts.map(toWeb3JsPublicKey);
    const { numRequiredSignatures, numReadonlySignedAccounts, numReadonlyUnsignedAccounts } = message.header;

    // Determine writable and signer status for each account
    const numWritableSigned = numRequiredSignatures - numReadonlySignedAccounts;
    const numUnsigned = allAccountKeys.length - numRequiredSignatures;
    const numWritableUnsigned = numUnsigned - numReadonlyUnsignedAccounts;

    const isWritable = (index: number): boolean => {
      if (index < numRequiredSignatures) {
        return index < numWritableSigned;
      }
      return index - numRequiredSignatures < numWritableUnsigned;
    };

    const isSigner = (index: number): boolean =>
      index < numRequiredSignatures;

    // Decompile instructions
    const instructions = message.instructions.map((compiled) => {
      const programId = allAccountKeys[compiled.programIndex];
      const keys = compiled.accountIndexes.map((accountIndex) => ({
        pubkey: allAccountKeys[accountIndex],
        isSigner: isSigner(accountIndex),
        isWritable: isWritable(accountIndex),
      }));
      return new Web3JsTransactionInstruction({
        programId,
        keys,
        data: Buffer.from(compiled.data),
      });
    });

    // Gather all unique accounts referenced by the transaction
    const seenKeys = new Set<string>();
    const keyedAccounts: QuasarKeyedAccount[] = [];

    for (const key of allAccountKeys) {
      const keyStr = key.toBase58();
      if (seenKeys.has(keyStr)) continue;
      seenKeys.add(keyStr);

      const stored = accountStore.get(
        fromWeb3JsPublicKey(key) as string
      );
      keyedAccounts.push({
        accountId: key,
        accountInfo: stored
          ? {
              owner: stored.owner,
              lamports: stored.lamports,
              data: stored.data,
              executable: stored.executable,
            }
          : {
              owner: SYSTEM_PROGRAM_ID,
              lamports: BigInt(0),
              data: Buffer.alloc(0),
              executable: false,
            },
      });
    }

    return { instructions, keyedAccounts };
  }

  /**
   * Execute a transaction through QuasarSVM and update the account store.
   */
  function executeTransaction(
    transaction: Transaction,
    persist: boolean
  ): {
    logs: string[];
    err: any;
    computeUnits: bigint;
    returnData: Uint8Array;
    preBalances: bigint[];
    postBalances: bigint[];
  } {
    const { instructions, keyedAccounts } = decompileTransaction(transaction);
    const allAccountKeys = transaction.message.accounts;

    // Record pre-balances
    const preBalances = allAccountKeys.map((key) => {
      const stored = getStoredAccount(key);
      return stored ? stored.lamports : BigInt(0);
    });

    // Execute through QuasarSVM
    const result = svm.processTransaction(instructions, keyedAccounts);

    const err = result.status !== 0 ? (result.errorMessage ?? 'Transaction failed') : null;

    // Update account store with result accounts if persisting
    if (persist && result.status === 0) {
      for (const acct of result.accounts) {
        setStoredAccount(acct.accountId, {
          owner: acct.accountInfo.owner,
          lamports: BigInt(acct.accountInfo.lamports),
          data: Buffer.from(acct.accountInfo.data),
          executable: acct.accountInfo.executable,
        });
      }
    }

    // Record post-balances
    const postBalances = allAccountKeys.map((key) => {
      const stored = getStoredAccount(key);
      return stored ? stored.lamports : BigInt(0);
    });

    return {
      logs: result.logs,
      err,
      computeUnits: result.computeUnits,
      returnData: result.returnData,
      preBalances,
      postBalances,
    };
  }

  // Calculate rent exemption for a given number of data bytes
  function calculateRentExemption(bytes: number): bigint {
    const totalBytes = BigInt(bytes) + RENT_EXEMPTION_THRESHOLD;
    return (
      (lamportsPerByteYear * totalBytes * RENT_EXEMPTION_YEARS) / BigInt(1)
    );
  }

  // ---- RPC Interface Implementation ----

  const getAccount = async (
    publicKey: PublicKey,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: RpcGetAccountOptions = {}
  ): Promise<MaybeRpcAccount> =>
    toMaybeRpcAccount(publicKey, getStoredAccount(publicKey));

  const getAccounts = async (
    publicKeys: PublicKey[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: RpcGetAccountsOptions = {}
  ): Promise<MaybeRpcAccount[]> =>
    publicKeys.map((pk) => toMaybeRpcAccount(pk, getStoredAccount(pk)));

  const getProgramAccounts = async (
    programId: PublicKey,
    options: RpcGetProgramAccountsOptions = {}
  ): Promise<RpcAccount[]> => {
    const results: RpcAccount[] = [];
    const programIdStr = programId as string;

    for (const [key, account] of accountStore.entries()) {
      if (fromWeb3JsPublicKey(account.owner) !== programIdStr) continue;

      // Apply filters
      if (options.filters) {
        let matches = true;
        for (const filter of options.filters) {
          if ('dataSize' in filter) {
            if (account.data.length !== filter.dataSize) {
              matches = false;
              break;
            }
          } else if ('memcmp' in filter) {
            const { offset, bytes } = filter.memcmp;
            const slice = account.data.subarray(
              offset,
              offset + bytes.length
            );
            if (
              slice.length !== bytes.length ||
              !slice.every((b, i) => b === bytes[i])
            ) {
              matches = false;
              break;
            }
          }
        }
        if (!matches) continue;
      }

      results.push(toRpcAccount(key as PublicKey, account));
    }
    return results;
  };

  const getBalance = async (
    publicKey: PublicKey,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: RpcGetBalanceOptions = {}
  ): Promise<SolAmount> => {
    const account = getStoredAccount(publicKey);
    return lamports(account ? account.lamports : BigInt(0));
  };

  const getSlot = async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: RpcGetSlotOptions = {}
  ): Promise<number> => currentSlot;

  const getLatestBlockhash = async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: RpcGetLatestBlockhashOptions = {}
  ): Promise<BlockhashWithExpiryBlockHeight> => {
    blockHeight += 1;
    return {
      blockhash: generateBlockhash(),
      lastValidBlockHeight: blockHeight + 150,
    };
  };

  const getGenesisHash = async (): Promise<string> => {
    // Return a deterministic genesis hash for the test environment
    const bytes = new Uint8Array(32);
    bytes.fill(0x01);
    return base58.deserialize(bytes)[0];
  };

  const getRent = async (
    bytes: number,
    options: RpcGetRentOptions = {}
  ): Promise<SolAmount> => {
    if (options.includesHeaderBytes ?? false) {
      const rentPerByte =
        calculateRentExemption(0) / BigInt(ACCOUNT_HEADER_SIZE);
      return lamports(rentPerByte * BigInt(bytes));
    }
    return lamports(calculateRentExemption(bytes));
  };

  const getBlockTime = async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _slot: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: RpcGetBlockTimeOptions = {}
  ): Promise<DateTime | null> => dateTime(Math.floor(Date.now() / 1000));

  const getTransaction = async (
    signature: TransactionSignature,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: RpcGetTransactionOptions = {}
  ): Promise<(TransactionWithMeta & RpcGetTransactionResponseOther) | null> => {
    const sigStr = base58.deserialize(signature)[0];
    return transactionStore.get(sigStr) ?? null;
  };

  const getSignatureStatuses = async (
    signatures: TransactionSignature[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: RpcGetSignatureStatusesOptions = {}
  ): Promise<Array<TransactionStatus | null>> =>
    signatures.map((sig) => {
      const sigStr = base58.deserialize(sig)[0];
      return signatureStatuses.get(sigStr) ?? null;
    });

  const accountExists = async (
    publicKey: PublicKey,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: RpcAccountExistsOptions = {}
  ): Promise<boolean> => accountStore.has(publicKey as string);

  const airdrop = async (
    publicKey: PublicKey,
    amount: SolAmount,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: RpcAirdropOptions = {}
  ): Promise<void> => {
    const existing = getStoredAccount(publicKey);
    if (existing) {
      existing.lamports += amount.basisPoints;
    } else {
      setStoredAccount(publicKey, {
        owner: SYSTEM_PROGRAM_ID,
        lamports: amount.basisPoints,
        data: Buffer.alloc(0),
        executable: false,
      });
    }
  };

  const sendTransaction = async (
    transaction: Transaction,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: RpcSendTransactionOptions = {}
  ): Promise<TransactionSignature> => {
    currentSlot += 1;

    const result = executeTransaction(transaction, true);
    const signature = transaction.signatures[0];
    const sigStr = base58.deserialize(signature)[0];

    if (result.err) {
      // Store status as failed
      signatureStatuses.set(sigStr, {
        slot: currentSlot,
        confirmations: null,
        error: result.err,
        commitment: 'confirmed',
      });

      const error = new Error(
        typeof result.err === 'string' ? result.err : 'Transaction failed'
      ) as Error & { logs: string[] };
      error.logs = result.logs;

      let resolvedError: ProgramError | null = null;
      resolvedError = context.programs.resolveError(
        error as ErrorWithLogs,
        transaction
      );
      throw resolvedError || error;
    }

    // Store success status
    signatureStatuses.set(sigStr, {
      slot: currentSlot,
      confirmations: null,
      error: null,
      commitment: 'confirmed',
    });

    // Store the full transaction result
    transactionStore.set(sigStr, {
      message: transaction.message,
      serializedMessage: transaction.serializedMessage,
      signatures: transaction.signatures,
      response: {
        blockTime: BigInt(Math.floor(Date.now() / 1000)),
        slot: BigInt(currentSlot),
        version: transaction.message.version as TransactionVersion,
      },
      meta: {
        fee: lamports(5000),
        logs: result.logs,
        preBalances: result.preBalances.map(lamports),
        postBalances: result.postBalances.map(lamports),
        preTokenBalances: [],
        postTokenBalances: [],
        innerInstructions: null,
        loadedAddresses: { writable: [], readonly: [] },
        computeUnitsConsumed: result.computeUnits,
        costUnits: null,
        err: null,
      },
    });

    return signature;
  };

  const simulateTransaction = async (
    transaction: Transaction,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: RpcSimulateTransactionOptions = {}
  ): Promise<RpcSimulateTransactionResult> => {
    const result = executeTransaction(transaction, false);
    return {
      err: result.err,
      unitsConsumed: Number(result.computeUnits),
      logs: result.logs,
    };
  };

  const confirmTransaction = async (
    signature: TransactionSignature,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: RpcConfirmTransactionOptions
  ): Promise<RpcConfirmTransactionResult> => {
    const sigStr = base58.deserialize(signature)[0];
    const status = signatureStatuses.get(sigStr);
    return {
      context: { slot: currentSlot },
      value: { err: status?.error ?? null },
    };
  };

  const call = async <Result, Params extends any[] | Record<string, any>>(
    method: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _params?: Params,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: RpcCallOptions = {}
  ): Promise<Result> => {
    throw new Error(
      `QuasarSVM RPC does not support arbitrary RPC calls. Method: ${method}`
    );
  };

  return {
    getEndpoint: () => 'quasar-svm://in-process',
    getCluster: (): Cluster => 'custom',
    getAccount,
    getAccounts,
    getProgramAccounts,
    getBlockTime,
    getGenesisHash,
    getBalance,
    getRent,
    getSlot,
    getLatestBlockhash,
    getTransaction,
    getSignatureStatuses,
    accountExists,
    airdrop,
    call,
    sendTransaction,
    simulateTransaction,
    confirmTransaction,
    get svm() {
      return svm;
    },
  };
}
