import {
  Context,
  createGenericFile,
  createBaseUmi,
  generatedSignerIdentity,
  generateSigner,
  publicKey,
  sol,
  Transaction,
  usd,
} from '@metaplex-foundation/umi';
import { httpDownloader } from '@metaplex-foundation/umi-downloader-http';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import { fetchHttp } from '@metaplex-foundation/umi-http-fetch';
import { web3JsRpc } from '@metaplex-foundation/umi-rpc-web3js';
import { web3JsTransactionFactory } from '@metaplex-foundation/umi-transaction-factory-web3js';
import { base58, utf8 } from '@metaplex-foundation/umi/serializers';
import test from 'ava';
import { createHash } from 'crypto';
import {
  ArweaveUploader,
  arweaveUploader,
  ArweaveUploaderOptions,
} from '../src';
import { transferSolInstruction } from '../src/transferSol';

test('example test', async (t) => {
  t.is(typeof arweaveUploader, 'function');
});

const devNetRpcUrl = 'https://api.devnet.solana.com';

const getContext = async (
  options?: ArweaveUploaderOptions,
  rpcUrl = devNetRpcUrl
): Promise<Context> => {
  const context = createBaseUmi().use({
    install(umi) {
      umi.use(web3JsRpc(rpcUrl));
      umi.use(web3JsEddsa());
      umi.use(web3JsTransactionFactory());
      umi.use(fetchHttp());
      umi.use(httpDownloader());
      umi.use(arweaveUploader(options));
      umi.use(generatedSignerIdentity());
    },
  });

  // await context.rpc.airdrop(context.payer.publicKey, sol(1));
  return context;
};

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

// Stubs the Turbo services at 1000 winc per byte and 10^12 winc per SOL,
// so one byte costs one lamport.
const stubTurbo = ({
  balance = 10n ** 15n,
  freeResponses = [] as { status: number; delayMs?: number }[],
  fundStatuses = [] as string[],
  paidDelayMs = 0,
} = {}) => {
  const requests: { method: string; url: URL; headers: Headers }[] = [];
  const shares: { approvedAddress: string; approvedWincAmount: string }[] = [];
  const state = { balance, credited: undefined as bigint | undefined };
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string, init: RequestInit = {}) => {
    const url = new URL(input);
    const method = init.method ?? 'GET';
    const headers = new Headers(init.headers);
    requests.push({ method, url, headers });

    const bytes = url.pathname.match(/^\/v1\/price\/(bytes|solana)\/(\d+)$/);
    if (bytes) {
      const winc = bytes[1] === 'bytes' ? BigInt(bytes[2]) * 1000n : 10n ** 12n;
      return json({ winc: winc.toString() });
    }
    if (url.pathname === '/v1/info') {
      return json({
        addresses: { solana: publicKey(new Uint8Array(32).fill(1)) },
      });
    }
    if (method === 'POST' && url.pathname === '/v1/account/balance/solana') {
      const status = fundStatuses.shift();
      if (status === 'credited')
        state.balance = state.credited ?? state.balance;
      return json(
        { [`${status}Transaction`]: {} },
        status === 'pending' ? 202 : 200
      );
    }
    if (url.pathname.startsWith('/v1/account/balance')) {
      return json({ winc: state.balance.toString() });
    }
    if (url.pathname.startsWith('/v1/top-up/checkout-session/')) {
      return json({
        topUpQuote: { winstonCreditAmount: '10000000000000' },
        paymentSession: { url: 'https://checkout.stripe.com/c/pay/cs_test' },
      });
    }
    if (method === 'POST' && url.pathname === '/v1/tx') {
      if (headers.has('x-paid-by')) await sleep(paidDelayMs);
      const response = headers.has('x-paid-by')
        ? undefined
        : freeResponses.shift();
      if (response && response.status !== 200) {
        await sleep(response.delayMs ?? 0);
        return json({ message: 'Refused' }, response.status);
      }
      const body = init.body as Uint8Array;
      // The id is the SHA-256 of the type-4 signature, bytes 2 to 66.
      const id = createHash('sha256')
        .update(body.subarray(2, 66))
        .digest('base64url');
      return json({ id });
    }
    return json({}, 404);
  }) as typeof fetch;

  const spyOnShares = async (uploader: ArweaveUploader) => {
    const arweave = await uploader.arweave();
    arweave.shareCredits = async (share: any) => {
      shares.push(share);
      return share;
    };
    return arweave;
  };

  return {
    requests,
    shares,
    state,
    spyOnShares,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
};

