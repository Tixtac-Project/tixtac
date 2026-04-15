<script lang="ts">
  import { page } from '$app/state';
  import CustomerLayout from '$lib/components/customer/layout/CustomerLayout.svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();
  let user = $derived(page.data.user);
  let searchQuery = $derived(page.url.searchParams.get('q') ?? '');
  let categories = $derived(page.data.categories ?? []);
</script>

<CustomerLayout {user} {searchQuery} {categories}>
  {@render children()}
</CustomerLayout>
