<script lang="ts">
  import type { CategoryInfo, UserInfo } from '$lib/types/layout';
  import type { Snippet } from 'svelte';
  import CustomerFooter from './CustomerFooter.svelte';
  import CustomerNavbar from './CustomerNavbar.svelte';

  interface Props {
    user?: UserInfo;
    searchQuery?: string;
    categories?: CategoryInfo[];
    children: Snippet;
  }

  let { user, searchQuery = '', categories = [], children }: Props = $props();
</script>

<div class="flex min-h-screen flex-col bg-background text-foreground">
  <CustomerNavbar {user} {searchQuery} {categories} />
  <main class="flex-1">
    {@render children()}
  </main>
  <CustomerFooter />
</div>
