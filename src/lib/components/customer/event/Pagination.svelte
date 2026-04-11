<script lang="ts">
  import { Button } from '$lib/components/ui/button';

  let { currentPage, totalPages, buildPageUrl } = $props<{
    currentPage: number;
    totalPages: number;
    searchQuery: string;
    buildPageUrl: (page: number) => string;
  }>();

  let pageNumbers = $derived(Array.from({ length: totalPages }, (_, i) => i + 1));
</script>

<nav class="pagination" aria-label="Phân trang">
  <!-- Prev -->
  <Button
    href={buildPageUrl(currentPage - 1)}
    variant="outline"
    size="sm"
    disabled={currentPage === 1}
    id="pagination-prev"
  >
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
    </svg>
    Trước
  </Button>

  <!-- Page numbers -->
  {#each pageNumbers as num (num)}
    <Button
      href={buildPageUrl(num)}
      variant={num === currentPage ? 'default' : 'outline'}
      size="sm"
      id="pagination-page-{num}"
    >
      {num}
    </Button>
  {/each}

  <!-- Next -->
  <Button
    href={buildPageUrl(currentPage + 1)}
    variant="outline"
    size="sm"
    disabled={currentPage === totalPages}
    id="pagination-next"
  >
    Tiếp
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
  </Button>
</nav>

<style>
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 48px;
    padding-bottom: 16px;
  }
</style>
