import test from 'ava';
import {
  InterfaceImplementationMissingError,
  UmiPlugin,
  createBaseUmi,
  createUmi,
} from '../src';

test('createBaseUmi returns a context with null implementations', (t) => {
  const umi = createBaseUmi();
  t.throws(() => umi.eddsa.generateKeypair(), {
    instanceOf: InterfaceImplementationMissingError,
  });
  t.throws(() => umi.rpc.getEndpoint(), {
    instanceOf: InterfaceImplementationMissingError,
  });
  t.throws(() => umi.identity.publicKey, {
    message: /Trying to use a NullSigner/,
  });
});

test('use installs a plugin and returns the same Umi instance for chaining', (t) => {
  const installed: string[] = [];
  const plugin = (name: string): UmiPlugin => ({
    install() {
      installed.push(name);
    },
  });

  const umi = createBaseUmi();
  const result = umi.use(plugin('first')).use(plugin('second'));
  t.is(result, umi);
  t.deepEqual(installed, ['first', 'second']);
});

test('plugins receive the Umi instance they are installed on', (t) => {
  const umi = createBaseUmi();
  let received: unknown;
  umi.use({
    install(instance) {
      received = instance;
    },
  });
  t.is(received, umi);
});

test('the deprecated createUmi behaves like createBaseUmi', (t) => {
  const umi = createUmi();
  t.is(typeof umi.use, 'function');
  t.throws(() => umi.eddsa.generateKeypair(), {
    instanceOf: InterfaceImplementationMissingError,
  });
});
