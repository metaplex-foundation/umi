import { publicKey } from '@metaplex-foundation/umi';
import { DasApiError } from '@metaplex-foundation/digital-asset-standard-api';
import test from 'ava';
import { createDasLiteIndexer } from '../src';
import { TOKEN_METADATA_PROGRAM_ID, SPL_TOKEN_PROGRAM_ID } from '../src/parsers';
import {
  MINT_A,
  OWNER_A,
  AUTHORITY_A,
  CREATOR_A,
  buildMetadataAccountData,
  buildMintAccountData,
  buildTokenAccountData,
  createMockContext,
  metadataPdaKey,
} from './_setup';

// A deterministic "metadata PDA" address for MINT_A.
const METADATA_PDA_A = publicKey(
  'DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ'
);

function setupSingleAsset() {
  const metadataData = buildMetadataAccountData({
    updateAuthority: AUTHORITY_A,
    mint: MINT_A,
    name: 'Test NFT',
    symbol: 'TNFT',
    uri: 'https://example.com/metadata.json',
    sellerFeeBasisPoints: 500,
    creators: [{ address: CREATOR_A, verified: true, share: 100 }],
    primarySaleHappened: true,
    isMutable: true,
  });

  const mintData = buildMintAccountData({
    mintAuthority: AUTHORITY_A,
    supply: 1n,
    decimals: 0,
    isInitialized: true,
    freezeAuthority: null,
  });

  const tokenData = buildTokenAccountData({
    mint: MINT_A,
    owner: OWNER_A,
    amount: 1n,
  });

  const tokenAccountPk = publicKey(
    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'
  );

  const accounts = new Map<string, { data: Uint8Array; owner: string }>();
  accounts.set(METADATA_PDA_A, {
    data: metadataData,
    owner: TOKEN_METADATA_PROGRAM_ID,
  });
  accounts.set(MINT_A, {
    data: mintData,
    owner: SPL_TOKEN_PROGRAM_ID,
  });

  const programAccounts = new Map();
  programAccounts.set(SPL_TOKEN_PROGRAM_ID, [
    {
      publicKey: tokenAccountPk,
      data: tokenData,
      owner: SPL_TOKEN_PROGRAM_ID,
    },
  ]);
  programAccounts.set(TOKEN_METADATA_PROGRAM_ID, [
    {
      publicKey: METADATA_PDA_A,
      data: metadataData,
      owner: TOKEN_METADATA_PROGRAM_ID,
    },
  ]);

  const pdaMap = new Map<string, string>();
  pdaMap.set(metadataPdaKey(MINT_A), METADATA_PDA_A);

  return createMockContext({
    accounts: accounts as any,
    programAccounts: programAccounts as any,
    pdaMap: pdaMap as any,
  });
}

// --- getAsset ---

test('getAsset returns a DasApiAsset built from on-chain data', async (t) => {
  const ctx = setupSingleAsset();
  const indexer = createDasLiteIndexer(ctx);

  const asset = await indexer.getAsset(MINT_A);

  t.is(asset.id, MINT_A);
  t.is(asset.interface, 'V1_NFT');
  t.is(asset.content.metadata.name, 'Test NFT');
  t.is(asset.content.metadata.symbol, 'TNFT');
  t.is(asset.content.json_uri, 'https://example.com/metadata.json');
  t.is(asset.content.metadata.token_standard, 'NonFungible');
  t.is(asset.royalty.basis_points, 500);
  t.is(asset.royalty.percent, 0.05);
  t.true(asset.royalty.primary_sale_happened);
  t.true(asset.mutable);
  t.is(asset.creators.length, 1);
  t.is(asset.creators[0].address, CREATOR_A);
  t.true(asset.creators[0].verified);
  t.is(asset.creators[0].share, 100);
  t.is(asset.ownership.owner, OWNER_A);
  t.false(asset.compression.compressed);
});

test('getAsset accepts GetAssetRpcInput object', async (t) => {
  const ctx = setupSingleAsset();
  const indexer = createDasLiteIndexer(ctx);

  const asset = await indexer.getAsset({ assetId: MINT_A });
  t.is(asset.id, MINT_A);
});

test('getAsset throws DasApiError for nonexistent asset', async (t) => {
  const ctx = createMockContext({});
  const indexer = createDasLiteIndexer(ctx);

  const error = await t.throwsAsync(() =>
    indexer.getAsset(publicKey('11111111111111111111111111111111'))
  );
  t.true(error instanceof DasApiError);
});

// --- getAssets ---

test('getAssets returns array of found assets', async (t) => {
  const ctx = setupSingleAsset();
  const indexer = createDasLiteIndexer(ctx);

  const assets = await indexer.getAssets([MINT_A]);
  t.is(assets.length, 1);
  t.is(assets[0].id, MINT_A);
});

test('getAssets skips nonexistent mints', async (t) => {
  const ctx = setupSingleAsset();
  const indexer = createDasLiteIndexer(ctx);

  const missing = publicKey('11111111111111111111111111111111');
  const assets = await indexer.getAssets([MINT_A, missing]);
  t.is(assets.length, 1);
});

// --- getAssetsByOwner ---

test('getAssetsByOwner finds assets via token accounts', async (t) => {
  const ctx = setupSingleAsset();
  const indexer = createDasLiteIndexer(ctx);

  const result = await indexer.getAssetsByOwner({
    owner: OWNER_A,
    page: 1,
  });
  t.is(result.total, 1);
  t.is(result.items[0].id, MINT_A);
  t.is(result.items[0].ownership.owner, OWNER_A);
});

