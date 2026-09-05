/**
 * Write apps/site/static/sitemap.xml with a lastmod per route taken from git.
 *
 *   bun run sitemap
 *
 * Google ignores <priority> and uses <lastmod> when it is consistently truthful, so each date is
 * the last commit that touched the route's own files. The route list is the Open Graph list plus
 * the home page, so a route cannot be drawn without being listed (og.test.ts checks the reverse).
 * deploy.sh runs this before building so the dates are current on every release.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OG_ROUTES } from './og/routes.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://stoneqr.app';

function lastCommitDate(...paths) {
	const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', ...paths], { cwd: root })
		.toString()
		.trim();
	return out || new Date().toISOString().slice(0, 10);
}

const routes = [
	{ path: '/', files: ['apps/site/src/routes/+page.svelte', 'apps/site/src/lib/generator'] },
	...OG_ROUTES.map((r) => ({ path: r.path, files: [`apps/site/src/routes/${r.slug}`] }))
];

const body = routes
	.map(({ path, files }) => `  <url><loc>${SITE}${path}</loc><lastmod>${lastCommitDate(...files)}</lastmod></url>`)
	.join('\n');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
writeFileSync(resolve(root, 'apps/site/static/sitemap.xml'), xml);
console.log(xml);
