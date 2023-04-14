import {
  Cluster,
  ClusterFilter,
  Context,
  ErrorWithLogs,
  Program,
  ProgramError,
  ProgramRepositoryInterface,
  publicKey,
  PublicKey,
  PublicKeyInput,
  samePublicKey,
  Transaction,
} from '@metaplex-foundation/umi';
import {
  ProgramErrorNotRecognizedError,
  ProgramNotRecognizedError,
} from './errors';

export function createDefaultProgramRepository(
  context: Pick<Context, 'rpc'>
): ProgramRepositoryInterface {
  const programs: Program[] = [];

  const has = (
    identifier: string | PublicKey,
    clusterFilter: ClusterFilter = 'current'
  ): boolean => {
    const programs = all(clusterFilter);
    return typeof identifier === 'string'
      ? programs.some((p) => p.name === identifier)
      : programs.some((p) => samePublicKey(p.publicKey, identifier));
  };

  const get = <T extends Program = Program>(
    identifier: string | PublicKey,
    clusterFilter: ClusterFilter = 'current'
  ): T => {
    const cluster = parseClusterFilter(clusterFilter);
    const programs = all(clusterFilter);
    const program =
      typeof identifier === 'string'
        ? programs.find((p) => p.name === identifier)
        : programs.find((p) => samePublicKey(p.publicKey, identifier));

    if (!program) {
      throw new ProgramNotRecognizedError(identifier, cluster);
    }

    return program as T;
  };

  const getPublicKey = (
    identifier: string | PublicKey,
    fallback?: PublicKeyInput,
    clusterFilter?: ClusterFilter
  ): PublicKey => {
    try {
      return get(identifier, clusterFilter).publicKey;
    } catch (error) {
      if (fallback === undefined) throw error;
      return publicKey(fallback);
    }
  };

  const all = (clusterFilter: ClusterFilter = 'current'): Program[] => {
    const cluster = parseClusterFilter(clusterFilter);
    return cluster === '*'
      ? programs
      : programs.filter((program) => program.isOnCluster(cluster));
  };

  const add = (program: Program, overrides = true): void => {
    if (overrides) {
      programs.unshift(program);
    } else {
      programs.push(program);
    }
  };

  const resolveError = (
    error: ErrorWithLogs,
    transaction: Transaction
  ): ProgramError | null => {
    // Ensure the error as logs.
    if (!Array.isArray(error.logs) || error.logs.length === 0) return null;
    const logs = error.logs.join('\n');

    // Parse the instruction number.
    const instructionRegex = /Error processing Instruction (\d+):/;
    const instruction = error.message.match(instructionRegex)?.[1] ?? null;

    // Parse the error code.
    const errorCodeRegex = /Custom program error: (0x[a-f0-9]+)/i;
    const errorCodeString = logs.match(errorCodeRegex)?.[1] ?? null;
    const errorCode = errorCodeString ? parseInt(errorCodeString, 16) : null;

    // Ensure we could find an instruction number and an error code.
    if (instruction === null || errorCode === null) return null;

    // Get the program ID from the instruction in the transaction.
    const instructionNumber: number = parseInt(instruction, 10);
    const programIndex: number | null =
      transaction.message.instructions?.[instructionNumber]?.programIndex ??
      null;
    const programId = programIndex
      ? transaction.message.accounts[programIndex]
      : null;

    // Ensure we were able to find a program ID for the instruction.
    if (!programId) return null;

    // Find a registered program if any.
    let program: Program;
    try {
      program = get(programId);
    } catch (_programNotFoundError) {
      return null;
    }

    // Finally, resolve the error.
    const resolvedError = program.getErrorFromCode(errorCode, error);
    return resolvedError ?? new ProgramErrorNotRecognizedError(program, error);
  };

  const parseClusterFilter = (clusterFilter: ClusterFilter): Cluster | '*' =>
    clusterFilter === 'current' ? context.rpc.getCluster() : clusterFilter;

  return {
    has,
    get,
    getPublicKey,
    all,
    add,
    resolveError,
  };
}
