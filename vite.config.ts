import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const file = fileURLToPath(new URL('package.json', import.meta.url));
const json = JSON.parse(readFileSync(file, 'utf8'));
export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    host: true,
    strictPort: true,
    hmr: {
      host: 'localhost',
      protocol: 'wss',
    },
    warmup: {
      clientFiles: ['./src/routes/**/*.svelte', './src/lib/components/**/*.svelte'],
    },
  },
  optimizeDeps: {
    include: ['lucide-svelte', 'motion-sv', 'clsx', 'tailwind-merge'],
  },
  define: {
    __APP_VERSION__: JSON.stringify(json.version),
  },
});
