<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page as pageState } from '$app/state';
  import { Button } from '$lib/components/ui/button';
  import { debounce } from '$lib/utils/debounce';
  import { Calendar, Filter, Search, X } from 'lucide-svelte';

  interface Category {
    id?: number;
    name?: string;
    slug?: string;
    label?: string;
    value?: string;
  }

  interface Filters {
    q: string;
    category: string;
    startDate: string;
    endDate: string;
  }

  interface Props {
    categories: Category[];
    filters: Filters;
    class?: string;
  }

  let { categories = [], filters, class: extraClass = '' }: Props = $props();

  let isMobileOpen = $state(false);
  let keyword = $state('');

  // Sync keyword from URL only on completed navigations (back/forward/popstate).
  $effect(() => {
    const urlQ = pageState.url.searchParams.get('q') ?? '';
    const focused = document.activeElement;
    if (urlQ !== keyword && focused !== desktopSearchEl && focused !== mobileSearchEl) {
      keyword = urlQ;
    }
  });

  function getCategoryName(cat: Category): string {
    return cat.name || cat.label || '';
  }

  function getCategorySlug(cat: Category): string {
    return cat.slug || cat.value || '';
  }

  function updateFilter(key: string, value: string) {
    const url = new URL(pageState.url);
    if (value) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
    url.searchParams.delete('page'); // Reset to page 1 on filter change
    goto(resolve(`${url.pathname}${url.search}`), { keepFocus: true, noScroll: true });
  }

  const debouncedSearch = debounce((value: string) => {
    updateFilter('q', value);
  }, 350);

  function handleKeywordInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    keyword = value;
    debouncedSearch(value);
  }

  function clearAllFilters() {
    goto(resolve('/search'), { keepFocus: true, noScroll: true });
  }

  function toggleMobile() {
    isMobileOpen = !isMobileOpen;
  }

  const hasActiveFilters = $derived(
    filters.q || filters.category || filters.startDate || filters.endDate,
  );

  let desktopSearchEl: HTMLInputElement | undefined = $state();
  let mobileSearchEl: HTMLInputElement | undefined = $state();
</script>

<!-- ═══════ MOBILE FILTER TOGGLE BAR ═══════ -->
<div class="flex items-center gap-3 pb-4 lg:hidden {extraClass}">
  <Button
    variant="outline"
    size="default"
    onclick={toggleMobile}
    class="flex items-center gap-2 rounded-xl border-border bg-surface-container-lowest"
  >
    <Filter class="size-4" />
    Bộ lọc
    {#if hasActiveFilters}
      <span
        class="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground"
      >
        {[filters.q, filters.category, filters.startDate || filters.endDate].filter(Boolean).length}
      </span>
    {/if}
  </Button>

  <!-- Mobile search input (visible when filter not expanded) -->
  <div class="relative flex-1">
    <Search
      class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
    />
    <input
      bind:this={mobileSearchEl}
      type="text"
      value={keyword}
      oninput={handleKeywordInput}
      placeholder="Tìm sự kiện..."
      class="w-full rounded-xl border border-border bg-surface-container-lowest py-2 pr-3 pl-9 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
    />
  </div>
</div>

<!-- ═══════ MOBILE DRAWER OVERLAY ═══════ -->
{#if isMobileOpen}
  <div
    class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
    onclick={toggleMobile}
    onkeydown={(e: KeyboardEvent) => e.key === 'Escape' && toggleMobile()}
    role="presentation"
  ></div>
{/if}

<!-- ═══════ FILTER PANEL (SIDEBAR ON DESKTOP / DRAWER ON MOBILE) ═══════ -->
<aside
  class="{extraClass} {isMobileOpen
    ? 'translate-x-0 shadow-2xl'
    : '-translate-x-full lg:translate-x-0'} fixed top-0 left-0 z-50 h-dvh w-80 overflow-y-auto border-r border-border bg-surface-container-lowest p-6 transition-transform duration-300 ease-(--ease-architectural) lg:sticky lg:top-24 lg:z-0 lg:h-fit lg:rounded-2xl lg:border lg:shadow-sm"
>
  <!-- Mobile close button -->
  <div class="mb-5 flex items-center justify-between lg:hidden">
    <h2 class="text-lg font-bold text-foreground">Bộ lọc</h2>
    <Button variant="ghost" size="icon" onclick={toggleMobile} class="rounded-full">
      <X class="size-5" />
    </Button>
  </div>

  <!-- Desktop title -->
  <h2 class="mb-5 hidden text-lg font-bold text-foreground lg:block">Bộ lọc</h2>

  <!-- Clear all -->
  {#if hasActiveFilters}
    <Button
      variant="ghost"
      size="sm"
      onclick={clearAllFilters}
      class="-mt-2 mb-5 w-full justify-center rounded-xl text-xs text-muted-foreground hover:text-danger"
    >
      <X class="mr-1 size-3" />
      Xóa tất cả bộ lọc
    </Button>
  {/if}

  <div class="flex flex-col gap-6">
    <!-- ═══ SEARCH KEYWORD (desktop) ═══ -->
    <div class="hidden lg:block">
      <label for="desktop-search" class="mb-2 block text-sm font-semibold text-foreground"></label>
      <div class="relative">
        <Search
          class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id="desktop-search"
          bind:this={desktopSearchEl}
          type="text"
          value={keyword}
          oninput={handleKeywordInput}
          placeholder="Nhập từ khoá..."
          class="w-full rounded-xl border border-border bg-surface px-3 py-2.5 pl-9 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
        />
      </div>
    </div>

    <!-- ═══ CATEGORY ═══ -->
    <fieldset>
      <legend class="mb-3 text-sm font-semibold text-foreground">Danh mục</legend>
      <div class="flex flex-col gap-1.5">
        {#each categories as cat, i (getCategorySlug(cat) || `cat-${i}`)}
          {@const slug = getCategorySlug(cat)}
          {@const name = getCategoryName(cat)}
          <label
            class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors {filters.category ===
            slug
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-surface-container-high hover:text-foreground'}"
          >
            <input
              type="radio"
              name="category"
              value={slug}
              checked={filters.category === slug}
              onchange={() => updateFilter('category', slug)}
              class="size-4 accent-primary"
            />
            {name}
          </label>
        {/each}
        {#if filters.category}
          <button
            type="button"
            onclick={() => updateFilter('category', '')}
            class="mt-1 text-left text-xs text-muted-foreground underline hover:text-foreground"
          >
            Bỏ chọn danh mục
          </button>
        {/if}
      </div>
    </fieldset>

    <!-- ═══ DATE RANGE ═══ -->
    <fieldset>
      <legend class="mb-3 text-sm font-semibold text-foreground">
        <Calendar class="mr-1.5 inline size-3.5" />
        Thời gian
      </legend>
      <div class="flex flex-col gap-3">
        <div>
          <label for="start-date" class="mb-1 block text-xs text-muted-foreground">Từ ngày</label>
          <input
            id="start-date"
            type="date"
            value={filters.startDate}
            onchange={(e: Event) => updateFilter('startDate', (e.target as HTMLInputElement).value)}
            class="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground transition-colors outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <div>
          <label for="end-date" class="mb-1 block text-xs text-muted-foreground">Đến ngày</label>
          <input
            id="end-date"
            type="date"
            value={filters.endDate}
            onchange={(e: Event) => updateFilter('endDate', (e.target as HTMLInputElement).value)}
            class="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground transition-colors outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
          />
        </div>
      </div>
    </fieldset>
  </div>
</aside>
