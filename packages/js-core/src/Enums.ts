export type ScalarEnum<T> =
  | { [key: number | string]: string | number | T }
  | number
  | T;

export type DataEnum = { __kind: string };

export type GetDataEnumKind<
  T extends DataEnum,
  K extends T['__kind']
> = Extract<T, { __kind: K }>;

export type GetDataEnumKindContent<
  T extends DataEnum,
  K extends T['__kind']
> = Omit<Extract<T, { __kind: K }>, '__kind'>;
