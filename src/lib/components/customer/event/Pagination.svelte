<script lang="ts">
  let { currentPage, totalPages, searchQuery, buildPageUrl } = $props<{
    currentPage: number;
    totalPages: number;
    searchQuery: string;
    buildPageUrl: (page: number) => string;
  }>();

  let pageNumbers = $derived(Array.from({ length: totalPages }, (_, i) => i + 1));
</script>

<nav class="pagination" aria-label="Phân trang">
  <!-- Prev -->
  <a
    href={buildPageUrl(currentPage - 1)}
    class="page-btn {currentPage === 1 ? 'disabled' : ''}"
    id="pagination-prev"
    aria-disabled={currentPage === 1}
  >
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
    </svg>
    Trước
  </a>

  <!-- Page numbers -->
  {#each pageNumbers as num (num)}
    <a
      href={buildPageUrl(num)}
      class="page-btn {num === currentPage ? 'active' : ''}"
      id="pagination-page-{num}"
    >
      {num}
    </a>
  {/each}

  <!-- Next -->
  <a
    href={buildPageUrl(currentPage + 1)}
    class="page-btn {currentPage === totalPages ? 'disabled' : ''}"
    id="pagination-next"
    aria-disabled={currentPage === totalPages}
  >
    Tiếp
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
  </a>
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
  .page-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 8px 14px;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    background: var(--color-card);
    color: var(--color-muted-strong);
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s;
    text-decoration: none;
  }
  .page-btn:hover:not(.disabled) {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }
  .page-btn.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
  }
  .page-btn.disabled {
    opacity: 0.35;
    cursor: not-allowed;
    pointer-events: none;
  }
</style>
