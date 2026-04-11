<script lang="ts">
  import AuthNav from './AuthNav.svelte';
  import CustomerSearchBar from './CustomerSearchBar.svelte';
  import Logo from './Logo.svelte';

  let { user } = $props();
</script>

<header class="navbar">
  <div class="navbar-inner">
    <Logo />
    <CustomerSearchBar />
    <AuthNav {user} />
  </div>
</header>

<style>
  .navbar {
    position: sticky;
    top: 0;
    z-index: 100;
    background: white;
    border-bottom: 1px solid var(--color-border);
  }

  .navbar-inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 8px 24px;
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }
</style>
