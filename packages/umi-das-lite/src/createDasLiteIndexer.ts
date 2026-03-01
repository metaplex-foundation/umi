import {
  type PublicKey,
  type RpcInterface,
  type Context,
  publicKeyBytes,
  samePublicKey,
  defaultPublicKey,
} from '@metaplex-foundation/umi';
import type {
  DasApiAsset,
  DasApiAssetList,
  DasApiInterface,
  GetAssetRpcInput,
  GetAssetsRpcInput,
  GetAssetsByAuthorityRpcInput,
  GetAssetsByCreatorRpcInput,
  GetAssetsByGroupRpcInput,
  GetAssetsByOwnerRpcInput,
  GetAssetSignaturesRpcInput,
  GetAssetSignaturesRpcResponse,
  GetAssetProofRpcResponse,
  GetAssetProofsRpcResponse,
  SearchAssetsRpcInput,
  DasApiAssetContent,
  DasApiAssetCompression,
  DasApiAssetOwnership,
  DasApiAssetRoyalty,
  DasApiAssetSupply,
  DasApiAssetCreator,
  DasApiAssetAuthority,
  DasApiAssetGrouping,
} from '@metaplex-foundation/digital-asset-standard-api';
import { DasApiError } from '@metaplex-foundation/digital-asset-standard-api';
import {
  TOKEN_METADATA_PROGRAM_ID,
  SPL_TOKEN_PROGRAM_ID,
  parseMetadataAccount,
  parseMintAccount,
  parseTokenAccount,
  type ParsedMetadata,
  type ParsedMintAccount,
} from './parsers';

/**
 * Creates a DAS lite indexer that reads on-chain Token Metadata accounts
 * and builds DAS API-compatible responses. This is intended for local
 * testing with a Solana validator, where a full DAS indexer is not available.
 *
 * Supported:
 * - Standard Token Metadata NFTs (V1_NFT, ProgrammableNFT)
 * - getAsset, getAssets, getAssetsByOwner, getAssetsByCreator,
 *   getAssetsByAuthority, getAssetsByGroup, searchAssets
 *
 * Not supported (throws):
 * - Compressed NFTs (getAssetProof, getAssetProofs)
 * - Transaction signatures (getAssetSignatures)
 */
