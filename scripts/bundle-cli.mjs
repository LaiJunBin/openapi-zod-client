// Bundles the CLI into lib/cli/bundle/ as a single self-contained file so that
// consumers (the frontend repo) can run it with plain `node` without installing
// this monorepo's dependencies.
//
// Usage: pnpm install && node scripts/bundle-cli.mjs
// Commit the regenerated lib/cli/bundle/ whenever lib/src changes.
import { build } from 'esbuild';
import { cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';

const OUT = 'lib/cli/bundle/index.cjs';

rmSync('lib/cli/bundle', { recursive: true, force: true });

await build({
	entryPoints: ['lib/src/cli.ts'],
	bundle: true,
	platform: 'node',
	format: 'cjs',
	target: 'node18',
	outfile: OUT,
	logLevel: 'warning'
});

// The sources read files relative to __dirname at runtime:
// - cli.ts reads ../../package.json — from lib/cli/bundle/ this resolves to
//   lib/package.json, same as the original lib/cli/dist/ location, so it is
//   left untouched.
// - generateZodClientFromOpenAPI.ts reads ../src/templates/*.hbs — rewrite to
//   ./templates/ and ship the templates next to the bundle.
let src = readFileSync(OUT, 'utf8');
const hits = (src.match(/\.\.\/src\/templates\//g) || []).length;
if (hits === 0) throw new Error('template path pattern not found — source layout changed, update this script');
src = src.split('../src/templates/').join('./templates/');
writeFileSync(OUT, src);
cpSync('lib/src/templates', 'lib/cli/bundle/templates', { recursive: true });

console.log(`bundled ${OUT} (${hits} template path(s) rewritten)`);
