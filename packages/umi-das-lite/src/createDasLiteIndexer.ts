import type { PublicKey, RpcInterface } from '@metaplex-foundation/umi';
import type {
  DasApiAsset,
  DasApiAssetList,
  DasApiInterface,
  GetAssetProofRpcResponse,
  GetAssetProofsRpcResponse,
  GetAssetRpcInput,
  GetAssetsRpcInput,
  GetAssetsByAuthorityRpcInput,
  GetAssetsByCreatorRpcInput,
  GetAssetsByGroupRpcInput,
  GetAssetsByOwnerRpcInput,
  GetAssetSignaturesRpcInput,
  GetAssetSignaturesRpcResponse,
  SearchAssetsRpcInput,
} from '@metaplex-foundation/digital-asset-standard-api';
import { DasApiError } from '@metaplex-foundation/digital-asset-standard-api';

/**
 * Creates a DAS lite indexer that wraps an RPC interface and provides
 * DAS API-compatible methods. This implementation forwards DAS RPC calls
 * directly to the underlying RPC endpoint using `rpc.call()`.
 *
 * Useful for local testing with DAS-compliant RPC providers without
 * needing the full `@metaplex-foundation/digital-asset-standard-api` plugin.
 *
 * @param rpc The RPC interface to wrap.
 * @returns An RPC interface decorated with DAS API methods.
 */