test.serial(
  'it uses the ar.io testnet services on test clusters',
  async (t) => {
    const turbo = stubTurbo();
    try {
      for (const rpcUrl of [
        'https://api.devnet.solana.com',
        'https://api.testnet.solana.com',
        'http://127.0.0.1:8899',
      ]) {
        const context = await getContext({}, rpcUrl);
        const [uri] = await context.uploader.upload([
          createGenericFile('some-image', 'some-image.jpg'),
        ]);
        t.true(uri.startsWith('https://ar-io.dev/raw/'), rpcUrl);
      }
      const hosts = new Set(turbo.requests.map(({ url }) => url.host));
      t.deepEqual([...hosts].sort(), [
        'payment.services.ar-io.dev',
        'upload.services.ar-io.dev',
      ]);
    } finally {
      turbo.restore();
    }
  }
);

test.serial(
  'it uses the production services on mainnet and custom RPCs',
  async (t) => {
    const turbo = stubTurbo();
    try {
      for (const rpcUrl of [
        'https://api.mainnet-beta.solana.com',
        'https://rpc.example.com',
      ]) {
        const context = await getContext({}, rpcUrl);
        const arweave = await (context.uploader as ArweaveUploader).arweave();
        t.is(arweave.uploadUrl, 'https://upload.ardrive.io', rpcUrl);
        t.is(arweave.paymentUrl, 'https://payment.ardrive.io', rpcUrl);
      }
    } finally {
      turbo.restore();
    }
  }
);

test.serial(
  'it shares the price of every file over the free limit plus a header',
  async (t) => {
    const turbo = stubTurbo();
    try {
      const context = await getContext({ priceMultiplier: 1.5 });
      const uploader = context.uploader as ArweaveUploader;
      await turbo.spyOnShares(uploader);
      const files = [
        createGenericFile(new Uint8Array(129_072), 'a.bin'),
        createGenericFile(new Uint8Array(129_072), 'b.bin', {
          contentType: 'application/octet-stream',
        }),
      ];

      await uploader.upload(files);

      // Two files plus two 2,000-byte headers make 2^18 bytes.
      t.is((await uploader.getUploadPrice(files)).basisPoints, 393_216n);
      t.is(turbo.shares.length, 1);
      t.not(turbo.shares[0].approvedAddress, context.payer.publicKey);
      t.is(turbo.shares[0].approvedWincAmount, '262144000');
      const paidBy = turbo.requests
        .filter(({ method }) => method === 'POST')
        .map(({ headers }) => headers.get('x-paid-by'));
      t.deepEqual(paidBy, [context.payer.publicKey, context.payer.publicKey]);
    } finally {
      turbo.restore();
    }
  }
);

test.serial(
  'it pays only for the files over the free limit in a mixed batch',
  async (t) => {
    const turbo = stubTurbo({
      freeResponses: [{ status: 402, delayMs: 100 }, { status: 200 }],
      paidDelayMs: 200,
    });
    try {
      const context = await getContext();
      const uploader = context.uploader as ArweaveUploader;
      await turbo.spyOnShares(uploader);
      const files = [
        createGenericFile(new Uint8Array(129_072), 'big.bin'),
        createGenericFile('a', 'a.txt'),
        createGenericFile('bb', 'b.txt'),
      ];

      await uploader.upload(files);

      // Only big.bin and its header are priced. a.txt is refused with a 402
      // while big.bin is still uploading, so it is paid for on its own.
      t.is((await uploader.getUploadPrice(files)).basisPoints, 144_180n);
      t.deepEqual(
        turbo.shares.map(({ approvedWincAmount }) => approvedWincAmount),
        ['131072000', '2001000']
      );
      const paidBy = turbo.requests
        .filter(({ method }) => method === 'POST')
        .map(({ headers }) => headers.get('x-paid-by'));
      t.is(paidBy.filter((payer) => payer === null).length, 2);
      t.is(
        paidBy.filter((payer) => payer === context.payer.publicKey).length,
        2
      );
    } finally {
      turbo.restore();
    }
  }
);

