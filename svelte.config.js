import adapter from 'svelte-adapter-bun';

// ── Derive allowed connect-src origins from VITE_API_URL ──
// If VITE_API_URL is set to an external origin (e.g. https://api.example.com),
// we must include it in connect-src so the browser CSP doesn't block fetch requests.
const apiUrl = process.env.VITE_API_URL || '';
const connectSrc =
  /** @type {Array<import('@sveltejs/kit').CspDirectives['connect-src']>[number]>} */ (['self']);
if (apiUrl) {
  try {
    const origin = new URL(apiUrl).origin; // e.g. "https://api.example.com"
    if (origin && origin !== 'null') {
      connectSrc.push(origin);
    }
  } catch {
    // Not a valid absolute URL (e.g. "/api") — 'self' is sufficient
  }
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
  compilerOptions: {
    // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
    runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true),
  },
  kit: {
    // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
    // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
    // See https://svelte.dev/docs/kit/adapters for more information about adapters.
    adapter: adapter(),
    alias: {
      '@/*': './path/to/lib/*',
    },
    csp: {
      directives: {
        'default-src': ['self'],
        'script-src': ['self'],
        'style-src': ['self', 'unsafe-inline'],
        'img-src': ['self', 'https:', 'data:'],
        'font-src': ['self'],
        'connect-src': connectSrc,
        'frame-src': ['none'],
        'object-src': ['none'],
        'base-uri': ['self'],
        'form-action': ['self'],
      },
    },
  },
};

export default config;
