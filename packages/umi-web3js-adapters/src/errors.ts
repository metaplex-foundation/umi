import { SdkError, TransactionVersion } from '@metaplex-foundation/umi';

/**
 * Thrown when an operation needs a `@solana/web3.js` 1.x object for a
 * transaction version that web3.js 1.x cannot represent, such as V1.
 * Catch it to fall back to another transaction version.
 */
export class Web3JsTransactionVersionError extends SdkError {
  readonly name: string = 'Web3JsTransactionVersionError';

  constructor(
    operation: string,
    version: TransactionVersion,
    fix = 'Serialize and sign the transaction with Umi (a keypair signer ' +
      'and `umi.transactions.serialize`), or build it with useV0().'
  ) {
    const label = version === 'legacy' ? 'legacy' : `V${version}`;
    super(
      `${operation} does not support ${label} transactions because ` +
        `@solana/web3.js 1.x cannot represent them. ${fix}`
    );
  }
}
