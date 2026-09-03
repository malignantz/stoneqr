import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	optimizeDeps: {
		// Lazy chunks that the dependency scanner does not see on first load. Without this Vite
		// discovers them on first use, re-optimises, and the in-flight import fails with
		// "error loading dynamically imported module".
		include: ['@liquid-js/qr-code-styling', 'pdf-lib', 'papaparse', 'fflate']
	}
});
