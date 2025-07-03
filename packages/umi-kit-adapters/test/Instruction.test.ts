import test from 'ava';
import { getSetComputeUnitLimitInstruction } from '@solana-program/compute-budget';
import { mplToolbox, setComputeUnitLimit } from '@metaplex-foundation/mpl-toolbox';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { fromKitInstruction, toKitInstruction } from '../src';

test('fromKitInstruction converts KitInstruction to umi Instruction', (t) => {
    const umi = createUmi("http://localhost:8899").use(mplToolbox());
    const kitBudgetIx = getSetComputeUnitLimitInstruction({ units: 500 });
    const umiConvertedIx = fromKitInstruction(kitBudgetIx);
    const umiBudgetIx = setComputeUnitLimit(umi, { units: 500 }).getInstructions()[0];
    t.deepEqual(umiBudgetIx, umiConvertedIx);
});

test('toKitInstruction converts umi Instruction to KitInstruction', (t) => {
    const umi = createUmi("http://localhost:8899").use(mplToolbox());
    const umiBudgetIx = setComputeUnitLimit(umi, { units: 500 }).getInstructions()[0];
    const kitConvertedIx = toKitInstruction(umiBudgetIx);
    const kitBudgetIx = getSetComputeUnitLimitInstruction({ units: 500 });
    t.deepEqual(kitBudgetIx, kitConvertedIx);
}); 