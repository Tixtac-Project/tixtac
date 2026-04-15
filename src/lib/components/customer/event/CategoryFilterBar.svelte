<script lang="ts">
  import { goto } from '$app/navigation';
  import { page as pageState } from '$app/state';

  interface Category {
    id?: number;
    label?: string;
    name?: string;
    value?: string;
    slug?: string;
  }

  interface Props {
    categories: Category[];
    activeCategory: string;
  }

  let { categories, activeCategory = $bindable() }: Props = $props();

  function getCategorySlug(cat: Category): string {
    return cat.slug || cat.value || '';
  }

  function getCategoryLabel(cat: Category): string {
    return cat.label || cat.name || '';
  }

  function handleSelectCategory(slug: string) {
    activeCategory = slug;
    const url = new URL(pageState.url);
    if (slug) {
      url.searchParams.set('category', slug);
    } else {
      url.searchParams.delete('category');
    }
    // Reset to page 1 when changing category
    url.searchParams.delete('page');
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    goto(`${url.pathname}${url.search}`, { keepFocus: true, noScroll: true });
  }
</script>

<div class="no-scrollbar flex w-full items-center overflow-x-auto">
  <ul class="flex h-full min-w-max items-center gap-6 md:gap-8">
    <li>
      <button
        type="button"
        onclick={() => handleSelectCategory('')}
        class="relative flex h-14 items-center text-[15px] font-semibold tracking-wide whitespace-nowrap transition-colors duration-200 {activeCategory ===
        ''
          ? 'text-primary'
          : 'text-foreground hover:text-primary'}"
      >
        Tất cả
        {#if activeCategory === ''}
          <div class="absolute bottom-0 left-0 h-[3px] w-full rounded-t-md bg-primary"></div>
        {/if}
      </button>
    </li>

    {#each categories as cat (getCategorySlug(cat))}
      <li>
        <button
          type="button"
          onclick={() => handleSelectCategory(getCategorySlug(cat))}
          class="relative flex h-14 items-center text-[15px] font-semibold tracking-wide whitespace-nowrap transition-colors duration-200 {activeCategory ===
          getCategorySlug(cat)
            ? 'text-primary'
            : 'text-foreground hover:text-primary'}"
        >
          {getCategoryLabel(cat)}
          {#if activeCategory === getCategorySlug(cat)}
            <div class="absolute bottom-0 left-0 h-[3px] w-full rounded-t-md bg-primary"></div>
          {/if}
        </button>
      </li>
    {/each}
  </ul>
</div>

<style>
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