test.serial(
  'it pays for a free item refused with 402 and sends it again',
  async (t) => {
    const turbo = stubTurbo({ freeResponses: [{ status: 402 }] });
    try {
      const context = await getContext();
      const uploader = context.uploader as ArweaveUploader;
      await turbo.spyOnShares(uploader);
      const file = createGenericFile('some-image', 'some-image.jpg');
      t.is((await uploader.getUploadPrice([file])).basisPoints, 0n);

      const [uri] = await uploader.upload([file]);

      t.true(uri.startsWith('https://ar-io.dev/raw/'));
      t.deepEqual(
        turbo.shares.map(({ approvedWincAmount }) => approvedWincAmount),
        ['2010000']
      );
      const paidBy = turbo.requests
        .filter(({ method }) => method === 'POST')
        .map(({ headers }) => headers.get('x-paid-by'));
      t.deepEqual(paidBy, [null, context.payer.publicKey]);
    } finally {
      turbo.restore();
    }
  }
);

test.serial(
  'it returns Turbo Storage Credits for a Stripe checkout session',
  async (t) => {
    const turbo = stubTurbo();
    try {
      const context = await getContext();
      const { checkoutSessionUrl, turboStorageCredits } = await (
        context.uploader as ArweaveUploader
      ).getStripeCheckoutSession(usd(10));

      t.is(checkoutSessionUrl, 'https://checkout.stripe.com/c/pay/cs_test');
      t.is(turboStorageCredits.toString(), '10');
      t.true(
        turbo.requests.some(
          ({ url }) =>
            url.pathname ===
            `/v1/top-up/checkout-session/${context.payer.publicKey}/usd/1000`
        )
      );
    } finally {
      turbo.restore();
    }
  }
);

const stubRpc = (
  context: Context,
  confirmTransaction: Context['rpc']['confirmTransaction'] = async () => ({
    context: { slot: 1 },
    value: { err: null },
  })
) => {
  const sent: Transaction[] = [];
  context.rpc = {
    ...context.rpc,
    getLatestBlockhash: async () => ({
      blockhash: '11111111111111111111111111111111',
      lastValidBlockHeight: 1,
    }),
    sendTransaction: async (transaction) => {
      sent.push(transaction);
      return transaction.signatures[0];
    },
    confirmTransaction,
  };
  return sent;
};

test.serial(
  'it transfers the shortfall in SOL, then shares the price',
  async (t) => {
    const turbo = stubTurbo({
      balance: 100_000_000n,
      fundStatuses: ['credited'],
    });
    try {
      const context = await getContext();
      const sent = stubRpc(context);
      const uploader = context.uploader as ArweaveUploader;
      await turbo.spyOnShares(uploader);

      await uploader.upload([
        createGenericFile(new Uint8Array(200_000), 'a.bin'),
      ]);

      // 202,000 bytes times 1.1 is 222,200 lamports, less the 100,000 lamport balance.
      t.is(sent.length, 1);
      const { data } = sent[0].message.instructions[0];
      t.is(
        new DataView(data.buffer, data.byteOffset).getBigUint64(4, true),
        122_200n
      );
      t.deepEqual(
        turbo.shares.map(({ approvedWincAmount }) => approvedWincAmount),
        ['202000000']
      );
    } finally {
      turbo.restore();
    }
  }
);

test.serial('it pays once for a batch of refused free files', async (t) => {
  const turbo = stubTurbo({
    freeResponses: [{ status: 402 }, { status: 402 }, { status: 402 }],
  });
  try {
    const uploader = (await getContext()).uploader as ArweaveUploader;
    await turbo.spyOnShares(uploader);
    await uploader.upload([
      createGenericFile('a', 'a.txt'),
      createGenericFile('b', 'b.txt'),
      createGenericFile('cc', 'c.txt'),
    ]);

    t.deepEqual(
      turbo.shares.map(({ approvedWincAmount }) => approvedWincAmount),
      ['6004000']
    );
  } finally {
    turbo.restore();
  }
});

