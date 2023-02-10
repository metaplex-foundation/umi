import test, { Assertions } from 'ava';
import {
  Amount,
  displayAmount,
  addAmounts,
  subtractAmounts,
  multiplyAmount,
  divideAmount,
  isEqualToAmount,
  isLessThanAmount,
  isLessThanOrEqualToAmount,
  isGreaterThanAmount,
  isGreaterThanOrEqualToAmount,
  isZeroAmount,
  isPositiveAmount,
  isNegativeAmount,
  usd,
  sol,
  lamports,
  AmountMismatchError,
  createAmount,
  amountToString,
  tokenAmount,
  percentAmount,
} from '../src';

test('it can create amounts from any types', (t) => {
  const usdAmount = createAmount(1500, 'USD', 2);
  const gbpAmount = createAmount(4200, 'GBP', 2);

  t.is(usdAmount.basisPoints.toString(), '1500');
  t.is(usdAmount.identifier, 'USD');
  t.is(usdAmount.decimals, 2);
  t.is(gbpAmount.basisPoints.toString(), '4200');
  t.is(gbpAmount.identifier, 'GBP');
  t.is(gbpAmount.decimals, 2);
});

test('it can be formatted', (t) => {
  const percentAmount = createAmount(1234, '%', 2);
  const usdAmount = createAmount(1536, 'USD', 2);
  const gbpAmount = createAmount(4210, 'GBP', 2);
  const solAmount = createAmount(2_500_000_000, 'SOL', 9);
  const solAmountLeadingZeroDecimal = createAmount(2_005_000_000, 'SOL', 9);

  t.is(amountToString(percentAmount), '12.34');
  t.is(displayAmount(percentAmount), '12.34%');

  t.is(amountToString(usdAmount), '15.36');
  t.is(displayAmount(usdAmount), 'USD 15.36');

  t.is(amountToString(gbpAmount), '42.10');
  t.is(displayAmount(gbpAmount), 'GBP 42.10');

  t.is(amountToString(solAmount), '2.500000000');
  t.is(amountToString(solAmount, 2), '2.50');
  t.is(displayAmount(solAmount), 'SOL 2.500000000');
  t.is(displayAmount(solAmount, 2), 'SOL 2.50');

  t.is(amountToString(solAmountLeadingZeroDecimal), '2.005000000');
  t.is(displayAmount(solAmountLeadingZeroDecimal), 'SOL 2.005000000');
});

test('it has helpers for certain currencies', (t) => {
  amountEquals(t, usd(15.36), 'USD 15.36');
  amountEquals(t, usd(15.36), 'USD 15.36');
  amountEquals(t, createAmount(1536, 'USD', 2), 'USD 15.36');
  amountEquals(t, sol(2.5), 'SOL 2.500000000');
  amountEquals(t, lamports(2_500_000_000), 'SOL 2.500000000');
  amountEquals(t, createAmount(2_500_000_000, 'SOL', 9), 'SOL 2.500000000');
});

test('it can create amounts representing SPL tokens', (t) => {
  amountEquals(t, tokenAmount(1), '1 Token');
  amountEquals(t, tokenAmount(1, undefined, 5), '1.00000 Token');
  amountEquals(t, tokenAmount(1.5, undefined, 2), '1.50 Tokens');
  amountEquals(t, tokenAmount(4.5, 'DGEN'), 'DGEN 4');
  amountEquals(t, tokenAmount(4.5, 'DGEN', 2), 'DGEN 4.50');
  amountEquals(t, tokenAmount(6.2587, 'DGEN', 9), 'DGEN 6.258700000');
});

test('it can add and subtract amounts together', (t) => {
  const a = sol(1.5);
  const b = lamports(4200000000); // 4.2 SOL

  amountEquals(t, addAmounts(a, b), 'SOL 5.700000000');
  amountEquals(t, addAmounts(b, a), 'SOL 5.700000000');
  amountEquals(t, addAmounts(a, sol(1)), 'SOL 2.500000000');

  amountEquals(t, subtractAmounts(a, b), 'SOL -2.700000000');
  amountEquals(t, subtractAmounts(b, a), 'SOL 2.700000000');
  amountEquals(t, subtractAmounts(a, sol(1)), 'SOL 0.500000000');
});