test('getAssetsByOwner returns empty for unknown owner', async (t) => {
  const ctx = setupSingleAsset();
  const indexer = createDasLiteIndexer(ctx);

  const result = await indexer.getAssetsByOwner({
    owner: publicKey('11111111111111111111111111111111'),
    page: 1,
  });
  t.is(result.total, 0);
  t.is(result.items.length, 0);
});

// --- getAssetsByAuthority ---

test('getAssetsByAuthority filters by update authority', async (t) => {
  const ctx = setupSingleAsset();
  const indexer = createDasLiteIndexer(ctx);

  const result = await indexer.getAssetsByAuthority({
    authority: AUTHORITY_A,
    page: 1,
  });
  t.is(result.total, 1);
  t.is(result.items[0].authorities[0].address, AUTHORITY_A);
});

// --- getAssetsByCreator ---

test('getAssetsByCreator filters by creator address', async (t) => {
  const ctx = setupSingleAsset();
  const indexer = createDasLiteIndexer(ctx);

  const result = await indexer.getAssetsByCreator({
    creator: CREATOR_A,
    onlyVerified: true,
    page: 1,
  });
  t.is(result.total, 1);
  t.is(result.items[0].creators[0].address, CREATOR_A);
});

test('getAssetsByCreator with onlyVerified filters unverified', async (t) => {
  const metadataData = buildMetadataAccountData({
    updateAuthority: AUTHORITY_A,
    mint: MINT_A,
    name: 'Unverified NFT',
    symbol: 'UNFT',
    uri: 'https://example.com/u.json',
    sellerFeeBasisPoints: 0,
    creators: [{ address: CREATOR_A, verified: false, share: 100 }],
    primarySaleHappened: false,
    isMutable: true,
  });

  const mintData = buildMintAccountData({
    mintAuthority: AUTHORITY_A,
    supply: 1n,
    decimals: 0,
    isInitialized: true,
    freezeAuthority: null,
  });

  const accounts = new Map<string, { data: Uint8Array; owner: string }>();
  accounts.set(MINT_A, { data: mintData, owner: SPL_TOKEN_PROGRAM_ID });

  const programAccounts = new Map();
  programAccounts.set(TOKEN_METADATA_PROGRAM_ID, [
    {
      publicKey: METADATA_PDA_A,
      data: metadataData,
      owner: TOKEN_METADATA_PROGRAM_ID,
    },
  ]);
  programAccounts.set(SPL_TOKEN_PROGRAM_ID, []);

  const ctx = createMockContext({
    accounts: accounts as any,
    programAccounts: programAccounts as any,
  });
  const indexer = createDasLiteIndexer(ctx);

  const result = await indexer.getAssetsByCreator({
    creator: CREATOR_A,
    onlyVerified: true,
    page: 1,
  });
  t.is(result.total, 0);
});

// --- searchAssets ---

test('searchAssets filters by name', async (t) => {
  const ctx = setupSingleAsset();
  const indexer = createDasLiteIndexer(ctx);

  const result = await indexer.searchAssets({
    name: 'Test',
    page: 1,
  });
  t.is(result.total, 1);
  t.is(result.items[0].content.metadata.name, 'Test NFT');
});

test('searchAssets filters by compressed=false', async (t) => {
  const ctx = setupSingleAsset();
  const indexer = createDasLiteIndexer(ctx);

  const result = await indexer.searchAssets({
    compressed: false,
    page: 1,
  });
  t.is(result.total, 1);
});

test('searchAssets filters out with compressed=true', async (t) => {
  const ctx = setupSingleAsset();
  const indexer = createDasLiteIndexer(ctx);

  const result = await indexer.searchAssets({
    compressed: true,
    page: 1,
  });
  t.is(result.total, 0);
});

// --- Unsupported methods ---

test('getAssetProof throws for lite indexer', async (t) => {
  const ctx = createMockContext({});
  const indexer = createDasLiteIndexer(ctx);

  const error = await t.throwsAsync(() =>
    indexer.getAssetProof(MINT_A)
  );
  t.true(error instanceof DasApiError);
  t.true(error!.message.includes('not supported'));
});

test('getAssetSignatures throws for lite indexer', async (t) => {
  const ctx = createMockContext({});
  const indexer = createDasLiteIndexer(ctx);

  const error = await t.throwsAsync(() =>
    indexer.getAssetSignatures({ assetId: MINT_A })
  );
  t.true(error instanceof DasApiError);
});

// --- Pagination ---

test('paginate respects page and limit', async (t) => {
  const ctx = setupSingleAsset();
  const indexer = createDasLiteIndexer(ctx);

  const result = await indexer.getAssetsByOwner({
    owner: OWNER_A,
    page: 1,
    limit: 10,
  });
  t.is(result.limit, 10);
  t.is(result.total, 1);
  t.is(result.items.length, 1);
});

// --- RPC passthrough ---

test('preserves underlying RPC methods', async (t) => {
  const ctx = setupSingleAsset();
  const indexer = createDasLiteIndexer(ctx);

  t.is(indexer.getEndpoint(), 'http://localhost:8899');
  t.is(indexer.getCluster(), 'custom');
});
