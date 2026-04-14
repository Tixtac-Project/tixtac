// Step 1 page server load is now handled by the shared +layout.server.ts.
// This file can remain empty or be removed — SvelteKit will use layout data.
// Keeping it to avoid import errors in case any component references PageServerLoad.

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  // All data (categories, event) comes from the layout load.
  return {};
};
