export type Nullable<T> = T | null;

export type Option<T> = Some<T> | None;
export type Some<T> = { __option: 'Some'; value: T };
export type None = { __option: 'None' };

export const some = <T>(value: T): Option<T> => ({ __option: 'Some', value });
export const none = <T>(): Option<T> => ({ __option: 'None' });

export const isSome = <T>(option: Option<T>): option is Some<T> =>
  option.__option === 'Some';
export const isNone = <T>(option: Option<T>): option is None =>
  option.__option === 'None';

export const unwrapSome = <T>(option: Option<T>): Nullable<T> =>
  isSome(option) ? option.value : null;
export const unwrapSomeOrElse = <T, U>(
  option: Option<T>,
  fallback: () => U
): T | U => (isSome(option) ? option.value : fallback());