test('it fail to operate on amounts of different currencies', (t) => {
  try {
    // @ts-ignore because we want to test the error.
    addAmounts(sol(1), usd(1));
    t.fail();
  } catch (error) {
    t.true(error instanceof AmountMismatchError);
    const customError = error as AmountMismatchError;
    t.is(customError.left.identifier, 'SOL');
    t.is(customError.right.identifier, 'USD');
    t.is(customError.operation, 'add');
  }
});

test('it can multiply and divide amounts', (t) => {
  amountEquals(t, multiplyAmount(sol(1.5), 3), 'SOL 4.500000000');
  amountEquals(t, multiplyAmount(sol(1.5), 3.78), 'SOL 5.670000000');
  amountEquals(t, multiplyAmount(sol(1.5), -1), 'SOL -1.500000000');

  amountEquals(t, divideAmount(sol(1.5), 3), 'SOL 0.500000000');
  amountEquals(t, divideAmount(sol(1.5), 9), 'SOL 0.166666666');
  amountEquals(t, divideAmount(sol(1.5), -1), 'SOL -1.500000000');
});

test('it can compare amounts together', (t) => {
  const a = sol(1.5);
  const b = lamports(4200000000); // 4.2 SOL

  t.false(isEqualToAmount(a, b));
  t.true(isEqualToAmount(a, sol(1.5)));

  t.true(isLessThanAmount(a, b));
  t.false(isLessThanAmount(b, a));
  t.false(isLessThanAmount(a, sol(1.5)));
  t.true(isLessThanOrEqualToAmount(a, b));
  t.true(isLessThanOrEqualToAmount(a, sol(1.5)));

  t.false(isGreaterThanAmount(a, b));
  t.true(isGreaterThanAmount(b, a));
  t.false(isGreaterThanAmount(a, sol(1.5)));
  t.false(isGreaterThanOrEqualToAmount(a, b));
  t.true(isGreaterThanOrEqualToAmount(a, sol(1.5)));

  t.true(isPositiveAmount(a));
  t.false(isNegativeAmount(a));
  t.false(isZeroAmount(a));

  t.true(isPositiveAmount(sol(0)));
  t.false(isNegativeAmount(sol(0)));
  t.true(isZeroAmount(sol(0)));

  t.false(isPositiveAmount(sol(-1)));
  t.true(isNegativeAmount(sol(-1)));
  t.false(isZeroAmount(sol(-1)));
});

test('it can compare amounts together with a tolerance', (t) => {
  t.false(isEqualToAmount(sol(1.5), sol(1.6)));
  t.false(isEqualToAmount(sol(1.5), sol(1.6), sol(0.01)));
  t.true(isEqualToAmount(sol(1.5), sol(1.6), sol(0.1)));
  t.true(isEqualToAmount(sol(1.5), sol(1.6), sol(0.2)));
});

test('it returns a new instance when running operations', (t) => {
  const a = sol(1.5);
  const b = lamports(4200000000); // 4.2 SOL

  t.not(a, addAmounts(a, b));
  t.not(b, addAmounts(a, b));
  t.not(a, subtractAmounts(a, b));
  t.not(b, subtractAmounts(a, b));
  t.not(a, multiplyAmount(a, 3));
  t.not(a, divideAmount(a, 3));
});

test('it can create percent amounts', (t) => {
  amountEquals(t, percentAmount(5.5), '5.50%');
  amountEquals(t, percentAmount(5.5, 2), '5.50%');
  amountEquals(t, percentAmount(5.5, 4), '5.5000%');
  amountEquals(t, percentAmount(5.12345, 4), '5.1234%');
  amountEquals(t, percentAmount(5.12345, 0), '5%');
  amountEquals(t, percentAmount(100), '100.00%');
  amountEquals(t, percentAmount(250), '250.00%');
});

const amountEquals = (t: Assertions, amount: Amount, expected: string) => {
  const actual = displayAmount(amount);
  t.is(actual, expected, `${actual} === ${expected}`);
};