test.serial(
  'it pays only for the files the free tier has not accepted',
  async (t) => {
    const turbo = stubTurbo({
      freeResponses: [{ status: 402, delayMs: 100 }, { status: 200 }],
    });
    try {
      const uploader = (await getContext()).uploader as ArweaveUploader;
      await turbo.spyOnShares(uploader);

      await uploader.upload([
        createGenericFile('a', 'a.txt'),
        createGenericFile('bb', 'b.txt'),
      ]);

      t.deepEqual(
        turbo.shares.map(({ approvedWincAmount }) => approvedWincAmount),
        ['2001000']
      );
    } finally {
      turbo.restore();
    }
  }
);

test.serial(
  'it pays for a refused copy of a file already accepted',
  async (t) => {
    const turbo = stubTurbo({
      freeResponses: [{ status: 200 }, { status: 402, delayMs: 100 }],
    });
    try {
      const uploader = (await getContext()).uploader as ArweaveUploader;
      await turbo.spyOnShares(uploader);
      const file = createGenericFile('a', 'a.txt');

      await uploader.upload([file, file]);

      t.deepEqual(
        turbo.shares.map(({ approvedWincAmount }) => approvedWincAmount),
        ['2001000']
      );
    } finally {
      turbo.restore();
    }
  }
);

test.serial('it does not pay after another file has failed', async (t) => {
  const turbo = stubTurbo({
    freeResponses: [{ status: 400 }, { status: 402, delayMs: 100 }],
  });
  try {
    const uploader = (await getContext()).uploader as ArweaveUploader;
    await turbo.spyOnShares(uploader);

    await t.throwsAsync(
      uploader.upload([
        createGenericFile('a', 'a.txt'),
        createGenericFile('b', 'b.txt'),
      ]),
      { name: 'AssetUploadFailedError' }
    );
    t.is(turbo.shares.length, 0);
  } finally {
    turbo.restore();
  }
});

test.serial(
  'it finishes a payment in progress before it reports a failed file',
  async (t) => {
    const turbo = stubTurbo({
      balance: 0n,
      fundStatuses: ['credited'],
      freeResponses: [{ status: 402 }, { status: 400, delayMs: 50 }],
    });
    try {
      const context = await getContext();
      stubRpc(context, async () => {
        await sleep(200);
        return { context: { slot: 1 }, value: { err: null } };
      });
      const uploader = context.uploader as ArweaveUploader;
      await turbo.spyOnShares(uploader);

      await t.throwsAsync(
        uploader.upload([
          createGenericFile('a', 'a.txt'),
          createGenericFile('b', 'b.txt'),
        ]),
        { name: 'AssetUploadFailedError' }
      );
      t.is(turbo.shares.length, 1);
      // The refused file is not sent again once another file has failed.
      t.false(turbo.requests.some(({ headers }) => headers.has('x-paid-by')));
    } finally {
      turbo.restore();
    }
  }
);

test.serial('it reports a failed payment as ArweaveFundError', async (t) => {
  const turbo = stubTurbo({ balance: 0n, freeResponses: [{ status: 402 }] });
  try {
    const context = await getContext();
    stubRpc(context, async () => {
      throw new Error('block height exceeded');
    });

    await t.throwsAsync(
      context.uploader.upload([createGenericFile('a', 'a.txt')]),
      { name: 'ArweaveFundError' }
    );
  } finally {
    turbo.restore();
  }
});

test.serial('it prices amounts below 0.000001 SOL', async (t) => {
  const turbo = stubTurbo({ balance: 1_500n });
  try {
    const uploader = (await getContext()).uploader as ArweaveUploader;

    t.is((await uploader.getBalance()).basisPoints, 1n);
    t.is(
      (await uploader.getUploadPriceFromBytes(100)).solAmount.basisPoints,
      110n
    );
  } finally {
    turbo.restore();
  }
});

