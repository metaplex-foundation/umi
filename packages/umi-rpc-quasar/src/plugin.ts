import { UmiPlugin } from '@metaplex-foundation/umi';
import { PublicKey } from '@solana/web3.js';
import type { QuasarSvmInstance } from './quasar-svm';
import {
  createQuasarSvmRpc,
  QuasarSvmRpcOptions,
} from './createQuasarSvmRpc';

/**
 * Options for configuring the QuasarSVM RPC plugin.
 */
export type QuasarSvmPluginOptions = QuasarSvmRpcOptions & {
  /** Custom program ELFs to load into the SVM. */
  programs?: Array<{
    programId: string;
    elf: Uint8Array;
    loaderVersion?: number;
  }>;
  /** Whether to include the SPL Token program. Defaults to true. */
  token?: boolean;
  /** Whether to include the SPL Token-2022 program. Defaults to false. */
  token2022?: boolean;
  /** Whether to include the SPL Associated Token program. Defaults to true. */
  associatedToken?: boolean;
};

/**
 * Creates a Umi plugin that installs the QuasarSVM-based RPC.
 * This is a direct drop-in replacement for `web3JsRpc()` in test environments.
 *
 * @example
 * ```ts
 * import { createBaseUmi } from '@metaplex-foundation/umi';
 * import { quasarSvmRpc } from '@metaplex-foundation/umi-rpc-quasar';
 *
 * const umi = createBaseUmi()
 *   .use(quasarSvmRpc());
 * ```
 */
export function quasarSvmRpc(
  options: QuasarSvmPluginOptions = {}
): UmiPlugin {
  return {
    install(umi) {
      // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
      const { QuasarSvm } = require('@blueshift-gg/quasar-svm/web3.js');
      const svmInstance: QuasarSvmInstance = new QuasarSvm();

      // Load default SPL programs unless disabled
      if (options.token !== false) {
        svmInstance.addTokenProgram();
      }
      if (options.associatedToken !== false) {
        svmInstance.addAssociatedTokenProgram();
      }
      if (options.token2022 === true) {
        svmInstance.addToken2022Program();
      }

      // Load custom programs
      if (options.programs) {
        for (const program of options.programs) {
          svmInstance.addProgram(
            new PublicKey(program.programId),
            program.elf,
            program.loaderVersion
          );
        }
      }

      umi.rpc = createQuasarSvmRpc(umi, svmInstance, options);
    },
  };
}

/**
 * Creates a Umi plugin using an existing QuasarSvm instance.
 * Useful when you need direct access to the SVM for advanced configuration.
 *
 * @example
 * ```ts
 * import { QuasarSvm } from '@blueshift-gg/quasar-svm/web3.js';
 * import { quasarSvmRpcFromInstance } from '@metaplex-foundation/umi-rpc-quasar';
 *
 * const svm = new QuasarSvm();
 * svm.addTokenProgram();
 * svm.setComputeBudget(400_000n);
 *
 * const umi = createBaseUmi()
 *   .use(quasarSvmRpcFromInstance(svm));
 * ```
 */
export function quasarSvmRpcFromInstance(
  svmInstance: QuasarSvmInstance,
  options: QuasarSvmRpcOptions = {}
): UmiPlugin {
  return {
    install(umi) {
      umi.rpc = createQuasarSvmRpc(umi, svmInstance, options);
    },
  };
}
