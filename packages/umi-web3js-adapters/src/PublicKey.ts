import { PublicKey } from '@metaplex-foundation/umi';
import { PublicKey as Web3JsPublicKey } from '@solana/web3.js';

export function fromWeb3JsPublicKey(publicKey: Web3JsPublicKey): PublicKey {
  return publicKey.toBase58() as PublicKey;
}
export function fromWeb3JsPublicKeys(publicKeys: Web3JsPublicKey[]) {
  return publicKeys.map(fromWeb3JsPublicKey);
}

export function toWeb3JsPublicKey(publicKey: PublicKey): Web3JsPublicKey {
  return new Web3JsPublicKey(publicKey);
}
export function toWeb3JsPublicKeys(publicKeys: PublicKey[]) {
  return publicKeys.map(toWeb3JsPublicKey);
}
