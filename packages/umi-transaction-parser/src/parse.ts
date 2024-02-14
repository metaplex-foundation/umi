// eslint-disable-next-line import/no-extraneous-dependencies
import { CompiledInstruction, Context, TransactionSignature, TransactionWithMeta, Instruction as UmiInstruction } from '@metaplex-foundation/umi';

export type Instruction = Omit<UmiInstruction, "keys"> & { keys: { pubkey: string; isSigner?: boolean; isWritable: boolean }[] };
export type InnerInstructions = { innerInstructions: Instruction[] };
export type TopLevelInstruction = Instruction & InnerInstructions;

function accountIndexToPubkey(tx: TransactionWithMeta, index: number) {
    return tx.message.accounts[index];
}

export async function parseInstructions(context: Pick<Context, 'rpc'>, signature: TransactionSignature): Promise<TopLevelInstruction[]> {
    const tx = await context.rpc.getTransaction(signature);

    const topLevelInstructions: TopLevelInstruction[] = [];
    if (tx) {
        tx.message.instructions.forEach((tlIx) => {
            const keys = tlIx.accountIndexes.map((accountIndex) => ({
                pubkey: accountIndexToPubkey(tx, accountIndex),
                isWritable: tx.meta.loadedAddresses.writable.includes(accountIndexToPubkey(tx, accountIndex)),
            }));

            const ix: TopLevelInstruction = {
                programId: tx.message.accounts[tlIx.programIndex],
                keys,
                data: tlIx.data,
                innerInstructions: [],
            };

            topLevelInstructions.push(ix);
        });

        if (tx.meta.innerInstructions) {
            for (let index = 0; index < tx.meta.innerInstructions.length; index += 1) {
                topLevelInstructions[index].innerInstructions = tx.meta.innerInstructions[index].instructions.map((ix: CompiledInstruction) => {
                    const keys = ix.accountIndexes.map((accountIndex) => ({
                        pubkey: accountIndexToPubkey(tx, accountIndex),
                        isWritable: tx.meta.loadedAddresses.writable.includes(accountIndexToPubkey(tx, accountIndex)),
                    }));

                    const retIx: Instruction = {
                        programId: accountIndexToPubkey(tx, ix.programIndex),
                        keys,
                        data: ix.data,
                    };

                    return retIx
                });
            }
        }
    }

    return topLevelInstructions;
};