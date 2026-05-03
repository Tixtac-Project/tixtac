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
  <nav class="mt-12 flex items-center justify-center gap-1.5 pb-4" aria-label="Phân trang">
    <Button
      variant="outline"
      size="default"
      onclick={() => navigateToPage(currentPage - 1)}
      disabled={currentPage === 1}
      class="rounded-xl"
      aria-label="Trang trước"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      <span class="ml-1 hidden md:inline">Trước</span>
    </Button>

    {#each pageNumbers as num (num)}
      <Button
        variant={num === currentPage ? 'default' : 'outline'}
        size="icon"
        onclick={() => navigateToPage(num)}
        class="h-9 w-9 rounded-xl"
        aria-label={`Trang ${num}`}
        aria-current={num === currentPage ? 'page' : undefined}
      >
        {num}
      </Button>
    {/each}

    <Button
      variant="outline"
      size="default"
      onclick={() => navigateToPage(currentPage + 1)}
      disabled={currentPage === totalPages}
      class="rounded-xl"
      aria-label="Trang tiếp"
    >
      <span class="mr-1 hidden md:inline">Tiếp</span>
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </Button>
  </nav>
{/if}
