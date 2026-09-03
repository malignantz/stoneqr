// Fails when the JavaScript referenced by the generator page exceeds the plan's budget (150 KB gzipped).
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';

const BUDGET = 150 * 1024;
const build = resolve(process.argv[2] ?? 'apps/site/build');
const html = readFileSync(resolve(build, 'index.html'), 'utf8');
const refs = [...new Set([...html.matchAll(/(?:href|src)="([^"]+\.js)"/g)].map((m) => m[1]))];
let total = 0;
for (const ref of refs) {
	const file = resolve(build, ref.replace(/^\.?\//, ''));
	if (!existsSync(file)) continue;
	const size = gzipSync(readFileSync(file)).length;
	total += size;
	console.log(String(size).padStart(8), ref);
}
console.log(`\nInitial JS for /: ${(total / 1024).toFixed(1)} KB gzipped (budget ${BUDGET / 1024} KB)`);
if (total > BUDGET) {
	console.error('Budget exceeded');
	process.exit(1);
}
