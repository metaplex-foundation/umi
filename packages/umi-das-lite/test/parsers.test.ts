import test from 'ava';
import {
  parseMetadataAccount,
  parseMintAccount,
  parseTokenAccount,
} from '../src/parsers';
import {
  MINT_A,
  OWNER_A,
  AUTHORITY_A,
  CREATOR_A,
  buildMetadataAccountData,
  buildMintAccountData,
  buildTokenAccountData,
} from './_setup';

test('parseMetadataAccount parses name, symbol, uri, and creators', (t) => {
  const data = buildMetadataAccountData({
    updateAuthority: AUTHORITY_A,
    mint: MINT_A,
    name: 'Cool NFT',
    symbol: 'COOL',
    uri: 'https://example.com/cool.json',
    sellerFeeBasisPoints: 250,
    creators: [
      { address: CREATOR_A, verified: true, share: 80 },
      { address: OWNER_A, verified: false, share: 20 },
    ],
    primarySaleHappened: false,
    isMutable: true,
  });

  const result = parseMetadataAccount(data);

  t.is(result.key, 4);
  t.is(result.updateAuthority, AUTHORITY_A);
  t.is(result.mint, MINT_A);
  t.is(result.name, 'Cool NFT');
  t.is(result.symbol, 'COOL');
  t.is(result.uri, 'https://example.com/cool.json');
  t.is(result.sellerFeeBasisPoints, 250);
  t.not(result.creators, null);
  t.is(result.creators!.length, 2);
  t.is(result.creators![0].address, CREATOR_A);
  t.true(result.creators![0].verified);
  t.is(result.creators![0].share, 80);
  t.is(result.creators![1].address, OWNER_A);
  t.false(result.creators![1].verified);
  t.is(result.creators![1].share, 20);
  t.false(result.primarySaleHappened);
  t.true(result.isMutable);
});

test('parseMetadataAccount handles null creators', (t) => {
  const data = buildMetadataAccountData({
    updateAuthority: AUTHORITY_A,
    mint: MINT_A,
    name: 'No Creator',
    symbol: 'NC',
    uri: 'https://example.com/nc.json',
    sellerFeeBasisPoints: 0,
    creators: null,
    primarySaleHappened: true,
    isMutable: false,
  });

  const result = parseMetadataAccount(data);

  t.is(result.creators, null);
  t.true(result.primarySaleHappened);
  t.false(result.isMutable);
});

test('parseMintAccount parses supply and decimals', (t) => {
  const data = buildMintAccountData({
    mintAuthority: AUTHORITY_A,
    supply: 1n,
    decimals: 0,
    isInitialized: true,
    freezeAuthority: null,
  });

  const result = parseMintAccount(data);

  t.is(result.mintAuthority, AUTHORITY_A);
  t.is(result.supply, 1n);
  t.is(result.decimals, 0);
  t.true(result.isInitialized);
  t.is(result.freezeAuthority, null);
});

test('parseMintAccount handles fungible token with high supply', (t) => {
  const data = buildMintAccountData({
    mintAuthority: AUTHORITY_A,
    supply: 1000000000n,
    decimals: 9,
    isInitialized: true,
    freezeAuthority: AUTHORITY_A,
  });

  const result = parseMintAccount(data);

  t.is(result.supply, 1000000000n);
  t.is(result.decimals, 9);
  t.is(result.freezeAuthority, AUTHORITY_A);
});

test('parseTokenAccount parses mint, owner, and amount', (t) => {
  const data = buildTokenAccountData({
    mint: MINT_A,
    owner: OWNER_A,
    amount: 1n,
  });

  const result = parseTokenAccount(data);

  t.is(result.mint, MINT_A);
  t.is(result.owner, OWNER_A);
  t.is(result.amount, 1n);
});

test('parseTokenAccount handles zero amount', (t) => {
  const data = buildTokenAccountData({
    mint: MINT_A,
    owner: OWNER_A,
    amount: 0n,
  });

  const result = parseTokenAccount(data);

  t.is(result.amount, 0n);
});
