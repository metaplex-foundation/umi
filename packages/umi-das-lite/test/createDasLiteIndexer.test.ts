import { RpcInterface, createNullRpc } from '@metaplex-foundation/umi';
import { DasApiError } from '@metaplex-foundation/digital-asset-standard-api';
import test from 'ava';
import { createDasLiteIndexer } from '../src';

function createMockRpc(
  callFn: RpcInterface['call'] = (async () => null) as any
): RpcInterface {
  return {
    ...createNullRpc(),
    call: callFn,
  };
}

test('it throws DasApiError when getAsset returns null', async (t) => {
  const rpc = createDasLiteIndexer(createMockRpc());
  const error = await t.throwsAsync(() =>
    rpc.getAsset('11111111111111111111111111111111' as any)
  );
  t.true(error instanceof DasApiError);
});

test('it returns asset from getAsset when found', async (t) => {
  const mockAsset = { id: 'test', interface: 'V1_NFT' };
  const rpc = createDasLiteIndexer(
    createMockRpc(async () => mockAsset as any)
  );
  const result = await rpc.getAsset('test' as any);
  t.is(result.id, 'test' as any);
});

test('it accepts GetAssetRpcInput object for getAsset', async (t) => {
  const mockAsset = { id: 'test', interface: 'V1_NFT' };
  const rpc = createDasLiteIndexer(
    createMockRpc(async () => mockAsset as any)
  );
  const result = await rpc.getAsset({ assetId: 'test' as any });
  t.is(result.id, 'test' as any);
});

test('it throws DasApiError when getAssets returns null', async (t) => {
  const rpc = createDasLiteIndexer(createMockRpc());
  const error = await t.throwsAsync(() =>
    rpc.getAssets(['11111111111111111111111111111111' as any])
  );
  t.true(error instanceof DasApiError);
});

test('it throws DasApiError when getAssetProof returns null', async (t) => {
  const rpc = createDasLiteIndexer(createMockRpc());
  const error = await t.throwsAsync(() =>
    rpc.getAssetProof('11111111111111111111111111111111' as any)
  );
  t.true(error instanceof DasApiError);
});

test('it throws on mixed pagination for getAssetsByOwner', async (t) => {
  const rpc = createDasLiteIndexer(createMockRpc());
  const error = await t.throwsAsync(() =>
    rpc.getAssetsByOwner({
      owner: '11111111111111111111111111111111' as any,
      page: 1,
      before: 'abc',
    })
  );
  t.true(error instanceof DasApiError);
  t.true(error!.message.includes('Pagination Error'));
});

test('it throws on mixed pagination for searchAssets', async (t) => {
  const rpc = createDasLiteIndexer(createMockRpc());
  const error = await t.throwsAsync(() =>
    rpc.searchAssets({
      owner: '11111111111111111111111111111111' as any,
      page: 1,
      after: 'abc',
    })
  );
  t.true(error instanceof DasApiError);
  t.true(error!.message.includes('Pagination Error'));
});

test('it returns asset list from getAssetsByOwner', async (t) => {
  const mockList = { total: 1, limit: 10, items: [{ id: 'test' }] };
  const rpc = createDasLiteIndexer(
    createMockRpc(async () => mockList as any)
  );
  const result = await rpc.getAssetsByOwner({
    owner: 'test' as any,
    page: 1,
  });
  t.is(result.total, 1);
  t.is(result.items.length, 1);
});

test('it returns asset list from searchAssets', async (t) => {
  const mockList = { total: 2, limit: 10, items: [{ id: 'a' }, { id: 'b' }] };
  const rpc = createDasLiteIndexer(
    createMockRpc(async () => mockList as any)
  );
  const result = await rpc.searchAssets({
    owner: 'test' as any,
    page: 1,
  });
  t.is(result.total, 2);
  t.is(result.items.length, 2);
});

test('it returns asset list from getAssetsByCreator', async (t) => {
  const mockList = { total: 1, limit: 10, items: [{ id: 'test' }] };
  const rpc = createDasLiteIndexer(
    createMockRpc(async () => mockList as any)
  );
  const result = await rpc.getAssetsByCreator({
    creator: 'test' as any,
    onlyVerified: true,
    page: 1,
  });
  t.is(result.total, 1);
});

test('it returns asset list from getAssetsByGroup', async (t) => {
  const mockList = { total: 1, limit: 10, items: [{ id: 'test' }] };
  const rpc = createDasLiteIndexer(
    createMockRpc(async () => mockList as any)
  );
  const result = await rpc.getAssetsByGroup({
    groupKey: 'collection',
    groupValue: 'test-collection',
    page: 1,
  });
  t.is(result.total, 1);
});

test('it returns asset list from getAssetsByAuthority', async (t) => {
  const mockList = { total: 1, limit: 10, items: [{ id: 'test' }] };
  const rpc = createDasLiteIndexer(
    createMockRpc(async () => mockList as any)
  );
  const result = await rpc.getAssetsByAuthority({
    authority: 'test' as any,
    page: 1,
  });
  t.is(result.total, 1);
});

test('it returns signatures from getAssetSignatures with assetId', async (t) => {
  const mockSigs = {
    total: 1,
    limit: 10,
    before: '',
    after: '',
    items: [{ signature: 'sig1', instruction: 'transfer', slot: 100 }],
  };
  const rpc = createDasLiteIndexer(
    createMockRpc(async () => mockSigs as any)
  );
  const result = await rpc.getAssetSignatures({
    assetId: 'test' as any,
    page: 1,
  });
  t.is(result.total, 1);
  t.is(result.items[0].signature, 'sig1');
});

test('it preserves original rpc methods', async (t) => {
  const mockRpc = createMockRpc();
  const rpc = createDasLiteIndexer(mockRpc);
  t.is(typeof rpc.getEndpoint, 'function');
  t.is(typeof rpc.getCluster, 'function');
  t.is(typeof rpc.getAccount, 'function');
  t.is(typeof rpc.sendTransaction, 'function');
});
