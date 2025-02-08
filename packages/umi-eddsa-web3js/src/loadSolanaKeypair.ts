/**
 * Copyright (c) 2022 Socean Finance
 * Based on https://github.com/igneous-labs/solana-cli-config
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 *
 */
import { Keypair } from '@solana/web3.js';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { parse } from 'yaml';

const DEFAULT_PATH = `${homedir()}/.config/solana/cli/config.yml`;

export function loadSolanaKeypair(path: string = DEFAULT_PATH): Keypair {
  const { keypair_path: keypairPath } = parse(readFileSync(path, 'utf-8')) as {
    keypair_path: string;
  };

  return Keypair.fromSecretKey(
    Buffer.from(JSON.parse(readFileSync(keypairPath, 'utf-8')) as number[])
  );
}
