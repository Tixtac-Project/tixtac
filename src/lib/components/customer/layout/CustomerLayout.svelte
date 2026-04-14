<script lang="ts">
  import CustomerFooter from './CustomerFooter.svelte';
  import CustomerNavbar from './CustomerNavbar.svelte';

  interface Users {
    id: number;
    role: 'admin' | 'customer';
  }

  interface Props {
    user?: Users;
    searchQuery?: string;
  }

  let { user, searchQuery = '' }: Props = $props();
</script>

<div class="flex min-h-screen flex-col bg-white text-slate-900">
  <CustomerNavbar {user} {searchQuery} />
  <main class="mx-auto w-full max-w-7xl flex-1 px-6 py-10 sm:px-6 sm:py-12">
    <slot />
  </main>
  <CustomerFooter />
</div>
