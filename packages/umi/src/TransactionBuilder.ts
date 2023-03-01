import { SolAmount } from './Amount';
import type { Context } from './Context';
import { SdkError } from './errors';
import type { Instruction, WrappedInstruction } from './Instruction';
import type {
  RpcConfirmTransactionOptions,
  RpcConfirmTransactionResult,
  RpcConfirmTransactionStrategy,
  RpcSendTransactionOptions,
} from './RpcInterface';
import { Signer, signTransaction, uniqueSigners } from './Signer';
import {
  AddressLookupTableInput,
  Blockhash,
  BlockhashWithExpiryBlockHeight,
  Transaction,
  TransactionInput,
  TransactionSignature,
  TransactionVersion,
  TRANSACTION_SIZE_LIMIT,
} from './Transaction';

export type TransactionBuilderItemsInput =
  | WrappedInstruction
  | WrappedInstruction[]
  | TransactionBuilder
  | TransactionBuilder[];

export type TransactionBuilderOptions = {
  version?: TransactionVersion;
  addressLookupTables?: AddressLookupTableInput[];
  blockhash?: Blockhash | BlockhashWithExpiryBlockHeight;
};

export type TransactionBuilderSendAndConfirmOptions = {
  send?: RpcSendTransactionOptions;
  confirm?: Partial<RpcConfirmTransactionOptions>;
};

export class TransactionBuilder {
  constructor(
    readonly context: Pick<Context, 'rpc' | 'transactions' | 'payer'>,
    readonly items: WrappedInstruction[] = [],
    readonly options: TransactionBuilderOptions = {}
  ) {}

  empty(): TransactionBuilder {
    return new TransactionBuilder(this.context, [], this.options);
  }

  setItems(input: TransactionBuilderItemsInput): TransactionBuilder {
    return new TransactionBuilder(
      this.context,
      this.parseItems(input),
      this.options
    );
  }

  prepend(input: TransactionBuilderItemsInput): TransactionBuilder {
    return new TransactionBuilder(
      this.context,
      [...this.parseItems(input), ...this.items],
      this.options
    );
  }

  append(input: TransactionBuilderItemsInput): TransactionBuilder {
    return new TransactionBuilder(
      this.context,
      [...this.items, ...this.parseItems(input)],
      this.options
    );
  }

  add(input: TransactionBuilderItemsInput): TransactionBuilder {
    return this.append(input);
  }

  splitByIndex(index: number): [TransactionBuilder, TransactionBuilder] {
    return [
      new TransactionBuilder(
        this.context,
        this.items.slice(0, index),
        this.options
      ),
      new TransactionBuilder(
        this.context,
        this.items.slice(index),
        this.options
      ),
    ];
  }

  /**
   * Split the builder into multiple builders, such that
   * each of them should fit in a single transaction.
   *
   * This method is unsafe for several reasons:
   * - Because transactions are atomic, splitting the builder
   *   into multiple transactions may cause undesired side effects.
   *   For example, if the first transaction succeeds but the second
   *   one fails, you may end up with an inconsistent account state.
   *   This is why it is recommended to manually split your transactions
   *   such that each of them is valid on its own.
   * - It can only split the instructions of the builder. Meaning that,
   *   if the builder has a single instruction that is too big to fit in
   *   a single transaction, it will not be able to split it.
   */
  unsafeSplitByTransactionSize(): TransactionBuilder[] {
    return this.items.reduce(
      (builders, item) => {
        const lastBuilder = builders.pop() as TransactionBuilder;
        const lastBuilderWithItem = lastBuilder.add(item);
        if (lastBuilderWithItem.fitsInOneTransaction()) {
          builders.push(lastBuilderWithItem);
        } else {
          builders.push(lastBuilder);
          builders.push(lastBuilder.empty().add(item));
        }
        return builders;
      },
      [this.empty()]
    );
  }

  setVersion(version: TransactionVersion): TransactionBuilder {
    return new TransactionBuilder(this.context, this.items, {
      ...this.options,
      version,
    });
  }

  useLegacyVersion(): TransactionBuilder {
    return this.setVersion('legacy');
  }

  useV0(): TransactionBuilder {
    return this.setVersion(0);
  }

  setAddressLookupTables(
    addressLookupTables: AddressLookupTableInput[]
  ): TransactionBuilder {
    return new TransactionBuilder(this.context, this.items, {
      ...this.options,
      addressLookupTables,
    });
  }

