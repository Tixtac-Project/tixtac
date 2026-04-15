<script lang="ts">
  import { goto } from '$app/navigation';
  import { page as pageStore } from '$app/state';

  interface Props {
    currentPage: number;
    totalPages: number;
    searchQuery?: string;
    onPageChange?: (page: number) => void;
  }

  let { currentPage, totalPages, searchQuery = '', onPageChange }: Props = $props();

  const pageNumbers = $derived(Array.from({ length: totalPages }, (_, i) => i + 1));

  function navigateToPage(pageNum: number) {
    if (onPageChange) {
      onPageChange(pageNum);
      return;
    }
    const url = new URL(pageStore.url);
    url.searchParams.set('page', String(pageNum));
    if (searchQuery) {
      url.searchParams.set('q', searchQuery);
    } else {
      url.searchParams.delete('q');
    }
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    goto(`${url.pathname}${url.search}`, { noScroll: true });
  }
</script>

{#if totalPages > 1}
  <nav class="mt-12 flex items-center justify-center gap-1.5 pb-4" aria-label="Phân trang">
    <!-- Previous -->
    <button
      type="button"
      onclick={() => navigateToPage(currentPage - 1)}
      disabled={currentPage === 1}
      class={`inline-flex items-center gap-1 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all duration-200
        ${
          currentPage === 1
            ? 'cursor-not-allowed border-border bg-card opacity-40'
            : 'border-border bg-card text-foreground hover:border-primary hover:text-primary'
        }
      `}
      aria-label="Trang trước"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      <span class="hidden sm:inline">Trước</span>
    </button>

    <!-- Page numbers -->
    {#each pageNumbers as num (num)}
      <button
        type="button"
        onclick={() => navigateToPage(num)}
        class={`inline-flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-medium transition-all duration-200
          ${
            num === currentPage
              ? 'border-primary bg-primary text-primary-foreground shadow-md'
              : 'border-border bg-card text-foreground hover:border-primary hover:text-primary'
          }
        `}
        aria-label={`Trang ${num}`}
        aria-current={num === currentPage ? 'page' : undefined}
      >
        {num}
      </button>
    {/each}

    <!-- Next -->
    <button
      type="button"
      onclick={() => navigateToPage(currentPage + 1)}
      disabled={currentPage === totalPages}
      class={`inline-flex items-center gap-1 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all duration-200
        ${
          currentPage === totalPages
            ? 'cursor-not-allowed border-border bg-card opacity-40'
            : 'border-border bg-card text-foreground hover:border-primary hover:text-primary'
        }
      `}
      aria-label="Trang tiếp"
    >
      <span class="hidden sm:inline">Tiếp</span>
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </nav>
{/if}
