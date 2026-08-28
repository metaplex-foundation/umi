import test from 'ava';
import {
  AccountNotFoundError,
  AmountMismatchError,
  InterfaceImplementationMissingError,
  InvalidBaseStringError,
  Program,
  ProgramError,
  SdkError,
  UmiError,
  UnexpectedAccountError,
  UnexpectedAmountError,
  createAmount,
  publicKey,
} from '../src';

const PUBLIC_KEY = publicKey('11111111111111111111111111111111');

const mockProgram = (): Program => ({
  name: 'myProgram',
  publicKey: PUBLIC_KEY,
  getErrorFromCode: () => null,
  getErrorFromName: () => null,
  isOnCluster: () => true,
});

test('UmiError formats its message with a source', (t) => {
  const error = new UmiError('Something went wrong.', 'plugin', 'myPlugin');
  t.is(error.name, 'UmiError');
  t.is(error.source, 'plugin');
  t.is(error.sourceDetails, 'myPlugin');
  t.is(error.cause, undefined);
  t.true(error.message.startsWith('Something went wrong.'));
  t.true(error.message.includes('Source: Plugin > myPlugin'));
});

test('UmiError uppercases sdk and rpc sources', (t) => {
  t.is(new UmiError('m', 'sdk').getCapitalizedSource(), 'SDK');
  t.is(new UmiError('m', 'rpc').getCapitalizedSource(), 'RPC');
  t.is(new UmiError('m', 'network').getCapitalizedSource(), 'Network');
  t.is(new UmiError('m', 'program').getCapitalizedSource(), 'Program');
});

test('UmiError includes source details in its full source when provided', (t) => {
  t.is(new UmiError('m', 'network').getFullSource(), 'Network');
  t.is(
    new UmiError('m', 'network', 'some details').getFullSource(),
    'Network > some details'
  );
});

test('UmiError includes its cause in the message', (t) => {
  const cause = new Error('The underlying cause.');
  const error = new UmiError('m', 'sdk', undefined, cause);
  t.is(error.cause, cause);
  t.true(error.message.includes('Caused By: Error: The underlying cause.'));
});

test('UmiError serializes to a string with its name', (t) => {
  const error = new UmiError('Some message.', 'sdk');
  t.true(error.toString().startsWith('[UmiError] Some message.'));
});

test('SdkError uses the sdk source', (t) => {
  const error = new SdkError('An SDK error.');
  t.is(error.name, 'SdkError');
  t.is(error.source, 'sdk');
  t.true(error.message.includes('Source: SDK'));
  t.true(error instanceof UmiError);
});

test('AccountNotFoundError formats with and without an account type', (t) => {
  const withoutType = new AccountNotFoundError(PUBLIC_KEY);
  t.is(withoutType.name, 'AccountNotFoundError');
  t.true(
    withoutType.message.includes(
      `No account was found at the provided address [${PUBLIC_KEY}].`
    )
  );

  const withType = new AccountNotFoundError(PUBLIC_KEY, 'Metadata');
  t.true(
    withType.message.includes(
      `The account of type [Metadata] was not found at the provided address [${PUBLIC_KEY}].`
    )
  );

  const withSolution = new AccountNotFoundError(
    PUBLIC_KEY,
    'Metadata',
    'Try this.'
  );
  t.true(withSolution.message.includes('Try this.'));
});

test('AmountMismatchError exposes both amounts and the operation', (t) => {
  const left = createAmount(1, 'SOL', 9);
  const right = createAmount(2, 'USD', 2);
  const error = new AmountMismatchError(left, right, 'add');
  t.is(error.name, 'AmountMismatchError');
  t.is(error.left, left);
  t.is(error.right, right);
  t.is(error.operation, 'add');
  t.true(error.message.includes('operation [add]'));
  t.true(error.message.includes('[SOL with 9 decimals]'));
  t.true(error.message.includes('[USD with 2 decimals]'));

  const withoutOperation = new AmountMismatchError(left, right);
  t.is(withoutOperation.operation, undefined);
  t.false(withoutOperation.message.includes('operation ['));
});

test('InterfaceImplementationMissingError explains how to register an implementation', (t) => {
  const error = new InterfaceImplementationMissingError(
    'EddsaInterface',
    'eddsa'
  );
  t.is(error.name, 'InterfaceImplementationMissingError');
  t.true(error.message.includes('Tried using EddsaInterface'));
  t.true(error.message.includes('context.eddsa = new MyEddsa();'));
});

test('InvalidBaseStringError formats the value and base', (t) => {
  const cause = new Error('some cause');
  const error = new InvalidBaseStringError('0x123', 10, cause);
  t.is(error.name, 'InvalidBaseStringError');
  t.true(error.message.includes('Expected a string of base 10, got [0x123].'));
  t.is(error.cause, cause);
});

test('ProgramError includes the program name and public key as source details', (t) => {
  const program = mockProgram();
  const error = new ProgramError('Custom program error.', program);
  t.is(error.name, 'ProgramError');
  t.is(error.program, program);
  t.is(error.source, 'program');
  t.is(error.sourceDetails, `myProgram [${PUBLIC_KEY}]`);
  t.is(error.logs, undefined);
});

test('ProgramError appends program logs from its cause', (t) => {
  const cause = new Error('Underlying error.') as Error & { logs?: string[] };
  cause.logs = ['log one', 'log two'];
  const error = new ProgramError('Custom program error.', mockProgram(), cause);
  t.deepEqual(error.logs, ['log one', 'log two']);
  t.true(error.message.includes('Program Logs:\n| log one\n| log two'));
});

test('UnexpectedAccountError formats the address and expected type', (t) => {
  const error = new UnexpectedAccountError(PUBLIC_KEY, 'Metadata');
  t.is(error.name, 'UnexpectedAccountError');
  t.true(
    error.message.includes(
      `The account at the provided address [${PUBLIC_KEY}] is not of the expected type [Metadata].`
    )
  );
});

test('UnexpectedAmountError exposes the amount and expectations', (t) => {
  const amount = createAmount(100, 'USD', 2);
  const error = new UnexpectedAmountError(amount, 'SOL', 9);
  t.is(error.name, 'UnexpectedAmountError');
  t.is(error.amount, amount);
  t.is(error.expectedIdentifier, 'SOL');
  t.is(error.expectedDecimals, 9);
  t.true(
    error.message.includes(
      'Expected amount of type [SOL with 9 decimals] but got [USD with 2 decimals].'
    )
  );
});