  getBlockhash(): Blockhash | undefined {
    return typeof this.options.blockhash === 'object'
      ? this.options.blockhash.blockhash
      : this.options.blockhash;
  }

  setBlockhash(
    blockhash: Blockhash | BlockhashWithExpiryBlockHeight
  ): TransactionBuilder {
    return new TransactionBuilder(this.context, this.items, {
      ...this.options,
      blockhash,
    });
  }

  async setLatestBlockhash(): Promise<TransactionBuilder> {
    return this.setBlockhash(await this.context.rpc.getLatestBlockhash());
  }

  getInstructions(): Instruction[] {
    return this.items.map((item) => item.instruction);
  }

  getSigners(): Signer[] {
    return uniqueSigners([
      this.context.payer,
      ...this.items.flatMap((item) => item.signers),
    ]);
  }

  getBytesCreatedOnChain(): number {
    return this.items.reduce((sum, item) => sum + item.bytesCreatedOnChain, 0);
  }

  async getRentCreatedOnChain(): Promise<SolAmount> {
    return this.context.rpc.getRent(this.getBytesCreatedOnChain(), {
      includesHeaderBytes: true,
    });
  }

  getTransactionSize(): number {
    return this.context.transactions.serialize(
      this.setBlockhash('11111111111111111111111111111111').build()
    ).length;
  }

  minimumTransactionsRequired(): number {
    return Math.ceil(this.getTransactionSize() / TRANSACTION_SIZE_LIMIT);
  }

  fitsInOneTransaction(): boolean {
    return this.minimumTransactionsRequired() === 1;
  }

  build(): Transaction {
    const blockhash = this.getBlockhash();
    if (!blockhash) {
      throw new SdkError(
        'Setting a blockhash is required to build a transaction. ' +
          'Please use the `setBlockhash` or `setLatestBlockhash` methods.'
      );
    }
    const input: TransactionInput = {
      version: this.options.version ?? 0,
      payer: this.context.payer.publicKey,
      instructions: this.getInstructions(),
      blockhash,
    };
    if (input.version === 0 && this.options.addressLookupTables) {
      input.addressLookupTables = this.options.addressLookupTables;
    }
    return this.context.transactions.create(input);
  }

  async buildWithLatestBlockhash(): Promise<Transaction> {
    let builder: TransactionBuilder = this;
    if (!this.options.blockhash) {
      builder = await this.setLatestBlockhash();
    }
    return builder.build();
  }

  async buildAndSign(): Promise<Transaction> {
    return signTransaction(
      await this.buildWithLatestBlockhash(),
      this.getSigners()
    );
  }

  async send(
    options: RpcSendTransactionOptions = {}
  ): Promise<TransactionSignature> {
    const transaction = await this.buildAndSign();
    return this.context.rpc.sendTransaction(transaction, options);
  }

  async sendAndConfirm(
    options: TransactionBuilderSendAndConfirmOptions = {}
  ): Promise<{
    signature: TransactionSignature;
    result: RpcConfirmTransactionResult;
  }> {
    let builder: TransactionBuilder = this;
    if (!this.options.blockhash) {
      builder = await this.setLatestBlockhash();
    }

    let strategy: RpcConfirmTransactionStrategy;
    if (options.confirm?.strategy) {
      strategy = options.confirm.strategy;
    } else {
      const blockhash =
        typeof builder.options.blockhash === 'object'
          ? builder.options.blockhash
          : await builder.context.rpc.getLatestBlockhash();
      strategy = options.confirm?.strategy ?? {
        type: 'blockhash',
        ...blockhash,
      };
    }

    const signature = await builder.send(options.send);
    const result = await builder.context.rpc.confirmTransaction(signature, {
      ...options.confirm,
      strategy,
    });

    return { signature, result };
  }

  protected parseItems(
    input: TransactionBuilderItemsInput
  ): WrappedInstruction[] {
    return (Array.isArray(input) ? input : [input]).flatMap((item) =>
      'instruction' in item ? [item] : item.items
    );
  }
}

export const transactionBuilder = (
  context: Pick<Context, 'rpc' | 'transactions' | 'payer'>,
  items: WrappedInstruction[] = []
) => new TransactionBuilder(context, items);
