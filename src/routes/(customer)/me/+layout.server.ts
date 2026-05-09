import type { RequestEvent } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
export const load: LayoutServerLoad = async ({ fetch, locals, url }: RequestEvent) => {
  if (!locals.user) {
    throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
  }

  // Fetch profile once for sidebar (name, email) — non-critical
  let profile = null;
  try {
    const res = await fetch('/api/me/profile');
    if (res.ok) {
      const json = await res.json();
      profile = json.data;
    }
  } catch {
    // sidebar shows fallback
  }

  return { user: locals.user, profile };
};
