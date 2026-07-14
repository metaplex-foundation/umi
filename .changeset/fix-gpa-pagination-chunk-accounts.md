---
"@metaplex-foundation/umi-rpc-web3js": patch
---

Chunk `getAccounts` (`getMultipleAccounts`) requests at the Solana RPC limit of 100, and automatically fall back to paginated `getProgramAccountsV2` when providers reject oversized `getProgramAccounts` result sets (e.g. Helius "Too many accounts requested").
