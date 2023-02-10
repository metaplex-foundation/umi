import { SdkError } from './SdkError';

/** @group Errors */
export class InterfaceImplementationMissingError extends SdkError {
  readonly name: string = 'InterfaceImplementationMissingError';

  constructor(interfaceName: string, contextVariable: string) {
    const interfaceBasename = interfaceName.replace(/Interface$/, '');
    const message =
      `Tried using ${interfaceName} but no implementation of that interface was found. ` +
      `Make sure an implementation is registered, ` +
      `e.g. via "context.${contextVariable} = new My${interfaceBasename}();".`;
    super(message);
  }
}
