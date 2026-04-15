<script lang="ts">
  import type { Snippet } from 'svelte';
  import CustomerFooter from './CustomerFooter.svelte';
  import CustomerNavbar from './CustomerNavbar.svelte';

  interface Users {
    id: number;
    role: 'admin' | 'customer';
  }

  interface Category {
    id: number;
    name: string;
    slug: string;
  }

  interface Props {
    user?: Users;
    searchQuery?: string;
    categories?: Category[];
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
