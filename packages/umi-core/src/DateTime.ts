import { BigIntInput, createBigInt } from './BigInt';
import { mapSerializer, Serializer } from './Serializer';

export type DateTimeString = string;
export type DateTimeInput = DateTimeString | BigIntInput | Date;
export type DateTime = bigint;

export const dateTime = (value: DateTimeInput): DateTime => {
  if (typeof value === 'string' || isDateObject(value)) {
    const date = new Date(value);
    const timestamp = Math.floor(date.getTime() / 1000);
    return createBigInt(timestamp);
  }

  return createBigInt(value);
};

export const now = (): DateTime => dateTime(new Date(Date.now()));

const isDateObject = (value: any): value is Date =>
  Object.prototype.toString.call(value) === '[object Date]';

export const formatDateTime = (
  value: DateTime,
  locales: Intl.LocalesArgument = 'en-US',
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }
): string => {
  const date = new Date((value * 1000n).toString());

  return date.toLocaleDateString(locales, options);
};

export const mapDateTimeSerializer = (
  serializer: Serializer<number> | Serializer<number | bigint, bigint>
): Serializer<DateTimeInput, DateTime> =>
  mapSerializer(
    serializer as Serializer<number | bigint>,
    (value: DateTimeInput): number | bigint => {
      const date = dateTime(value);
      return date > Number.MAX_SAFE_INTEGER ? date : Number(date);
    },
    (value: number | bigint): DateTime => dateTime(value)
  );
