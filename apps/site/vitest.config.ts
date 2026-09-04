import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Unit tests for the site's own pure modules (the frame wrapper, and anything else that is
 * string or number work rather than DOM work). SvelteKit's plugin is deliberately not loaded:
 * these tests run in Node and must not need a browser or a built app.
 */
export default defineConfig({
	test: { include: ['test/**/*.test.ts'] },
	resolve: {
		alias: { $lib: fileURLToPath(new URL('./src/lib', import.meta.url)) }
	}
});
