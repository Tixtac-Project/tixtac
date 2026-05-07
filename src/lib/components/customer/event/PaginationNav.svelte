<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page as pageStore } from '$app/state';
  import { Button } from '$lib/components/ui/button/index.js';

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
    goto(resolve(`${url.pathname}${url.search}`), { noScroll: true });
  }
</script>

{#if totalPages > 1}
  <nav
    class="mt-8 flex items-center justify-center gap-1 pb-4 sm:mt-12 sm:gap-1.5"
    aria-label="Phân trang"
  >
    <Button
      variant="outline"
      size="icon"
      onclick={() => navigateToPage(currentPage - 1)}
      disabled={currentPage === 1}
      class="h-8 w-8 rounded-lg sm:h-9 sm:w-9 sm:rounded-xl"
      aria-label="Trang trước"
    >
      <svg class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </Button>

    {#each pageNumbers as num (num)}
      <Button
        variant={num === currentPage ? 'default' : 'outline'}
        size="icon"
        onclick={() => navigateToPage(num)}
        class="h-8 w-8 rounded-lg text-xs sm:h-9 sm:w-9 sm:rounded-xl sm:text-sm"
        aria-label={`Trang ${num}`}
        aria-current={num === currentPage ? 'page' : undefined}
      >
        {num}
      </Button>
    {/each}

    <Button
      variant="outline"
      size="icon"
      onclick={() => navigateToPage(currentPage + 1)}
      disabled={currentPage === totalPages}
      class="h-8 w-8 rounded-lg sm:h-9 sm:w-9 sm:rounded-xl"
      aria-label="Trang tiếp"
    >
      <svg class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </Button>
  </nav>
{/if}
