// import { Transaction } from '@metaplex-foundation/umi';
// import { Transaction as KitTransaction, TransactionMessageBytes } from '@solana/transactions';

// // Conversion utilities for Transaction between @solana/kit and umi

// export function fromKitTransaction(kitTransaction: KitTransaction): Transaction {

//     // TODO: Implement actual conversion logic
//     return {};
// }

// // Convert a umi Transaction to a Kit transaction
// export function toKitTransaction(umiTransaction: Transaction): KitTransaction {
//     return {
//         messageBytes: umiTransaction.serializedMessage as unknown as TransactionMessageBytes,
//         signatures: umiTransaction.signatures.map((signature) => signature.toString()),
//     };
// }
