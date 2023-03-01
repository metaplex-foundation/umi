export const removeNullCharacters = (value: string) =>
  // eslint-disable-next-line no-control-regex
  value.replace(/\u0000/g, '');

export const padNullCharacters = (value: string, chars: number) =>
  value.padEnd(chars, '\u0000');
