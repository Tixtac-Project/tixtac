<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/stores';

  let searchQuery = $derived($page.url.searchParams.get('q') ?? '');
</script>

<form action={resolve('/')} method="GET" class="navbar-search">
  <svg class="search-icon" viewBox="0 0 24 24">
    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>

  <input
    type="text"
    name="q"
    value={searchQuery}
    aria-label="Tìm kiếm sự kiện"
    placeholder="Tìm kiếm..."
    class="search-input"
  />
</form>

<style>
  .navbar-search {
    flex: 1;
    max-width: 480px;
    position: relative;
  }

  .search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    color: var(--color-muted);
  }

  .search-input {
    width: 100%;
    padding: 10px 16px 10px 42px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--color-border);
    outline: none;
  }

  .search-input:focus {
    border-color: var(--color-primary);
  }
</style>
