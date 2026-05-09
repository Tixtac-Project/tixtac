<script lang="ts">
  import { page } from '$app/state';
  import CustomerLayout from '$lib/components/customer/layout/CustomerLayout.svelte';
  import QueueWidget from '$lib/components/customer/queue/QueueWidget.svelte';
  import { queueStore } from '$lib/stores/queue.svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();
  let user = $derived(page.data.user);
  let searchQuery = $derived(page.url.searchParams.get('q') ?? '');
  let categories = $derived(page.data.categories ?? []);

  // Khởi tạo store một lần duy nhất ở đây — phục hồi từ localStorage
  queueStore.init();
</script>

<CustomerLayout {user} {searchQuery} {categories}>
  {@render children()}
</CustomerLayout>

<!-- Floating Widget — luôn hiện bất kể ở trang nào trong customer layout -->
<QueueWidget />
