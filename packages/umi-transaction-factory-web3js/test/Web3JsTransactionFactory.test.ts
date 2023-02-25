import test from 'ava';
import { createLegacyMessage, createUmi } from './_setup';

test('it can serialize a legacy message', async (t) => {
  const umi = createUmi();
  const [legacyMessage, web3JsLegacyMessage] = createLegacyMessage(umi);
  const serialized = umi.transactions.serializeMessage(legacyMessage);
  t.deepEqual(serialized, new Uint8Array(web3JsLegacyMessage.serialize()));
});

test('it can deserialize a legacy message', async (t) => {
  const umi = createUmi();
  const [originalMessage, web3JsLegacyMessage] = createLegacyMessage(umi);
  const serializedMessage = new Uint8Array(web3JsLegacyMessage.serialize());
  const deserializedMessage =
    umi.transactions.deserializeMessage(serializedMessage);
  t.deepEqual(deserializedMessage, originalMessage);
});

// it can serialize a v0 message
// it can deserialize a v0 message
