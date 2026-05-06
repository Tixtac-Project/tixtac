<script lang="ts">
  import { navigating } from '$app/state';
  import EmptyState from '$lib/components/customer/event/EmptyState.svelte';
  import EventsGrid from '$lib/components/customer/event/EventsGrid.svelte';
  import PaginationNav from '$lib/components/customer/event/PaginationNav.svelte';
  import SectionHeader from '$lib/components/customer/event/SectionHeader.svelte';
  import SearchFilterSidebar from '$lib/components/customer/search/SearchFilterSidebar.svelte';
  import type { EventListItem } from '$lib/types/event-detail';

  interface Pagination {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  }

  interface Filters {
    q: string;
    category: string;
    startDate: string;
    endDate: string;
  }

  interface PageData {
    categories: { id: number; name: string; slug: string }[];
    events: EventListItem[];
    pagination: Pagination;
    filters: Filters;
  }

  let { data } = $props<{ data: PageData }>();

  let events = $derived(data.events);
  let categories = $derived(data.categories);
  let pagination = $derived(data.pagination);
  let filters = $derived(data.filters);

  // Show skeleton loading only during active navigations.
  let isLoading = $derived(navigating.to !== null);
</script>

<svelte:head>
  <title>TixTac - Tìm kiếm sự kiện</title>
  <meta
    name="description"
    content="Tìm kiếm sự kiện concert, festival, thể thao trên TixTac. Lọc theo danh mục, thời gian và từ khóa."
  />
</svelte:head>

<div class="min-h-dvh bg-surface">
  <div class="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10 lg:py-12">
    <div class="flex flex-col gap-8 lg:flex-row lg:gap-10">
      <!-- ═══════ SIDEBAR: Filters ═══════ -->
      <SearchFilterSidebar {categories} {filters} class="lg:w-72 lg:shrink-0" />

      <!-- ═══════ MAIN CONTENT: Results ═══════ -->
      <div class="min-w-0 flex-1">
        <SectionHeader
          title={filters.q ? `Kết quả cho "${filters.q}"` : 'Tất cả sự kiện'}
          variant="default"
        />

        <!-- Result count -->
        <p class="-mt-4 mb-6 text-sm text-muted-foreground">
          {#if isLoading}
            Đang tìm kiếm...
          {:else if pagination.totalItems === 0}
            Không tìm thấy sự kiện nào
          {:else}
            Tìm thấy <span class="font-semibold text-foreground">{pagination.totalItems}</span>
            sự kiện phù hợp
          {/if}
        </p>

        {#if isLoading}
          <!-- ═══ SKELETON LOADING ═══ -->
          <div class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {#each Array(6) as _, i (i)}
              <div
                class="bento-card animate-pulse overflow-hidden border-0 bg-surface-container-lowest p-0"
              >
                <div class="h-48 bg-surface-container-high"></div>
                <div class="space-y-3 p-5">
                  <div class="h-4 w-20 rounded-md bg-surface-container-high"></div>
                  <div class="h-5 w-3/4 rounded-md bg-surface-container-high"></div>
                  <div class="flex gap-3">
                    <div class="h-14 w-14 rounded-md bg-surface-container-high"></div>
                    <div class="flex-1 space-y-2">
                      <div class="h-3 w-full rounded bg-surface-container-high"></div>
                      <div class="h-3 w-2/3 rounded bg-surface-container-high"></div>
                    </div>
                  </div>
                  <div class="flex items-center justify-between border-t border-border pt-3">
                    <div class="h-5 w-16 rounded-md bg-surface-container-high"></div>
                    <div class="h-8 w-24 rounded-md bg-surface-container-high"></div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {:else if pagination.totalItems === 0}
          <!-- ═══ EMPTY STATE ═══ -->
          <EmptyState
            icon="🔍"
            title="Không tìm thấy sự kiện nào"
            description="Không có sự kiện nào phù hợp với bộ lọc của bạn. Hãy thử thay đổi từ khóa hoặc bộ lọc."
            ctaLabel="Xóa bộ lọc"
            ctaHref="/search"
          />
        {:else}
          <!-- ═══ EVENT RESULTS ═══ -->
          <EventsGrid {events} variant="compact" />

          <PaginationNav currentPage={pagination.currentPage} totalPages={pagination.totalPages} />
        {/if}
      </div>
    </div>
  </div>
</div>
