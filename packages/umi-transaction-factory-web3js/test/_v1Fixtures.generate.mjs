/**
 * Regenerates `_v1Fixtures.ts`, the V1 test vectors built and signed by
 * `@solana/kit`, an implementation of SIMD-0385 independent from Umi's.
 * Run it from this package with the pinned versions:
 *
 *   npx -y -p @solana/kit@8.2.0 -p @solana-program/system@0.14.1 node test/_v1Fixtures.generate.mjs
 *
 * `npx -p` only puts the packages on PATH, so they are loaded from the
 * directory it installs them in, or from the current directory when they
 * are installed there. Kit is not a devDependency because CI runs Node 18.
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const packageDirectories = [
  process.cwd(),
  ...(process.env.PATH ?? '')
    .split(delimiter)
    .filter((dir) => /node_modules[\\/]\.bin$/.test(dir))
    .map((dir) => join(dir, '..', '..')),
];
const load = (name) => {
  const found = packageDirectories.find((dir) => {
    try {
      createRequire(join(dir, 'package.json')).resolve(name);
      return true;
    } catch {
      return false;
    }
  });
  if (!found) {
    throw new Error(`Cannot find ${name}; run this script as its header says.`);
  }
  return createRequire(join(found, 'package.json'))(name);
};

const {
  appendTransactionMessageInstructions,
  compileTransaction,
  createKeyPairSignerFromPrivateKeyBytes,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getBase64Encoder,
  getCompiledTransactionMessageDecoder,
  lamports,
  pipe,
  setTransactionMessageComputeUnitLimit,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageHeapSize,
  setTransactionMessageLifetimeUsingBlockhash,
  setTransactionMessageLoadedAccountsDataSizeLimit,
  setTransactionMessagePriorityFeeLamports,
  signTransactionMessageWithSigners,
} = load('@solana/kit');
const { getTransferSolInstruction } = load('@solana-program/system');
const prettier = require('prettier');

const hex = (bytes) => Buffer.from(bytes).toString('hex');
const seed = (n) => new Uint8Array(32).fill(n);
const signer = (n) => createKeyPairSignerFromPrivateKeyBytes(seed(n));
const BLOCKHASH = 'EETubP5AKHgjPAhzPAFcb8BAY1hMH639CWCFTqi3hq1k';

async function build({ name, numTransfers, extraSigner = false, config }) {
  const payer = await signer(1);
  const other = extraSigner ? await signer(2) : null;
  const recipients = await Promise.all(
    Array.from({ length: numTransfers }, (_, i) => signer(10 + i))
  );
  const instructions = recipients.map((recipient, i) =>
    getTransferSolInstruction({
      source: extraSigner && i === 0 ? other : payer,
      destination: recipient.address,
      amount: lamports(BigInt(1_000_000 + i)),
    })
  );

  let message = pipe(
    createTransactionMessage({ version: 1 }),
    (m) => setTransactionMessageFeePayerSigner(payer, m),
    (m) =>
      setTransactionMessageLifetimeUsingBlockhash(
        { blockhash: BLOCKHASH, lastValidBlockHeight: 0n },
        m
      ),
    (m) => appendTransactionMessageInstructions(instructions, m)
  );
  if (config.computeUnitLimit !== undefined) {
    message = setTransactionMessageComputeUnitLimit(
      config.computeUnitLimit,
      message
    );
  }
  if (config.loadedAccountsDataSizeLimit !== undefined) {
    message = setTransactionMessageLoadedAccountsDataSizeLimit(
      config.loadedAccountsDataSizeLimit,
      message
    );
  }
  if (config.heapSize !== undefined) {
    message = setTransactionMessageHeapSize(config.heapSize, message);
  }
  if (config.priorityFeeLamports !== undefined) {
    message = setTransactionMessagePriorityFeeLamports(
      BigInt(config.priorityFeeLamports),
      message
    );
  }

  const compiled = compileTransaction(message);
  const signed = await signTransactionMessageWithSigners(message);
  const wire = getBase64Encoder().encode(
    getBase64EncodedWireTransaction(signed)
  );
  const decoded = getCompiledTransactionMessageDecoder().decode(
    compiled.messageBytes
  );

  return {
    name,
    blockhash: BLOCKHASH,
    payer: { publicKey: payer.address, secretKeySeedHex: hex(seed(1)) },
    otherSigner: other
      ? { publicKey: other.address, secretKeySeedHex: hex(seed(2)) }
      : null,
    header: {
      numRequiredSignatures: decoded.header.numSignerAccounts,
      numReadonlySignedAccounts: decoded.header.numReadonlySignerAccounts,
      numReadonlyUnsignedAccounts: decoded.header.numReadonlyNonSignerAccounts,
    },
    accounts: decoded.staticAccounts,
    instructions: decoded.instructionHeaders.map((header, i) => ({
      programIndex: header.programAccountIndex,
      accountIndexes: Array.from(
        decoded.instructionPayloads[i].instructionAccountIndices
      ),
      dataHex: hex(decoded.instructionPayloads[i].instructionData),
    })),
    config,
    configMask: decoded.configMask,
    messageHex: hex(compiled.messageBytes),
    wireHex: hex(wire),
    signaturesHex: Object.values(signed.signatures).map(hex),
    transfers: instructions.map((instruction, i) => ({
      source: instruction.accounts[0].address,
      destination: instruction.accounts[1].address,
      lamports: 1_000_000 + i,
      dataHex: hex(instruction.data),
    })),
  };
}

const SUBSET_FIELDS = [
  ['priorityFeeLamports', 987_654_321],
  ['computeUnitLimit', 123_456],
  ['loadedAccountsDataSizeLimit', 98_304],
  ['heapSize', 131_072],
];

const fixtures = [
  await build({
    name: 'one-transfer-fee-cu-data',
    numTransfers: 1,
    config: {
      priorityFeeLamports: 1000,
      computeUnitLimit: 200_000,
      loadedAccountsDataSizeLimit: 65_536,
    },
  }),
  await build({
    name: 'one-transfer-cu-heap',
    numTransfers: 1,
    config: { computeUnitLimit: 50_000, heapSize: 65_536 },
  }),
  await build({
    name: 'one-transfer-empty-config',
    numTransfers: 1,
    config: {},
  }),
  await build({
    name: 'two-signers-all-config',
    numTransfers: 2,
    extraSigner: true,
    config: {
      priorityFeeLamports: 123_456_789,
      computeUnitLimit: 1_400_000,
      loadedAccountsDataSizeLimit: 32_768,
      heapSize: 262_144,
    },
  }),
  await build({
    name: 'forty-transfers-cu-data',
    numTransfers: 40,
    config: { computeUnitLimit: 200_000, loadedAccountsDataSizeLimit: 65_536 },
  }),
  ...(await Promise.all(
    Array.from({ length: 16 }, (_, mask) => {
      const fields = SUBSET_FIELDS.filter((_, bit) => mask & (1 << bit));
      return build({
        name: `subset-${mask}-${
          fields.map(([key]) => key).join('+') || 'none'
        }`,
        numTransfers: 1,
        config: Object.fromEntries(fields),
      });
    })
  )),
];

const chunk = (value) => {
  if (value.length <= 64) return JSON.stringify(value);
  const parts = [];
  for (let i = 0; i < value.length; i += 64) {
    parts.push(JSON.stringify(value.slice(i, i + 64)));
  }
  return `[${parts.join(', ')}].join('')`;
};

const render = (value, indent = '  ') => {
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value
      .map((item) => `${indent}  ${render(item, `${indent}  `)},`)
      .join('\n');
    return `[\n${items}\n${indent}]`;
  }
  if (value === null) return 'null';
  if (typeof value === 'object') {
    const entries = Object.entries(value).map(([key, field]) => {
      const rendered =
        /Hex$/.test(key) && typeof field === 'string'
          ? chunk(field)
          : render(field, `${indent}  `);
      return `${indent}  ${key}: ${rendered},`;
    });
    return `{\n${entries.join('\n')}\n${indent}}`;
  }
  if (typeof value === 'string') return JSON.stringify(value);
  return String(value);
};

const source = `/**
 * V1 transaction test vectors generated with \`@solana/kit\` 8 and accepted by
 * a validator that runs SIMD-0385. Every fixture transfers lamports through
 * the System program; \`configMask\` is the raw mask of \`config\`. The
 * \`subset-*\` fixtures cover every subset of the four config fields.
 *
 * Generated by \`_v1Fixtures.generate.mjs\`; regenerate from this package with
 * \`npx -y -p @solana/kit@8.2.0 -p @solana-program/system@0.14.1 node test/_v1Fixtures.generate.mjs\`.
 */

