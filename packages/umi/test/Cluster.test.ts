import test, { Assertions } from 'ava';
import { Cluster, resolveClusterFromEndpoint } from '../src';

const isCluster = (t: Assertions, endpoint: string, expected: Cluster) => {
  t.is(resolveClusterFromEndpoint(endpoint), expected);
};

test('it can be resolved the cluster of mainnet endpoints', async (t) => {
  isCluster(t, 'https://api.mainnet-beta.solana.com', 'mainnet-beta');
  isCluster(t, 'https://api.mainnet-beta.solana.com/', 'mainnet-beta');
  isCluster(t, 'https://api.mainnet-beta.solana.com?foo=bar', 'mainnet-beta');
  isCluster(t, 'http://api.mainnet-beta.solana.com', 'mainnet-beta');
  isCluster(t, 'http://api.mainnet-beta.solana.com/', 'mainnet-beta');
  isCluster(t, 'https://ssc-dao.genesysgo.net', 'mainnet-beta');
  isCluster(t, 'http://mainnet.solana.com/', 'mainnet-beta');
  isCluster(t, 'http://my-own-mainnet-rpc.fr/', 'mainnet-beta');
});

test('it can be resolved the cluster of devnet endpoints', async (t) => {
  isCluster(t, 'https://api.devnet.solana.com', 'devnet');
  isCluster(t, 'https://api.devnet.solana.com/', 'devnet');
  isCluster(t, 'https://api.devnet.solana.com?foo=bar', 'devnet');
  isCluster(t, 'http://api.devnet.solana.com', 'devnet');
  isCluster(t, 'http://api.devnet.solana.com/', 'devnet');
  isCluster(t, 'https://psytrbhymqlkfrhudd.dev.genesysgo.net:8899', 'devnet');
  isCluster(t, 'http://devnet.solana.com/', 'devnet');
  isCluster(t, 'http://my-own-devnet-rpc.fr/', 'devnet');
});

test('it can be resolved the cluster of testnet endpoints', async (t) => {
  isCluster(t, 'https://api.testnet.solana.com', 'testnet');
  isCluster(t, 'https://api.testnet.solana.com/', 'testnet');
  isCluster(t, 'https://api.testnet.solana.com?foo=bar', 'testnet');
  isCluster(t, 'http://api.testnet.solana.com', 'testnet');
  isCluster(t, 'http://api.testnet.solana.com/', 'testnet');
  isCluster(t, 'http://testnet.solana.com/', 'testnet');
  isCluster(t, 'http://my-own-testnet-rpc.fr/', 'testnet');
});

test('it can be resolved the cluster of localnet endpoints', async (t) => {
  isCluster(t, 'http://localhost', 'localnet');
  isCluster(t, 'http://localhost:8899', 'localnet');
  isCluster(t, 'https://localhost:8899', 'localnet');
  isCluster(t, 'https://localhost:8899/', 'localnet');
  isCluster(t, 'https://localhost:8899?foo=bar', 'localnet');
  isCluster(t, 'https://localhost:1234?foo=bar', 'localnet');
  isCluster(t, 'http://127.0.0.1', 'localnet');
  isCluster(t, 'http://127.0.0.1:8899', 'localnet');
  isCluster(t, 'https://127.0.0.1:8899', 'localnet');
  isCluster(t, 'https://127.0.0.1:8899/', 'localnet');
  isCluster(t, 'https://127.0.0.1:8899?foo=bar', 'localnet');
  isCluster(t, 'https://127.0.0.1:1234?foo=bar', 'localnet');
  isCluster(t, 'http://my-own-local-rpc.com/', 'localnet');
});

test('it can be resolved the cluster of custom endpoints', async (t) => {
  isCluster(t, 'https://123.45.67.89', 'custom');
  isCluster(t, 'http://example.com', 'custom');
  isCluster(t, 'https://example.com', 'custom');
  isCluster(t, 'http://my-own-unkown-rpc.com', 'custom');
  isCluster(t, 'http://my-own-custom-rpc.fr', 'custom');
});
