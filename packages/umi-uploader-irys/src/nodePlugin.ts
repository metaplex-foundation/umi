import { Uploader } from '@irys/upload';
import Solana from '@irys/upload-solana';
import BaseNodeIrys from '@irys/upload/dist/types/base';
import { isKeypairSigner } from '@metaplex-foundation/umi';

import type { Context, Signer, UmiPlugin } from '@metaplex-foundation/umi';
import {
  IrysUploaderOptions,
  createBaseIrysUploader as CIU,
  IrysUploader,
} from './createIrysUploader';
import { FailedToInitializeIrysError } from './errors';

export const irysUploader = (options?: IrysUploaderOptions): UmiPlugin => ({
  install(umi) {
    umi.uploader = createIrysUploader(umi, options);
  },
});

export function createIrysUploader(
  context: Pick<Context, 'rpc' | 'payer' | 'eddsa'>,
  uploaderOptions: IrysUploaderOptions = {}
): IrysUploader {
  return CIU(initNodeIrys, context, uploaderOptions);
}

export const initNodeIrys = async (
  address: string,
  payer: Signer,
  options: any
): Promise<BaseNodeIrys> => {
  if (isKeypairSigner(payer)) {
    return Uploader(Solana)
      .bundlerUrl(address)
      .withWallet(payer.secretKey)
      .withIrysConfig(options)
      .build();
  }
  throw new FailedToInitializeIrysError(
    new Error(
      'Expected signer to be a keypair (try importing @metaplex-foundation/umi-uploader-irys/web to use a browser/external wallet?)'
    )
  );
};
