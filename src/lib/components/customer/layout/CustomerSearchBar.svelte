<script lang="ts">
  import { page } from '$app/stores';
  import { Input } from '$lib/components/ui/input';

  let searchQuery = $derived($page.url.searchParams.get('q') ?? '');
</script>

<form action="/" method="GET" class="navbar-search">
  <svg class="search-icon" viewBox="0 0 24 24">
    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>

  <Input
    type="text"
    name="q"
    value={searchQuery}
    aria-label="Tìm kiếm sự kiện"
    placeholder="Tìm kiếm..."
    class="pl-10"
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
    pointer-events: none;
    z-index: 10;
  }
</style>
