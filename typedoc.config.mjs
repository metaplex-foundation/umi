// The site title shows the published package version. All Umi packages are
// released in lockstep, so the core package stands in for the set; the private
// workspace root's version (what `includeVersion` would use) never moves.
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(
  readFileSync(new URL('./packages/umi/package.json', import.meta.url), 'utf8')
);

/** @type {Partial<import('typedoc').TypeDocOptions>} */
export default {
  name: `Umi — API References - v${version}`,
  includeVersion: false,
};
