import {
  publicKey,
  TransactionInput,
  TransactionInputLegacy,
  TransactionInputV0,
  TransactionInputV1,
  TransactionVersion,
  TRANSACTION_CONFIG_MAX,
} from '../src';

const base = {
  payer: publicKey('11111111111111111111111111111111'),
  instructions: [],
  blockhash: '11111111111111111111111111111111',
};
const addressLookupTables = [{ publicKey: base.payer, addresses: [] }];

export const legacyInput: TransactionInputLegacy = {
  ...base,
  version: 'legacy',
};
export const v0Input: TransactionInputV0 = {
  ...base,
  version: 0,
  addressLookupTables,
};
export const implicitV0Input: TransactionInput = {
  ...base,
  addressLookupTables,
};
export const v1Input: TransactionInputV1 = {
  ...base,
  version: 1,
  transactionConfig: TRANSACTION_CONFIG_MAX,
};
export const v1InputWithFullConfig: TransactionInput = {
  ...base,
  version: 1,
  transactionConfig: {
    computeUnitLimit: 200_000,
    loadedAccountsDataSizeLimit: 32_768,
    heapSize: 32_768,
  },
};
export const widenedInput = (version: TransactionVersion): TransactionInput =>
  version === 1
    ? { ...base, version, transactionConfig: TRANSACTION_CONFIG_MAX }
    : { ...base, version };
export const lookupTablesStayReadableAfterNarrowingOutLegacy = (
  input: TransactionInput
) => (input.version === 'legacy' ? [] : input.addressLookupTables ?? []);

export const v1InputMissingLimits: TransactionInput = {
  ...base,
  version: 1,
  // @ts-expect-error V1 inputs must set both limits the runtime requires.
  transactionConfig: { computeUnitLimit: 200_000 },
};
// @ts-expect-error V1 inputs must set a transaction config.
export const v1InputWithoutConfig: TransactionInput = { ...base, version: 1 };
// The `never` guards make `transactionConfig` and `addressLookupTables`
// discriminants too, so TypeScript reports the conflicting literals as a
// whole rather than at the offending property.
// @ts-expect-error V1 transactions have no address lookup tables.
export const v1InputWithTables: TransactionInput = {
  ...base,
  version: 1,
  transactionConfig: TRANSACTION_CONFIG_MAX,
  addressLookupTables,
};
// @ts-expect-error V0 transactions have no transaction config.
export const v0InputWithConfig: TransactionInput = {
  ...base,
  version: 0,
  transactionConfig: TRANSACTION_CONFIG_MAX,
};
// @ts-expect-error Inputs without a version are V0 and have no config.
export const implicitV0InputWithConfig: TransactionInput = {
  ...base,
  transactionConfig: TRANSACTION_CONFIG_MAX,
};
// @ts-expect-error Legacy transactions have no transaction config.
export const legacyInputWithConfig: TransactionInput = {
  ...base,
  version: 'legacy',
  transactionConfig: TRANSACTION_CONFIG_MAX,
};
// @ts-expect-error Legacy transactions have no address lookup tables.
export const legacyInputWithTables: TransactionInput = {
  ...base,
  version: 'legacy',
  addressLookupTables,
};

export const asInput = (input: TransactionInput): TransactionInput => input;
const v1ValueMissingLimits = {
  ...base,
  version: 1 as const,
  transactionConfig: { computeUnitLimit: 200_000 },
};
// @ts-expect-error V1 inputs must set both limits the runtime requires.
asInput(v1ValueMissingLimits);
const v1ValueWithoutConfig = { ...base, version: 1 as const };
// @ts-expect-error V1 inputs must set a transaction config.
asInput(v1ValueWithoutConfig);
const v1ValueWithTables = {
  ...base,
  version: 1 as const,
  transactionConfig: TRANSACTION_CONFIG_MAX,
  addressLookupTables,
};
// @ts-expect-error V1 transactions have no address lookup tables.
asInput(v1ValueWithTables);
const v0ValueWithConfig = {
  ...base,
  version: 0 as const,
  transactionConfig: TRANSACTION_CONFIG_MAX,
};
// @ts-expect-error V0 transactions have no transaction config.
asInput(v0ValueWithConfig);
const implicitV0ValueWithConfig = {
  ...base,
  transactionConfig: TRANSACTION_CONFIG_MAX,
};
// @ts-expect-error Inputs without a version are V0 and have no config.
asInput(implicitV0ValueWithConfig);
const legacyValueWithConfig = {
  ...base,
  version: 'legacy' as const,
  transactionConfig: TRANSACTION_CONFIG_MAX,
};
// @ts-expect-error Legacy transactions have no transaction config.
asInput(legacyValueWithConfig);
const legacyValueWithTables = {
  ...base,
  version: 'legacy' as const,
  addressLookupTables,
};
// @ts-expect-error Legacy transactions have no address lookup tables.
asInput(legacyValueWithTables);