export const createDasLiteIndexer = (
  rpc: RpcInterface
): RpcInterface & DasApiInterface => {
  const validatePagination = (
    page: number | null | undefined,
    before?: string | null,
    after?: string | null
  ) => {
    if (typeof page === 'number' && (before || after)) {
      throw new DasApiError(
        'Pagination Error. Please use either page or before/after, but not both.'
      );
    }
  };

  return {
    ...rpc,

    getAsset: async (input: GetAssetRpcInput | PublicKey) => {
      const assetId =
        typeof input === 'object' && 'assetId' in input ? input.assetId : input;
      const displayOptions =
        typeof input === 'object' && 'displayOptions' in input
          ? input.displayOptions
          : undefined;

      const asset = await rpc.call<DasApiAsset | null, Record<string, any>>(
        'getAsset',
        cleanInput({ id: assetId, options: displayOptions })
      );
      if (!asset) throw new DasApiError(`Asset not found: ${assetId}`);
      return asset;
    },

    getAssets: async (input: GetAssetsRpcInput | PublicKey[]) => {
      const assetIds = Array.isArray(input) ? input : input.assetIds;
      const displayOptions = Array.isArray(input)
        ? undefined
        : input.displayOptions;

      const assets = await rpc.call<DasApiAsset[] | null, Record<string, any>>(
        'getAssets',
        cleanInput({ ids: assetIds, options: displayOptions })
      );
      if (!assets) throw new DasApiError(`No assets found: ${assetIds}`);
      return assets;
    },

    getAssetProof: async (assetId: PublicKey) => {
      const proof = await rpc.call<
        GetAssetProofRpcResponse | null,
        Record<string, any>
      >('getAssetProof', { id: assetId });
      if (!proof)
        throw new DasApiError(`No proof found for asset: ${assetId}`);
      return proof;
    },

    getAssetProofs: async (assetIds: PublicKey[]) => {
      const proofs = await rpc.call<
        GetAssetProofsRpcResponse | null,
        Record<string, any>
      >('getAssetProofs', { ids: assetIds });
      if (!proofs)
        throw new DasApiError(`No proofs found for assets: ${assetIds}`);
      return proofs;
    },

    getAssetsByAuthority: async (input: GetAssetsByAuthorityRpcInput) => {
      validatePagination(input.page, input.before, input.after);
      const params = cleanInput({
        authorityAddress: input.authority,
        sortBy: input.sortBy,
        limit: input.limit,
        page: input.page,
        before: input.before,
        after: input.after,
        displayOptions: input.displayOptions,
        cursor: input.cursor,
      });
      const assetList = await rpc.call<
        DasApiAssetList | null,
        typeof params
      >('getAssetsByAuthority', params);
      if (!assetList) {
        throw new DasApiError(
          `No assets found for authority: ${input.authority}`
        );
      }
      return assetList;
    },

    getAssetsByCreator: async (input: GetAssetsByCreatorRpcInput) => {
      validatePagination(input.page, input.before, input.after);
      const params = cleanInput({
        creatorAddress: input.creator,
        onlyVerified: input.onlyVerified,
        sortBy: input.sortBy,
        limit: input.limit,
        page: input.page,
        before: input.before,
        after: input.after,
        displayOptions: input.displayOptions,
        cursor: input.cursor,
      });
      const assetList = await rpc.call<
        DasApiAssetList | null,
        typeof params
      >('getAssetsByCreator', params);
      if (!assetList) {
        throw new DasApiError(`No assets found for creator: ${input.creator}`);
      }
      return assetList;
    },

    getAssetsByGroup: async (input: GetAssetsByGroupRpcInput) => {
      validatePagination(input.page, input.before, input.after);
      const params = cleanInput({
        groupKey: input.groupKey,
        groupValue: input.groupValue,
        sortBy: input.sortBy,
        limit: input.limit,
        page: input.page,
        before: input.before,
        after: input.after,
        displayOptions: input.displayOptions,
        cursor: input.cursor,
      });
      const assetList = await rpc.call<
        DasApiAssetList | null,
        typeof params
      >('getAssetsByGroup', params);
      if (!assetList) {
        throw new DasApiError(
          `No assets found for group: ${input.groupKey} => ${input.groupValue}`
        );
      }
      return assetList;
    },

    getAssetsByOwner: async (input: GetAssetsByOwnerRpcInput) => {
      validatePagination(input.page, input.before, input.after);
      const params = cleanInput({
        ownerAddress: input.owner,
        sortBy: input.sortBy,
        limit: input.limit,
        page: input.page,
        before: input.before,
        after: input.after,
        displayOptions: input.displayOptions,
        cursor: input.cursor,
      });
      const assetList = await rpc.call<
        DasApiAssetList | null,
        typeof params
      >('getAssetsByOwner', params);
      if (!assetList) {
        throw new DasApiError(`No assets found for owner: ${input.owner}`);
      }
      return assetList;
    },

    searchAssets: async (input: SearchAssetsRpcInput) => {
      validatePagination(input.page, input.before, input.after);
      const params = cleanInput({
        negate: input.negate,
        conditionType: input.conditionType,
        interface: input.interface,
        ownerAddress: input.owner,
        ownerType: input.ownerType,
        creatorAddress: input.creator,
        creatorVerified: input.creatorVerified,
        authorityAddress: input.authority,
        grouping: input.grouping,
        delegateAddress: input.delegate,
        frozen: input.frozen,
        supply: input.supply,
        supplyMint: input.supplyMint,
        compressed: input.compressed,
        compressible: input.compressible,
        royaltyTargetType: input.royaltyModel,
        royaltyTarget: input.royaltyTarget,
        royaltyAmount: input.royaltyAmount,
        burnt: input.burnt,
        sortBy: input.sortBy,
        limit: input.limit,
        page: input.page,
        before: input.before,
        after: input.after,
        jsonUri: input.jsonUri,
        cursor: input.cursor,
        name: input.name,
        displayOptions: input.displayOptions,
        tokenType: input.tokenType,
      });
      const assetList = await rpc.call<
        DasApiAssetList | null,
        typeof params
      >('searchAssets', params);
      if (!assetList) {
        throw new DasApiError('No assets found for the given search criteria');
      }
      return assetList;
    },

    getAssetSignatures: async (input: GetAssetSignaturesRpcInput) => {
      validatePagination(input.page, input.before, input.after);
      const params = cleanInput({
        id: 'assetId' in input ? input.assetId : undefined,
        tree: 'tree' in input ? input.tree : undefined,
        leafIndex: 'leaf_index' in input ? input.leaf_index : undefined,
        limit: input.limit,
        page: input.page,
        before: input.before,
        after: input.after,
        cursor: input.cursor,
        sortDirection: input.sort_direction,
      });
      const signatures = await rpc.call<
        GetAssetSignaturesRpcResponse | null,
        typeof params
      >('getAssetSignatures', params);
      if (!signatures) {
        const identifier =
          'assetId' in input
            ? `asset: ${input.assetId}`
            : `tree: ${input.tree}, leaf_index: ${input.leaf_index}`;
        throw new DasApiError(`No signatures found for ${identifier}`);
      }
      return signatures;
    },
  };
};

function cleanInput<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([_, value]) =>
        value !== null &&
        value !== undefined &&
        (typeof value !== 'object' || (value && Object.keys(value).length > 0))
    )
  ) as Partial<T>;
}
