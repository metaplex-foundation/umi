/* eslint-disable @typescript-eslint/no-explicit-any */
import { PublicKey, TransactionInstruction } from '@solana/web3.js';

/**
 * QuasarSVM's account info representation.
 * Note: lamports is bigint (unlike web3.js v1's number).
 */
export interface QuasarAccountInfo {
  owner: PublicKey;
  lamports: bigint;
  data: Buffer;
  executable: boolean;
}

export interface QuasarKeyedAccount {
  accountId: PublicKey;
  accountInfo: QuasarAccountInfo;
}

export interface QuasarExecutionResult {
  status: number;
  computeUnits: bigint;
  executionTimeUs: bigint;
  returnData: Uint8Array;
  accounts: QuasarKeyedAccount[];
  logs: string[];
  errorMessage: string | null;
}

export interface QuasarClock {
  slot: bigint;
  epochStartTimestamp: bigint;
  epoch: bigint;
  leaderScheduleEpoch: bigint;
  unixTimestamp: bigint;
}

export interface QuasarEpochSchedule {
  slotsPerEpoch: bigint;
  leaderScheduleSlotOffset: bigint;
  warmup: boolean;
  firstNormalEpoch: bigint;
  firstNormalSlot: bigint;
}

export interface QuasarSvmInstance {
  free(): void;
  addProgram(
    programId: PublicKey,
    elf: Uint8Array,
    loaderVersion?: number
  ): any;
  addTokenProgram(): any;
  addToken2022Program(): any;
  addAssociatedTokenProgram(): any;
  addSystemProgram(): any;
  setClock(opts: QuasarClock): void;
  warpToSlot(slot: bigint): void;
  setRent(lamportsPerByte: bigint): void;
  setEpochSchedule(opts: QuasarEpochSchedule): void;
  setComputeBudget(maxUnits: bigint): void;
  processInstruction(
    instructions: TransactionInstruction | TransactionInstruction[],
    accounts: QuasarKeyedAccount[]
  ): QuasarExecutionResult;
  processTransaction(
    instructions: TransactionInstruction[],
    accounts: QuasarKeyedAccount[]
  ): QuasarExecutionResult;
}
