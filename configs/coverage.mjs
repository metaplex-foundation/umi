#!/usr/bin/env node
/**
 * Runs each package's AVA test suite under c8 and aggregates the
 * per-package coverage summaries into a single repo-wide table.
 *
 * Usage:
 *   pnpm test:coverage                 # all packages with tests
 *   pnpm test:coverage umi umi-tasks   # only the given package dirs
 *
 * Coverage is measured on the compiled test build (dist/test/src) and
 * remapped to the TypeScript sources through the tsc source maps, so
 * packages must be built (`pnpm build`) before running this script.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packagesDir = join(root, 'packages');
const c8Bin = join(root, 'node_modules', '.bin', 'c8');
const filters = process.argv.slice(2);

const packages = readdirSync(packagesDir)
  .filter((name) => {
    if (filters.length > 0 && !filters.includes(name)) return false;
    const dir = join(packagesDir, name);
    if (!existsSync(join(dir, 'package.json'))) return false;
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    if (!pkg.scripts?.test?.includes('ava')) return false;
    return (
      existsSync(join(dir, 'test')) &&
      readdirSync(join(dir, 'test')).some((f) => f.endsWith('.test.ts'))
    );
  })
  .sort();

if (packages.length === 0) {
  console.error('No matching packages with AVA tests found.');
  process.exit(1);
}

const results = [];
for (const name of packages) {
  const dir = join(packagesDir, name);
  if (!existsSync(join(dir, 'dist', 'test'))) {
    results.push({ name, status: 'not built' });
    continue;
  }
  process.stdout.write(`\n── ${name} ──\n`);
  const run = spawnSync(
    c8Bin,
    [
      '--all',
      '--include',
      'dist/test/src/**/*.js',
      '--reporter=text-summary',
      '--reporter=json-summary',
      '--report-dir',
      'coverage',
      'pnpm',
      'test',
    ],
    { cwd: dir, stdio: ['ignore', 'inherit', 'inherit'] }
  );
  const summaryPath = join(dir, 'coverage', 'coverage-summary.json');
  const summary = existsSync(summaryPath)
    ? JSON.parse(readFileSync(summaryPath, 'utf8')).total
    : undefined;
  results.push({
    name,
    status: run.status === 0 ? 'pass' : 'FAIL',
    summary,
  });
}

const pct = (metric) =>
  metric && metric.total > 0
    ? `${((metric.covered / metric.total) * 100).toFixed(1)}%`
    : '—';
const totals = { statements: [0, 0], branches: [0, 0], functions: [0, 0] };
for (const { summary } of results) {
  if (!summary) continue;
  for (const key of Object.keys(totals)) {
    totals[key][0] += summary[key].covered;
    totals[key][1] += summary[key].total;
  }
}

console.log('\n\nRepo coverage summary');
console.log('─'.repeat(78));
console.log(
  `${'package'.padEnd(36)} ${'stmts'.padStart(8)} ${'branch'.padStart(8)} ${'funcs'.padStart(8)}  status`
);
console.log('─'.repeat(78));
for (const { name, status, summary } of results) {
  console.log(
    `${name.padEnd(36)} ${pct(summary?.statements).padStart(8)} ${pct(
      summary?.branches
    ).padStart(8)} ${pct(summary?.functions).padStart(8)}  ${status}`
  );
}
console.log('─'.repeat(78));
const totalPct = ([covered, total]) =>
  total > 0 ? `${((covered / total) * 100).toFixed(1)}%` : '—';
console.log(
  `${'TOTAL'.padEnd(36)} ${totalPct(totals.statements).padStart(8)} ${totalPct(
    totals.branches
  ).padStart(8)} ${totalPct(totals.functions).padStart(8)}`
);

const failed = results.filter((r) => r.status === 'FAIL');
if (failed.length > 0) {
  console.error(`\nFailing packages: ${failed.map((r) => r.name).join(', ')}`);
  process.exit(1);
}
