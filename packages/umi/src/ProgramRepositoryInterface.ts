import type { ClusterFilter } from './Cluster';
import { InterfaceImplementationMissingError, ProgramError } from './errors';
import type { ErrorWithLogs, Program } from './Program';
import { PublicKey } from './PublicKey';
import { Transaction } from './Transaction';

export interface ProgramRepositoryInterface {
  /**
   * Whether a given program is registered in the repository.
   *
   * @param identifier The name or public key of the program to check.
   * @param clusterFilter The cluster filter to apply. Defaults to `"current"`.
   */
  has(identifier: string | PublicKey, clusterFilter?: ClusterFilter): boolean;

  /**
   * Gets a program from the repository.
   * Throws an error if the program is not found.
   *
   * @param identifier The name or public key of the program to retrieve.
   * @param clusterFilter The cluster filter to apply. Defaults to `"current"`.
   * @typeParam T - The type of the program to retrieve. Defaults to `Program`.
   */
  get<T extends Program = Program>(
    identifier: string | PublicKey,
    clusterFilter?: ClusterFilter
  ): T;

  /**
   * Gets all programs from the repository matching the given cluster filter.
   * Defaults to getting all programs from the current cluster.
   *
   * @param clusterFilter The cluster filter to apply. Defaults to `"current"`.
   */
  all(clusterFilter?: ClusterFilter): Program[];

  /**
   * Registers a new program in the repository.
   *
   * @param program The program to register.
   * @param overrides Whether to override an existing program with the
   * same name or public key. Defaults to `true`.
   */
  add(program: Program, overrides?: boolean): void;

  /**
   * Resolves a custom program error from a transaction error.
   *
   * @param error The raw error to resolve containing the program logs.
   * @param transaction The transaction that caused the error.
   * @returns The resolved program error, or `null` if the error cannot be resolved.
   */
  resolveError(
    error: ErrorWithLogs,
    transaction: Transaction
  ): ProgramError | null;
}

export class NullProgramRepository implements ProgramRepositoryInterface {
  private readonly error = new InterfaceImplementationMissingError(
    'ProgramRepositoryInterface',
    'programs'
  );

  has(): boolean {
    throw this.error;
  }

  get<T extends Program = Program>(): T {
    throw this.error;
  }

  all(): Program[] {
    throw this.error;
  }

  add(): void {
    throw this.error;
  }

  resolveError(): ProgramError | null {
    throw this.error;
  }
}
