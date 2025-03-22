import { createNullContext } from '@metaplex-foundation/umi';
import test from 'ava';
import { createWeb3JsRpc } from '../src';

const DEVNET_ENDPOINT = 'https://api.devnet.solana.com';

test('it calls RPC methods with positional parameters', async (t) => {
    // Given an RPC client
    const rpc = createWeb3JsRpc(createNullContext(), DEVNET_ENDPOINT);

    // When we call an RPC method with positional parameters
    const result = await rpc.call<string>('getHealth', []);

    // Then we get the expected result
    t.is(result, 'ok');
});

test('it calls RPC methods with positional parameters and commitment', async (t) => {
    // Given an RPC client
    const rpc = createWeb3JsRpc(createNullContext(), DEVNET_ENDPOINT);

    // When we call an RPC method with positional parameters and a commitment
    const result = await rpc.call<number>('getBlockHeight', [], { commitment: 'finalized' });

    // Then the call succeeds and returns a result with expected structure
    t.truthy(result);
    t.true(result > 356940296);
});

test('it calls RPC methods with named parameters', async (t) => {
    // Given an RPC client
    const rpc = createWeb3JsRpc(createNullContext(), DEVNET_ENDPOINT);

    // When we call an RPC method with named parameters
    // Note: For Solana RPC, named parameters are handled correctly
    const result = await rpc.call<any, Record<string, any>>('getAsset', { id: 'jMpf59VX9rvweytJcQDe6biP8oJhDKZmibMaWihXrKd' });

    // Then the call succeeds
    t.truthy(result);
    t.true(typeof result === 'object');
    t.true(result.interface === 'V1_NFT');
});

// Test to directly compare positional and named parameter formats
test('it handles both positional and named parameters correctly', async (t) => {
    // Given an RPC client
    const rpc = createWeb3JsRpc(createNullContext(), DEVNET_ENDPOINT);

    // Testing with getAccountInfo method
    const address = '11111111111111111111111111111111';

    // Call with positional parameters
    const resultPositional = await rpc.call(
        'getAccountInfo',
        [address, { encoding: 'base64' }],
        { commitment: 'confirmed' }
    );

    // Call with the same parameters but as named parameters
    const resultNamed = await rpc.call<any, Record<string, any>>(
        'getAccountInfo',
        { address, encoding: 'base64' },
        { commitment: 'confirmed' }
    );

    // Both calls should succeed and return the same result
    t.deepEqual(resultNamed, resultPositional);
}); 