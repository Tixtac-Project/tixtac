<script lang="ts">
  import CategoryFilterBar from '$lib/components/customer/event/CategoryFilterBar.svelte';
  import EmptyState from '$lib/components/customer/event/EmptyState.svelte';
  import EventsGrid from '$lib/components/customer/event/EventsGrid.svelte';
  import HeroSection from '$lib/components/customer/event/HeroSection.svelte';
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
      events: Event[];
      pagination: Pagination;
    };
  }>();

  let events = $derived(data.events);
  let pagination = $derived(data.pagination);

  // Categories filter (client-side, mở rộng sau)
  const categories = [
    { label: 'Tất cả', icon: '✨', value: '' },
    { label: 'Concert', icon: '🎵', value: 'concert' },
    { label: 'Festival', icon: '🎉', value: 'festival' },
    { label: 'Thể Thao', icon: '⚽', value: 'sports' },
    { label: 'Kịch Nghệ', icon: '🎭', value: 'theater' },
    { label: 'Art & Expo', icon: '🖼️', value: 'art' },
    { label: 'Comedy', icon: '😂', value: 'comedy' },
  ];

  let activeCategory = $state('');
</script>

<svelte:head>
  <title>TixTac - Nền tảng đặt vé sự kiện số 1</title>
  <meta
    name="description"
    content="Khám phá và đặt vé concert, festival, thể thao hàng đầu Việt Nam. Nhanh chóng, bảo mật, tiện lợi trên TixTac."
  />
</svelte:head>

<!-- Hero Section -->
<HeroSection
  title="Trải nghiệm"
  titleAccent="sự kiện đỉnh cao"
  subtitle="Đặt vé concert, festival, thể thao và hơn thế nữa chỉ trong vài giây — bảo mật, nhanh chóng, tiện lợi."
  primaryCTA={{ label: 'Khám phá sự kiện', href: '#events' }}
  secondaryCTA = {{ label: 'Xem sự kiện hôm nay →', href: '/' }}
/>

<!-- Events Section -->
<section class="mx-auto max-w-7xl px-6 py-16 lg:py-24" id="events">
  <!-- Category Filter -->
  <div class="mb-8">
    <CategoryFilterBar
      {categories}
      bind:activeCategory
      onCategoryChange={(value) => {
        activeCategory = value;
      }}
    />
  </div>

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
