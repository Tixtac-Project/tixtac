<script lang="ts">
  import EmptyState from '$lib/components/customer/event/EmptyState.svelte';
  import EventsGrid from '$lib/components/customer/event/EventsGrid.svelte';
  import PaginationNav from '$lib/components/customer/event/PaginationNav.svelte';
  import SectionHeader from '$lib/components/customer/event/SectionHeader.svelte';

  interface EventItem {
    id: number;
    title: string;
    venue: string;
    bannerImageUrl?: string | null;
    categoryName?: string | null;
    categorySlug?: string | null;
    earliestShowDate?: string | null;
    min_price: number;
    totalSeats?: number;
    availableSeats?: number;
  }

  interface Pagination {
    currentPage: number;
    totalPages: number;
    searchQuery: string;
    categorySlug: string;
  }

  let { data } = $props<{
    data: {
      categories: { id: number; name: string; slug: string }[];
      events: EventItem[];
      pagination: Pagination;
    };
  }>();

  let events = $derived(data.events);
  let pagination = $derived(data.pagination);
</script>

<svelte:head>
  <title>TixTac - Tất cả sự kiện</title>
  <meta
    name="description"
    content="Khám phá tất cả sự kiện concert, festival, thể thao trên TixTac. Đặt vé nhanh chóng, bảo mật."
  />
</svelte:head>

<div class="min-h-dvh bg-surface">
  <!-- Events Listing -->
  <section class="mx-auto max-w-7xl px-4 py-8 sm:py-12 md:px-6 md:py-16 lg:py-20" id="events">
    <SectionHeader
      title="Tất cả sự kiện"
      searchQuery={pagination.searchQuery}
      viewAllHref={undefined}
    />

    {#if events.length === 0}
      <EmptyState
        title="Không tìm thấy sự kiện nào!"
        description="Hãy thử tìm kiếm với từ khóa khác hoặc chọn danh mục khác."
        ctaLabel="Xóa bộ lọc"
        ctaHref="/events"
      />
    {:else}
      <EventsGrid {events} />

      <PaginationNav
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        searchQuery={pagination.searchQuery}
      />
    {/if}
  </section>
</div>