export function createDasLiteIndexer(
  context: Pick<Context, 'rpc' | 'eddsa'>
): RpcInterface & DasApiInterface {
  const { rpc, eddsa } = context;

  // --- PDA derivation ---

  function findMetadataPda(mint: PublicKey): PublicKey {
    const seeds = [
      new TextEncoder().encode('metadata'),
      publicKeyBytes(TOKEN_METADATA_PROGRAM_ID),
      publicKeyBytes(mint),
    ];
    const [pda] = eddsa.findPda(TOKEN_METADATA_PROGRAM_ID, seeds);
    return pda;
  }

  // --- Asset building ---

  async function fetchAsset(mint: PublicKey): Promise<DasApiAsset | null> {
    const metadataPda = findMetadataPda(mint);
    const [metadataAccount, mintAccount] = await Promise.all([
      rpc.getAccount(metadataPda),
      rpc.getAccount(mint),
    ]);

    if (!metadataAccount.exists || !mintAccount.exists) {
      return null;
    }

    const metadata = parseMetadataAccount(metadataAccount.data);
    const mintInfo = parseMintAccount(mintAccount.data);

    // Find the owner by looking for token accounts for this mint
    const owner = await findTokenOwner(mint);

    return buildDasApiAsset(mint, metadata, mintInfo, owner);
  }

  async function findTokenOwner(mint: PublicKey): Promise<PublicKey | null> {
    // Find token accounts for this mint with amount > 0.
    // Filter: dataSize=165 (token account size) + memcmp at offset 0 for mint.
    const tokenAccounts = await rpc.getProgramAccounts(SPL_TOKEN_PROGRAM_ID, {
      filters: [
        { dataSize: 165 },
        { memcmp: { offset: 0, bytes: publicKeyBytes(mint) } },
      ],
    });

    for (const account of tokenAccounts) {
      const parsed = parseTokenAccount(account.data);
      if (parsed.amount > 0n) {
        return parsed.owner;
      }
    }
    return null;
  }

  function buildDasApiAsset(
    mint: PublicKey,
    metadata: ParsedMetadata,
    mintInfo: ParsedMintAccount,
    owner: PublicKey | null
  ): DasApiAsset {
    const isNonFungible =
      mintInfo.decimals === 0 && mintInfo.supply <= 1n;

    const content: DasApiAssetContent = {
      json_uri: metadata.uri,
      metadata: {
        name: metadata.name,
        symbol: metadata.symbol,
        token_standard: isNonFungible ? 'NonFungible' : 'Fungible',
      },
      files: [],
    };

    const authorities: DasApiAssetAuthority[] = [
      {
        address: metadata.updateAuthority,
        scopes: ['full'],
      },
    ];

    const compression: DasApiAssetCompression = {
      eligible: false,
      compressed: false,
      data_hash: defaultPublicKey(),
      creator_hash: defaultPublicKey(),
      asset_hash: defaultPublicKey(),
      tree: defaultPublicKey(),
      seq: 0,
      leaf_id: 0,
    };

    const grouping: DasApiAssetGrouping[] = [];

    const creators: DasApiAssetCreator[] = (metadata.creators ?? []).map(
      (c) => ({
        address: c.address,
        share: c.share,
        verified: c.verified,
      })
    );

    const royalty: DasApiAssetRoyalty = {
      royalty_model: 'creators',
      target: null,
      percent: metadata.sellerFeeBasisPoints / 10000,
      basis_points: metadata.sellerFeeBasisPoints,
      primary_sale_happened: metadata.primarySaleHappened,
      locked: false,
    };

    const ownership: DasApiAssetOwnership = {
      frozen: false,
      delegated: false,
      delegate: null,
      ownership_model: 'single',
      owner: owner ?? defaultPublicKey(),
    };

    const supply: DasApiAssetSupply = {
      print_max_supply: 0,
      print_current_supply: 0,
      edition_nonce: null,
    };

    return {
      interface: 'V1_NFT',
      id: mint,
      content,
      authorities,
      compression,
      grouping,
      royalty,
      creators,
      ownership,
      supply,
      mutable: metadata.isMutable,
      burnt: false,
    };
  }

  // --- Batch fetching helpers ---

  /**
   * Fetch all metadata accounts from the Token Metadata program,
   * optionally filtered by a memcmp at a specific offset.
   */
  async function fetchAllMetadataAccounts(
    filters?: { offset: number; bytes: Uint8Array }[]
  ): Promise<
    Array<{ pubkey: PublicKey; metadata: ParsedMetadata; data: Uint8Array }>
  > {
    const rpcFilters = (filters ?? []).map((f) => ({
      memcmp: { offset: f.offset, bytes: f.bytes },
    }));

    const accounts = await rpc.getProgramAccounts(
      TOKEN_METADATA_PROGRAM_ID,
      { filters: rpcFilters }
    );

    const results: Array<{
      pubkey: PublicKey;
      metadata: ParsedMetadata;
      data: Uint8Array;
    }> = [];

    for (const account of accounts) {
      try {
        // Metadata accounts have key=4
        if (account.data[0] !== 4) continue;
        const metadata = parseMetadataAccount(account.data);
        results.push({
          pubkey: account.publicKey,
          metadata,
          data: account.data,
        });
      } catch {
        // Skip accounts that fail to parse
      }
    }

    return results;
  }

  /**
   * Build DasApiAsset objects from metadata entries, fetching
   * mint and token account info in parallel.
   */
  async function buildAssetsFromMetadata(
    entries: Array<{ metadata: ParsedMetadata }>
  ): Promise<DasApiAsset[]> {
    const assets = await Promise.all(
      entries.map(async ({ metadata }) => {
        try {
          const mintAccount = await rpc.getAccount(metadata.mint);
          if (!mintAccount.exists) return null;
          const mintInfo = parseMintAccount(mintAccount.data);
          const owner = await findTokenOwner(metadata.mint);
          return buildDasApiAsset(metadata.mint, metadata, mintInfo, owner);
        } catch {
          return null;
        }
      })
    );
    return assets.filter((a): a is DasApiAsset => a !== null);
  }

  function paginate(
    items: DasApiAsset[],
    page?: number | null,
    limit?: number | null
  ): DasApiAssetList {
    const effectiveLimit = limit ?? 1000;
    const effectivePage = page ?? 1;
    const start = (effectivePage - 1) * effectiveLimit;
    const paged = items.slice(start, start + effectiveLimit);
    return {
      total: items.length,
      limit: effectiveLimit,
      items: paged,
    };
  }

  // --- DAS API methods ---

  return {
    ...rpc,

    async getAsset(
      input: GetAssetRpcInput | PublicKey
    ): Promise<DasApiAsset> {
      const assetId =
        typeof input === 'object' && 'assetId' in input
          ? input.assetId
          : input;
      const asset = await fetchAsset(assetId);
      if (!asset) {
        throw new DasApiError(`Asset not found: ${assetId}`);
      }
      return asset;
    },

    async getAssets(
      input: GetAssetsRpcInput | PublicKey[]
    ): Promise<DasApiAsset[]> {
      const assetIds = Array.isArray(input) ? input : input.assetIds;
      const assets = await Promise.all(assetIds.map(fetchAsset));
      return assets.filter((a): a is DasApiAsset => a !== null);
    },

    async getAssetProof(
      _assetId: PublicKey
    ): Promise<GetAssetProofRpcResponse> {
      throw new DasApiError(
        'getAssetProof is not supported by the lite indexer (compressed NFTs are not indexed)'
      );
    },

    async getAssetProofs(
      _assetIds: PublicKey[]
    ): Promise<GetAssetProofsRpcResponse> {
      throw new DasApiError(
        'getAssetProofs is not supported by the lite indexer (compressed NFTs are not indexed)'
      );
    },

    async getAssetsByAuthority(
      input: GetAssetsByAuthorityRpcInput
    ): Promise<DasApiAssetList> {
      // Metadata account layout: key(1) + updateAuthority(32)
      // Filter by updateAuthority at offset 1.
      const entries = await fetchAllMetadataAccounts([
        { offset: 1, bytes: publicKeyBytes(input.authority) },
      ]);
      const assets = await buildAssetsFromMetadata(entries);
      return paginate(assets, input.page, input.limit);
    },

    async getAssetsByCreator(
      input: GetAssetsByCreatorRpcInput
    ): Promise<DasApiAssetList> {
      // We can't filter by creator on-chain with memcmp because creators
      // are at a variable offset (after 3 variable-length strings).
      // Fetch all metadata accounts and filter in memory.
      const entries = await fetchAllMetadataAccounts();
      const filtered = entries.filter(({ metadata }) =>
        (metadata.creators ?? []).some(
          (c) =>
            samePublicKey(c.address, input.creator) &&
            (!input.onlyVerified || c.verified)
        )
      );
      const assets = await buildAssetsFromMetadata(filtered);
      return paginate(assets, input.page, input.limit);
    },

    async getAssetsByGroup(
      input: GetAssetsByGroupRpcInput
    ): Promise<DasApiAssetList> {
      if (input.groupKey !== 'collection') {
        return { total: 0, limit: input.limit ?? 1000, items: [] };
      }

      // Collection is stored in metadata after the main data section
      // at a variable offset. We need to fetch all and filter in memory.
      const entries = await fetchAllMetadataAccounts();
      // For now, return all assets (collection filtering requires
      // parsing the full metadata account including the Collection field,
      // which is beyond the basic fields we currently parse).
      // TODO: Extend parser to include Collection field for accurate filtering.
      const assets = await buildAssetsFromMetadata(entries);
      return paginate(assets, input.page, input.limit);
    },

    async getAssetsByOwner(
      input: GetAssetsByOwnerRpcInput
    ): Promise<DasApiAssetList> {
      // Find all token accounts owned by this address.
      const tokenAccounts = await rpc.getProgramAccounts(
        SPL_TOKEN_PROGRAM_ID,
        {
          filters: [
            { dataSize: 165 },
            { memcmp: { offset: 32, bytes: publicKeyBytes(input.owner) } },
          ],
        }
      );

      // Parse token accounts and get mints with amount > 0.
      const mints: PublicKey[] = [];
      for (const account of tokenAccounts) {
        const parsed = parseTokenAccount(account.data);
        if (parsed.amount > 0n) {
          mints.push(parsed.mint);
        }
      }

      // Fetch asset data for each mint.
      const assets = (
        await Promise.all(mints.map(fetchAsset))
      ).filter((a): a is DasApiAsset => a !== null);

      return paginate(assets, input.page, input.limit);
    },

    async searchAssets(
      input: SearchAssetsRpcInput
    ): Promise<DasApiAssetList> {
      // Start from all metadata accounts.
      let entries = await fetchAllMetadataAccounts();
      let assets = await buildAssetsFromMetadata(entries);

      // Apply filters.
      if (input.owner) {
        const ownerKey = input.owner;
        assets = assets.filter((a) =>
          samePublicKey(a.ownership.owner, ownerKey)
        );
      }

      if (input.authority) {
        const authKey = input.authority;
        assets = assets.filter((a) =>
          a.authorities.some((auth) => samePublicKey(auth.address, authKey))
        );
      }

      if (input.creator) {
        const creatorKey = input.creator;
        assets = assets.filter((a) =>
          a.creators.some((c) => {
            const addressMatch = samePublicKey(c.address, creatorKey);
            if (input.creatorVerified !== undefined && input.creatorVerified !== null) {
              return addressMatch && c.verified === input.creatorVerified;
            }
            return addressMatch;
          })
        );
      }

      if (input.compressed !== undefined && input.compressed !== null) {
        assets = assets.filter(
          (a) => a.compression.compressed === input.compressed
        );
      }

      if (input.burnt !== undefined && input.burnt !== null) {
        assets = assets.filter((a) => a.burnt === input.burnt);
      }

      if (input.frozen !== undefined && input.frozen !== null) {
        assets = assets.filter(
          (a) => a.ownership.frozen === input.frozen
        );
      }

      if (input.name) {
        const searchName = input.name.toLowerCase();
        assets = assets.filter((a) =>
          a.content.metadata.name.toLowerCase().includes(searchName)
        );
      }

      return paginate(assets, input.page, input.limit);
    },

    async getAssetSignatures(
      _input: GetAssetSignaturesRpcInput
    ): Promise<GetAssetSignaturesRpcResponse> {
      throw new DasApiError(
        'getAssetSignatures is not supported by the lite indexer'
      );
    },
  };
}