export type V1FixtureSigner = {
  publicKey: string;
  secretKeySeedHex: string;
};

export type V1Fixture = {
  name: string;
  blockhash: string;
  payer: V1FixtureSigner;
  otherSigner: V1FixtureSigner | null;
  header: {
    numRequiredSignatures: number;
    numReadonlySignedAccounts: number;
    numReadonlyUnsignedAccounts: number;
  };
  accounts: string[];
  instructions: {
    programIndex: number;
    accountIndexes: number[];
    dataHex: string;
  }[];
  config: {
    priorityFeeLamports?: number;
    computeUnitLimit?: number;
    loadedAccountsDataSizeLimit?: number;
    heapSize?: number;
  };
  configMask: number;
  messageHex: string;
  wireHex: string;
  signaturesHex: string[];
  transfers: {
    source: string;
    destination: string;
    lamports: number;
    dataHex: string;
  }[];
};

export const V1_FIXTURES: V1Fixture[] = ${render(fixtures, '')};
`;

const output = fileURLToPath(new URL('./_v1Fixtures.ts', import.meta.url));
writeFileSync(
  output,
  prettier.format(source, {
    ...prettier.resolveConfig.sync(output),
    filepath: output,
  })
);
console.log(`wrote ${fixtures.length} fixtures to ${output}`);
