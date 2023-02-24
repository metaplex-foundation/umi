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
import type {
  AddressLookupTableInput,
  Blockhash,
  BlockhashWithExpiryBlockHeight,
  Transaction,
  TransactionInput,
  TransactionSignature,
} from './Transaction';

export type TransactionBuilderItemsInput =
  | WrappedInstruction
  | WrappedInstruction[]
  | TransactionBuilder
  | TransactionBuilder[];

export type TransactionBuilderOptions = {
  version?: 'legacy' | 0;
  addressLookupTables?: AddressLookupTableInput[];
  blockhash?: Blockhash | BlockhashWithExpiryBlockHeight;
};

export type TransactionBuilderSendAndConfirmOptions = {
  send?: RpcSendTransactionOptions;
  confirm?: Partial<RpcConfirmTransactionOptions>;
};

export class TransactionBuilder {
  constructor(
    protected readonly context: Pick<Context, 'rpc' | 'transactions' | 'payer'>,
    protected readonly items: WrappedInstruction[] = [],
    protected readonly options: TransactionBuilderOptions = {}
  ) {}

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

  splitAtIndex(index: number): [TransactionBuilder, TransactionBuilder] {
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
    if (!this.getBlockhash()) this.setBlockhash('dummy-blockhash');
    const tx = this.build();
    return tx.serializedMessage.length + 64 * tx.signatures.length;
  }

  setVersion(
    version: TransactionBuilderOptions['version']
  ): TransactionBuilder {
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
    addressLookupTables: TransactionBuilderOptions['addressLookupTables']
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
    if (!this.options.blockhash) {
      await this.setLatestBlockhash();
    }
    return this.build();
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
    if (!this.options.blockhash) {
      await this.setLatestBlockhash();
    }

    let strategy: RpcConfirmTransactionStrategy;
    if (options.confirm?.strategy) {
      strategy = options.confirm.strategy;
    } else {
      const blockhash =
        typeof this.options.blockhash === 'object'
          ? this.options.blockhash
          : await this.context.rpc.getLatestBlockhash();
      strategy = options.confirm?.strategy ?? {
        type: 'blockhash',
        ...blockhash,
      };
    }

    const signature = await this.send(options.send);
    const result = await this.context.rpc.confirmTransaction(signature, {
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
