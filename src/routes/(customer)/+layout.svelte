<script lang="ts">
  import { page } from '$app/stores';
  import type { Snippet } from 'svelte';

  import CustomerFooter from '$lib/components/customer/layout/CustomerFooter.svelte';
  import CustomerNavbar from '$lib/components/customer/layout/CustomerNavbar.svelte';

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();
  let user = $derived($page.data.user);
</script>

<div class="tixtac-root">
  <CustomerNavbar {user} />

  <main class="main-content">
    {@render children()}
  </main>

  <CustomerFooter />
</div>
🧭 2️⃣ Navbar.

<style>
  :global(:root) {
    --color-bg: #ffffff;
    --color-surface: #f8fafc;
    --color-card: #ffffff;
    --color-border: #e2e8f0;
    --color-primary: #4f46e5;
    --color-text: #0f172a;
    --color-muted: #94a3b8;
    --color-muted-strong: #475569;
    --radius-pill: 999px;
    --font-main: 'Inter', system-ui, sans-serif;
  }

  :global(body) {
    margin: 0;
    font-family: var(--font-main);
    background: var(--color-bg);
    color: var(--color-text);
  }

  .tixtac-root {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .main-content {
    flex: 1;
    max-width: 1280px;
    margin: 0 auto;
    padding: 40px 24px 64px;
  }
</style>
