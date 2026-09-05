import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: undefined,
			precompress: false,
			strict: true
		}),
		prerender: { entries: ['*'] },
		// Measured 2026-09-04: inlining the 12 KB stylesheet (inlineStyleThreshold) made first paint about
		// 150 ms later on simulated mobile and left LCP unchanged, because LCP waits on the preloaded
		// fonts, not the stylesheet. Leave it linked.
		// SvelteKit hashes its own hydration bootstrap and emits a <meta> CSP on prerendered pages.
		// frame-ancestors cannot live in a meta tag, so X-Frame-Options stays in static/_headers.
		csp: {
			mode: 'hash',
			directives: {
				'default-src': ['self'],
				// The sha256 is the mode-stamping inline script in app.html; regenerate it if that script changes.
				'script-src': ['self', 'https://static.cloudflareinsights.com', 'sha256-zd/S3+id9AKhxXpUm1EBy8BKx2Cc+PROi7tBGrONaxQ='],
				'style-src': ['self', 'unsafe-inline'],
				'img-src': ['self', 'data:', 'blob:'],
				'font-src': ['self', 'data:'],
				'connect-src': ['self', 'https://cloudflareinsights.com'],
				'worker-src': ['self', 'blob:'],
				'base-uri': ['self'],
				'form-action': ['self'],
				'object-src': ['none']
			}
		}
	}
};

export default config;
