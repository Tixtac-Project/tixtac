<script lang="ts">

  interface Props {
    currentPage: number;
    totalPages: number;
    searchQuery?: string;
    onPageChange?: (page: number) => void;
    baseUrl?: string;
  }

  let {
    currentPage,
    totalPages,
    searchQuery = '',
    onPageChange,
    baseUrl = '?page=',
  }: Props = $props();

  const pageNumbers = $derived(Array.from({ length: totalPages }, (_, i) => i + 1));

  function buildUrl(page: number): string {
    const query = searchQuery ? `&q=${searchQuery}` : '';
    return `${baseUrl}${page}${query}`;
  }

  function handlePageChange(page: number) {
    if (onPageChange) {
      onPageChange(page);
    }
  }
</script>

{#if totalPages > 1}
  <nav class="mt-12 flex items-center justify-center gap-1.5 pb-4" aria-label="Phân trang">
    <!-- Previous -->
    <a
      href={buildUrl(currentPage - 1)}
      onclick={(e) => {
        if (currentPage === 1) {
          e.preventDefault();
        } else if (onPageChange) {
          e.preventDefault();
          handlePageChange(currentPage - 1);
        }
      }}
      class={`inline-flex items-center gap-1 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all duration-200
        ${
          currentPage === 1
            ? 'pointer-events-none cursor-not-allowed opacity-40'
            : 'border-slate-300 bg-white text-slate-700 hover:border-purple-600 hover:text-purple-600'
        }
      `}
      aria-disabled={currentPage === 1}
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      <span class="hidden sm:inline">Trước</span>
    </a>

    <!-- Page numbers -->
    {#each pageNumbers as num (num)}
      <a
        href={buildUrl(num)}
        onclick={(e) => {
          if (onPageChange) {
            e.preventDefault();
            handlePageChange(num);
          }
        }}
        class={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium transition-all duration-200
          ${
            num === currentPage
              ? 'border-purple-600 bg-purple-600 text-white shadow-md'
              : 'border-slate-300 bg-white text-slate-700 hover:border-purple-600 hover:text-purple-600'
          }
        `}
      >
        {num}
      </a>
    {/each}

    <!-- Next -->
    <a
      href={buildUrl(currentPage + 1)}
      onclick={(e) => {
        if (currentPage === totalPages) {
          e.preventDefault();
        } else if (onPageChange) {
          e.preventDefault();
          handlePageChange(currentPage + 1);
        }
      }}
      class={`inline-flex items-center gap-1 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all duration-200
        ${
          currentPage === totalPages
            ? 'pointer-events-none cursor-not-allowed opacity-40'
            : 'border-slate-300 bg-white text-slate-700 hover:border-purple-600 hover:text-purple-600'
        }
      `}
      aria-disabled={currentPage === totalPages}
    >
      <span class="hidden sm:inline">Tiếp</span>
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </a>
  </nav>
{/if}
