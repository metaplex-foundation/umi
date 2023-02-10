import { SolAmount } from './Amount';
import type { Context } from './Context';
import type { Instruction, WrappedInstruction } from './Instruction';
import type {
  RpcConfirmTransactionOptions,
  RpcConfirmTransactionResult,
  RpcConfirmTransactionStrategy,
  RpcSendTransactionOptions,
} from './RpcInterface';
import { deduplicateSigners, Signer, signTransaction } from './Signer';
import type {
  Blockhash,
  Transaction,
  TransactionInput,
  TransactionSignature,
} from './Transaction';

export type TransactionBuilderItemsInput =
  | WrappedInstruction
  | WrappedInstruction[]
  | TransactionBuilder
  | TransactionBuilder[];

export type TransactionBuilderBuildOptions = Omit<
  TransactionInput,
  'payer' | 'instructions'
>;

export type TransactionBuilderSendOptions = {
  build?: Partial<TransactionBuilderBuildOptions>;
  send?: RpcSendTransactionOptions;
  confirm?: Partial<RpcConfirmTransactionOptions>;
};

export type TransactionBuilderSendAndConfirmOptions =
  TransactionBuilderSendOptions & {
    confirm?: Partial<RpcConfirmTransactionOptions>;
  };

export class TransactionBuilder {
  constructor(
    protected readonly context: Pick<Context, 'rpc' | 'transactions' | 'payer'>,
    protected readonly items: WrappedInstruction[] = []
  ) {}

  prepend(input: TransactionBuilderItemsInput): TransactionBuilder {
    return new TransactionBuilder(this.context, [
      ...this.parseItems(input),
      ...this.items,
    ]);
  }

  append(input: TransactionBuilderItemsInput): TransactionBuilder {
    return new TransactionBuilder(this.context, [
      ...this.items,
      ...this.parseItems(input),
    ]);
  }

  add(input: TransactionBuilderItemsInput): TransactionBuilder {
    return this.append(input);
  }

  splitAtIndex(index: number): [TransactionBuilder, TransactionBuilder] {
    return [
      new TransactionBuilder(this.context, this.items.slice(0, index)),
      new TransactionBuilder(this.context, this.items.slice(index)),
    ];
  }

  getInstructions(): Instruction[] {
    return this.items.map((item) => item.instruction);
  }

  getSigners(): Signer[] {
    return deduplicateSigners([
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

  build(options: TransactionBuilderBuildOptions): Transaction {
    return this.context.transactions.create({
      payer: this.context.payer.publicKey,
      instructions: this.getInstructions(),
      ...options,
    });
  }

  async buildAndSign(
    options: TransactionBuilderBuildOptions
  ): Promise<Transaction> {
    return signTransaction(this.build(options), this.getSigners());
  }

  async send(
    options: TransactionBuilderSendOptions = {}
  ): Promise<TransactionSignature> {
    const blockhash =
      options.build?.blockhash ??
      (await this.context.rpc.getLatestBlockhash()).blockhash;
    const transaction = await this.buildAndSign({
      blockhash,
      ...options.build,
    });
    return this.context.rpc.sendTransaction(transaction, options.send);
  }

  async sendAndConfirm(
    options: TransactionBuilderSendAndConfirmOptions = {}
  ): Promise<{
    signature: TransactionSignature;
    result: RpcConfirmTransactionResult;
  }> {
    let blockhash: Blockhash;
    let strategy: RpcConfirmTransactionStrategy;
    if (options.confirm?.strategy && options.build?.blockhash) {
      blockhash = options.build.blockhash;
      strategy = options.confirm.strategy;
    } else {
      const latestBlockhash = await this.context.rpc.getLatestBlockhash();
      blockhash = latestBlockhash.blockhash;
      strategy = options.confirm?.strategy ?? {
        type: 'blockhash',
        ...latestBlockhash,
      };
    }

    const signature = await this.send({
      ...options,
      build: { blockhash, ...options.build },
    });
    const result = await this.context.rpc.confirmTransaction(signature, {
      strategy,
      ...options.confirm,
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
