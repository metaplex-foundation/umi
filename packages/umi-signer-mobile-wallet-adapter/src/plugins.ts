import {
  MobileSigner,
  signerIdentity,
  signerPayer,
  UmiPlugin,
} from '@metaplex-foundation/umi';

export const mobileWalletAdapterIdentity = (
  mobileWallet: MobileSigner,
  setPayer = true
): UmiPlugin => ({
  install(umi) {
    umi.use(signerIdentity(mobileWallet, setPayer));
  },
});

export const mobileWalletAdapterPayer = (
  mobileWallet: MobileSigner,
): UmiPlugin => ({
  install(umi) {
    
    umi.use(signerPayer(mobileWallet));
  },
});
