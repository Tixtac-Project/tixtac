<script lang="ts">
  import EmptyState from '$lib/components/customer/event/EmptyState.svelte';
  import EventBannerCarousel from '$lib/components/customer/event/EventBannerCarousel.svelte';
  import EventsGrid from '$lib/components/customer/event/EventsGrid.svelte';
  import PaginationNav from '$lib/components/customer/event/PaginationNav.svelte';
  import SectionHeader from '$lib/components/customer/event/SectionHeader.svelte';
  import type { EventListItem } from '$lib/types/event-detail';

  interface Pagination {
    currentPage: number;
    totalPages: number;
  }

  let { data } = $props<{
    data: {
      categories: { id: number; name: string; slug: string }[];
      featuredEvents: EventListItem[];
      events: EventListItem[];
      pagination: Pagination;
    };
  }>();

  let featuredEvents = $derived(data.featuredEvents);
  let events = $derived(data.events);
  let pagination = $derived(data.pagination);
</script>

<svelte:head>
  <title>TixTac - Nền tảng đặt vé sự kiện hàng đầu</title>
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
<section class="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:py-24" id="events">
  <SectionHeader title="Sự kiện nổi bật" viewAllHref="/events" />

  {#if events.length === 0}
    <EmptyState
      title="Không tìm thấy sự kiện nào!"
      description="Hãy thử tìm kiếm với từ khóa khác hoặc khám phá tất cả sự kiện."
      ctaLabel="Khám phá"
      ctaHref="/events"
    />
  {:else}
    <EventsGrid {events} />

    <PaginationNav currentPage={pagination.currentPage} totalPages={pagination.totalPages} />
  {/if}
</section>
