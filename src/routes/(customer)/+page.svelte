<script lang="ts">
  import EmptyState from '$lib/components/customer/event/EmptyState.svelte';
  import EventBannerCarousel from '$lib/components/customer/event/EventBannerCarousel.svelte';
  import EventsGrid from '$lib/components/customer/event/EventsGrid.svelte';
  import PaginationNav from '$lib/components/customer/event/PaginationNav.svelte';
  import SectionHeader from '$lib/components/customer/event/SectionHeader.svelte';

  // Interface for Event data
  interface Event {
    id: number;
    title: string;
    eventDate: string | Date;
    venue: string;
    bannerImageUrl?: string;
    min_price: number | string;
  }

  // Interface for Pagination data
  interface Pagination {
    currentPage: number;
    totalPages: number;
    searchQuery: string;
  }

  // Dữ liệu từ +page.server.ts
  let { data } = $props<{
    data: {
      featuredEvents: Event[];
      events: Event[];
      pagination: Pagination;
    };
  }>();

  let featuredEvents = $derived(data.featuredEvents);
  let events = $derived(data.events);
  let pagination = $derived(data.pagination);

  // Categories filter (client-side, mở rộng sau)
</script>

<svelte:head>
  <title>TixTac - Nền tảng đặt vé sự kiện số 1</title>
  <meta
    name="description"
    content="Khám phá và đặt vé concert, festival, thể thao hàng đầu Việt Nam. Nhanh chóng, bảo mật, tiện lợi trên TixTac."
  />
</svelte:head>

<!-- Banner Carousel -->
{#if featuredEvents.length > 0}
  <EventBannerCarousel events={featuredEvents} />
{/if}

<!-- Events Section -->
<section class="mx-auto max-w-7xl px-6 py-16 lg:py-24" id="events">
  <!-- Section Header -->
  <SectionHeader
    title="Sự kiện nổi bật"
    searchQuery={pagination.searchQuery}
    viewAllHref="/events"
  />

  <!-- Events Grid or Empty State -->
  {#if events.length === 0}
    <EmptyState
      title="Không tìm thấy sự kiện nào!"
      description="Hãy thử tìm kiếm với từ khóa khác hoặc khám phá tất cả sự kiện."
      ctaLabel="Xóa tìm kiếm"
      ctaHref="/"
    />
  {:else}
    <EventsGrid {events} />

    <!-- Pagination -->
    <PaginationNav
      currentPage={pagination.currentPage}
      totalPages={pagination.totalPages}
      searchQuery={pagination.searchQuery}
    />
  {/if}
</section>
