<script lang="ts">
  import { resolve } from '$app/paths';
  import CategoryBar from '$lib/components/customer/event/CategoryBar.svelte';
  import EmptyState from '$lib/components/customer/event/EmptyState.svelte';
  import EventCard from '$lib/components/customer/event/EventCard.svelte';
  import Hero from '$lib/components/customer/event/Hero.svelte';
  import Pagination from '$lib/components/customer/event/Pagination.svelte';

  interface Event {
    id: number;
    title: string;
    eventDate: string | Date;
    venue: string;
    bannerImageUrl?: string;
    min_price: number | string;
  }

  interface PaginationInfo {
    currentPage: number;
    totalPages: number;
    searchQuery: string;
  }

  let { data } = $props<{
    data: {
      events: Event[];
      pagination: Pagination;
    };
  }>();

  let events = $derived(data.events);
  let pagination = $derived(data.pagination);

  // Categories filter (client-side)
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

  // Format helpers
  function formatDate(dateStr: string | Date): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatPrice(price: number | string): string {
    const val = typeof price === 'string' ? Number(price) : price;
    if (!val || val === 0) return 'Đang cập nhật';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(val);
  }

  const placeholderGradients = [
    'linear-gradient(135deg, #EEF2FF, #C7D2FE)',
    'linear-gradient(135deg, #F0F9FF, #BAE6FD)',
    'linear-gradient(135deg, #FFF1F2, #FECDD3)',
    'linear-gradient(135deg, #F0FDF4, #BBF7D0)',
    'linear-gradient(135deg, #FFF7ED, #FFEDD5)',
  ];

  function getGradient(index: number): string {
    return placeholderGradients[index % placeholderGradients.length];
  }

  // Build URL for pagination (dùng chung)
  function buildPageUrl(page: number): string {
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (pagination.searchQuery) params.set('q', pagination.searchQuery);
    return resolve(`/?${params.toString()}`);
  }
</script>

<svelte:head>
  <title>TixTac - Nền tảng đặt vé sự kiện số 1</title>
  <meta
    name="description"
    content="Khám phá và đặt vé concert, festival, thể thao hàng đầu Việt Nam. Nhanh chóng, bảo mật, tiện lợi trên TixTac."
  />
</svelte:head>

<Hero />

<section class="events-section" id="events">
  <CategoryBar bind:activeCategory {categories} />

  <div class="section-header">
    <div>
      <h2 class="section-title">Sự kiện nổi bật</h2>
      {#if pagination.searchQuery}
        <p class="search-result-info">
          Kết quả cho: <span class="search-keyword">"{pagination.searchQuery}"</span>
        </p>
      {/if}
    </div>
    <a href={resolve('/events')} class="view-all-link" id="events-view-all">
      Xem tất cả
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </a>
  </div>

  {#if events.length === 0}
    <EmptyState clearSearchUrl={resolve('/')} />
  {:else}
    <div class="events-grid">
      {#each events as event, i (event.id)}
        <EventCard {event} {i} {formatDate} {formatPrice} {getGradient} />
      {/each}
    </div>

    {#if pagination.totalPages > 1}
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        searchQuery={pagination.searchQuery}
        {buildPageUrl}
      />
    {/if}
  {/if}
</section>

<style>
  /* Styles chỉ dành riêng cho layout của trang chính (section header, grid, v.v.) */
  .events-section {
    padding-top: 16px;
  }

  .section-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  .section-title {
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--color-text);
    letter-spacing: -0.02em;
  }

  .search-result-info {
    font-size: 0.9rem;
    color: var(--color-muted);
    margin-top: 4px;
  }

  .search-keyword {
    color: var(--color-primary);
    font-weight: 600;
  }

  .view-all-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-primary-dim);
    transition: gap 0.2s;
    text-decoration: none;
  }

  .view-all-link:hover {
    gap: 8px;
  }

  .events-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }

  @media (max-width: 1200px) {
    .events-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  @media (max-width: 860px) {
    .events-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 520px) {
    .events-grid {
      grid-template-columns: 1fr;
    }
    .section-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
  }
</style>
