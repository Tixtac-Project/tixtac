import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { queueStore } from '$lib/stores/queue.svelte';
import { toast } from '$lib/stores/toast';

/**
 * Shared logout — clear cookie & queue slot,
 * optimistically clears client-side queue state, then redirects home.
 */
export async function handleLogout() {
  // Optimistic client-side cleanup — server already did this, but clears UI instantly
  queueStore.clear();
  toast.success('Đăng xuất thành công!');
  await goto(resolve('/'), { invalidateAll: true });
}
