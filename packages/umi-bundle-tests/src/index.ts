import {
  Umi,
  createBaseUmi,
  sol,
  Context,
  generateSigner,
  TransactionWithMeta,
  SolAmount,
  lamports,
  TransactionSignature,
} from '@metaplex-foundation/umi';
import { Web3JsRpcOptions } from '@metaplex-foundation/umi-rpc-web3js';
import { testPlugins } from './plugin';

export const createUmi = async (
  endpoint?: string,
  rpcOptions?: Web3JsRpcOptions,
  airdropAmount = sol(100)
): Promise<Umi> => {
  const umi = createBaseUmi().use(testPlugins(endpoint, rpcOptions));
  await umi.rpc.airdrop(umi.identity.publicKey, airdropAmount);
  return umi;
};

export const generateSignerWithSol = async (
  context: Pick<Context, 'eddsa' | 'rpc'>,
  airdropAmount = sol(100)
) => {
  const signer = generateSigner(context);
  await context.rpc.airdrop(signer.publicKey, airdropAmount);
  return signer;
};

export type SolBalanceChanges = { [pubkey: string]: SolAmount };

// Helper function to extract SOL balance changes from a transaction
export function getSolBalanceChanges(
  transaction: TransactionWithMeta
): SolBalanceChanges {
  const changes: SolBalanceChanges = {};

  if (!transaction.meta) {
    return changes;
  }

  const { preBalances, postBalances } = transaction.meta;
  const accountKeys = transaction.message.accounts;

  // Calculate balance changes for each account
  for (let i = 0; i < accountKeys.length; i += 1) {
    const accountKey = accountKeys[i].toString();
    const preBalance = preBalances[i];
    const postBalance = postBalances[i];

    const changeBasisPoints = postBalance.basisPoints - preBalance.basisPoints;
    changes[accountKey] = lamports(changeBasisPoints);
  }

  return changes;
}

// Helper function to assert SOL balance changes across multiple transactions
export async function assertSolBalanceChanges(
  umi: Pick<Context, 'rpc'>,
  signatures: TransactionSignature[],
  expectedChanges: SolBalanceChanges,
  exclusive: boolean = false
): Promise<void> {
  const aggregatedChanges: { [pubkey: string]: bigint } = {};

  const transactions = await Promise.all(
    signatures.map(signature =>
      umi.rpc.getTransaction(signature, { commitment: 'confirmed' })
    )
  );

  transactions.forEach((transaction, index) => {
    if (!transaction) {
      throw new Error(`Transaction not found for signature: ${signatures[index]}`);
    }

    const txChanges = getSolBalanceChanges(transaction);

    Object.entries(txChanges).forEach(([pubkey, change]) => {
      const current = aggregatedChanges[pubkey] || 0n;
      aggregatedChanges[pubkey] = current + change.basisPoints;
    });
  });

  const actualChanges: SolBalanceChanges = {};
  Object.entries(aggregatedChanges).forEach(([pubkey, basisPoints]) => {
    actualChanges[pubkey] = lamports(basisPoints);
  });

  Object.entries(expectedChanges).forEach(([pubkey, expectedAmount]) => {
    const actualAmount = actualChanges[pubkey] || lamports(0);

    if (actualAmount.basisPoints !== expectedAmount.basisPoints) {
      throw new Error(
        `Balance change mismatch for ${pubkey}: expected ${expectedAmount.basisPoints} lamports, got ${actualAmount.basisPoints} lamports`
      );
    }
  });

  if (exclusive) {
    Object.entries(actualChanges).forEach(([pubkey, actualAmount]) => {
      if (!(pubkey in expectedChanges) && actualAmount.basisPoints !== 0n) {
        throw new Error(
          `Unexpected balance change for ${pubkey}: ${actualAmount.basisPoints} lamports`
        );
      }
    });
  }
}

export * from './plugin';
