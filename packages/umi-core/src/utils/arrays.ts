export const chunk = <T>(array: T[], chunkSize: number): T[][] =>
  array.reduce((chunks, item, index) => {
    const chunkIndex = Math.floor(index / chunkSize);

    if (!chunks[chunkIndex]) {
      chunks[chunkIndex] = [];
    }

    chunks[chunkIndex].push(item);

    return chunks;
  }, [] as T[][]);

export const zipMap = <T, U, V>(
  left: T[],
  right: U[],
  fn: (t: T, u: U | null, i: number) => V
): V[] => left.map((t: T, index) => fn(t, right?.[index] ?? null, index));

export const uniqueBy = <T>(array: T[], fn: (a: T, b: T) => boolean): T[] =>
  array.reduce((acc, v) => {
    if (!acc.some((x) => fn(v, x))) acc.push(v);
    return acc;
  }, [] as T[]);
