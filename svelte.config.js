import adapter from 'svelte-adapter-bun';

const isDev = process.env.NODE_ENV === 'development';

// ── Derive allowed connect-src origins from VITE_API_URL ──
const apiUrl = process.env.VITE_API_URL || '';
/** @type {Array<string>} */
const connectSrc = ['self'];
if (apiUrl) {
  try {
    const origin = new URL(apiUrl).origin;
    if (origin && origin !== 'null') {
      connectSrc.push(origin);
    }
  } catch {
    // Not a valid absolute URL — 'self' is sufficient
  }
}

// Dev CSP relaxations — Vite HMR uses WebSocket and blob workers
if (isDev) {
  connectSrc.push('ws:', 'wss:');
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
  compilerOptions: {
    runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true),
  },
  kit: {
    adapter: adapter(),
    alias: {
      '@/*': './path/to/lib/*',
    },
    csp: {
      directives: {
        'default-src': ['self'],
        'script-src': isDev ? ['self', 'unsafe-eval'] : ['self'],
        'style-src': ['self', 'unsafe-inline'],
        'img-src': ['self', 'https:', 'data:'],
        'font-src': ['self'],
        'connect-src': connectSrc,
        ...(isDev ? { 'worker-src': ['self', 'blob:'] } : {}),
        'frame-src': ['none'],
        'object-src': ['none'],
        'base-uri': ['self'],
        'form-action': ['self'],
      },
    },
  },
};

export default config;
