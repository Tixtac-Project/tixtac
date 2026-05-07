import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { toast } from '$lib/stores/toast';

/** Shared logout — shows success toast, clears session, redirects to home */
export async function handleLogout() {
  toast.success('Đăng xuất thành công!');
  await goto(resolve('/'), { invalidateAll: true });
}
