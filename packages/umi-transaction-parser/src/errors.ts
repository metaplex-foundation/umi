/** @category Errors */
export class ParseError extends Error {
  readonly name: string = 'ParseError';
}

/** @category Errors */
export class ParseFailed extends ParseError {
  readonly name: string = 'ParseFailedError';

  constructor() {
    const message =
      `Parsing failed`;
    super(message);
  }
}