test.serial(
  'it waits until the payment service credits a SOL transfer',
  async (t) => {
    const turbo = stubTurbo({
      fundStatuses: ['pending', 'credited', 'failed'],
    });
    try {
      const context = await getContext();
      stubRpc(context);
      const uploader = context.uploader as ArweaveUploader;

      await uploader.fund(sol(0.01), true);
      await t.throwsAsync(uploader.fund(sol(0.01), true), {
        message: /could not credit/,
      });
      t.is(
        turbo.requests.filter(
          ({ url }) => url.pathname === '/v1/account/balance/solana'
        ).length,
        3
      );
    } finally {
      turbo.restore();
    }
  }
);

test.serial(
  'it names a sent SOL transfer that was not confirmed',
  async (t) => {
    const turbo = stubTurbo();
    try {
      const context = await getContext();
      const sent = stubRpc(context, async () => {
        throw new Error('block height exceeded');
      });

      const error = await t.throwsAsync(
        (context.uploader as ArweaveUploader).fund(sol(0.01), true)
      );

      const [txId] = base58.deserialize(sent[0].signatures[0]);
      t.is(error?.name, 'ArweaveFundError');
      t.true(error?.message.includes(`submitFundTransaction('${txId}')`));
    } finally {
      turbo.restore();
    }
  }
);

test('it builds a System Program transfer', async (t) => {
  const context = await getContext();
  const destination = generateSigner(context).publicKey;
  const { instruction } = transferSolInstruction(
    context.payer,
    destination,
    10_000_000n
  );

  t.is(instruction.programId, publicKey('11111111111111111111111111111111'));
  t.deepEqual(
    instruction.keys.map(({ pubkey }) => pubkey),
    [context.payer.publicKey, destination]
  );
  t.deepEqual(
    [...instruction.data],
    [2, 0, 0, 0, 0x80, 0x96, 0x98, 0, 0, 0, 0, 0]
  );
});

test.skip('can upload one file', async (t) => {
  const context = await getContext();

  // When we upload some asset under the free byte limit with the devnet RPC.
  const [uri] = await context.uploader.upload([
    createGenericFile('some-image', 'some-image.jpg'),
  ]);

  // Then the URI should be a valid arweave dev gateway URI.
  t.truthy(uri);
  t.true(uri.startsWith('https://ar-io.dev/'));

  // and it should point to the uploaded asset.
  const [asset] = await context.downloader.download([uri]);
  t.is(utf8.deserialize(asset.buffer)[0], 'some-image');
});

test.skip('can upload a file above 105 KiB in size', async (t) => {
  // This test will require devnet SOL balance in the connected payer

  const context = await getContext();

  const buffer = new Uint8Array(6 * 1024 * 1024);
  buffer.fill(1);

  // Upload will transfer SOL from the payer's wallet to the connected uploader's wallet in exchange for Turbo Storage Credits which are used to pay for the upload
  const [uri] = await context.uploader.upload([
    createGenericFile(buffer, 'big-file.bin'),
  ]);

  t.truthy(uri);
  t.true(uri.startsWith('https://ar-io.dev/'));

  const [asset] = await context.downloader.download([uri]);
  t.deepEqual(asset.buffer, buffer);
});

test('can get a USD stripe checkout session', async (t) => {
  const context = await getContext();

  const { checkoutSessionUrl, turboStorageCredits } = await (
    context.uploader as ArweaveUploader
  ).getStripeCheckoutSession(usd(10));

  t.assert(checkoutSessionUrl);
  t.true(+turboStorageCredits > 0);
});

test('can get a balance in Turbo Storage Credits', async (t) => {
  const context = await getContext();

  const balance = await (
    context.uploader as ArweaveUploader
  ).getTurboStorageCreditBalance();
  t.true(+balance.valueOf() > -1);
});

test('can get a balance in SOL Equivalent', async (t) => {
  const context = await getContext();

  const balance = await (context.uploader as ArweaveUploader).getBalance();
  t.true(balance.basisPoints.valueOf() > -1);
});
