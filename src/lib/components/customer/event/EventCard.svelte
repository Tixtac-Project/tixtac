<script lang="ts">
  import { resolve } from '$app/paths';

  interface Event {
    id: number;
    title: string;
    eventDate: string | Date;
    venue: string;
    bannerImageUrl?: string;
    min_price: number | string;
  }

  interface Props {
    event: Event;
    badge?: string;
    index?: number;
  }

  let { event, badge, index = 0 }: Props = $props();

  const placeholderGradients = [
    'linear-gradient(135deg, #EEF2FF, #C7D2FE)',
    'linear-gradient(135deg, #F0F9FF, #BAE6FD)',
    'linear-gradient(135deg, #FFF1F2, #FECDD3)',
    'linear-gradient(135deg, #F0FDF4, #BBF7D0)',
    'linear-gradient(135deg, #FFF7ED, #FFEDD5)',
  ];

  function getGradient(i: number): string {
    return placeholderGradients[i % placeholderGradients.length];
  }

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

  const eventDate = new Date(event.eventDate);
</script>

<a
  href={resolve(`/events/${event.id}` as any)}
  class="flex cursor-pointer flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-purple-600 hover:shadow-lg"
>
  <!-- Banner -->
  <div class="relative h-40 overflow-hidden bg-slate-100 sm:h-48">
    {#if event.bannerImageUrl}
      <img
        src={event.bannerImageUrl}
        alt={event.title}
        class="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
        loading="lazy"
      />
    {:else}
      <div
        class="flex h-full w-full items-center justify-center"
        style="background: {getGradient(index)}"
      >
        <span class="text-5xl opacity-60">🎫</span>
      </div>
    {/if}

    <!-- Overlay gradient -->
    <div class="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>

    <!-- Badge (HOT/LIVE) -->
    {#if badge}
      <div class="absolute top-3 left-3 z-10">
        {#if badge === 'hot'}
          <span
            class="inline-block rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white"
          >
            🔥 HOT
          </span>
        {:else if badge === 'live'}
          <span
            class="inline-block rounded-full bg-red-400 px-2.5 py-1 text-xs font-bold text-slate-900"
          >
            🔴 LIVE
          </span>
        {/if}
      </div>
    {/if}

    <!-- Date badge -->
    <div
      class="absolute top-3 right-3 z-10 rounded-lg border border-slate-200 bg-white/90 p-1.5 text-center backdrop-blur"
    >
      <div class="block text-sm font-black text-slate-900">{eventDate.getDate()}</div>
      <div class="block text-xs font-bold text-slate-500 uppercase">
        {eventDate.toLocaleString('vi-VN', { month: 'short' })}
      </div>
    </div>
  </div>

  <!-- Card body -->
  <div class="flex flex-1 flex-col p-4">
    <!-- Title -->
    <h3
      class="mb-2.5 line-clamp-2 text-base font-bold text-slate-900 transition-colors group-hover:text-purple-600"
    >
      {event.title}
    </h3>

    <!-- Meta info -->
    <div class="mb-3 space-y-1 text-sm text-slate-600">
      <!-- Date -->
      <div class="flex items-center gap-1.5">
        <svg
          class="h-3.5 w-3.5 flex-shrink-0 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span>{formatDate(event.eventDate)}</span>
      </div>

      <!-- Venue -->
      <div class="flex items-center gap-1.5">
        <svg
          class="h-3.5 w-3.5 flex-shrink-0 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span class="truncate">{event.venue}</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-auto flex items-center justify-between border-t border-slate-200 pt-3">
      <span class="text-sm font-bold text-purple-600">Giá từ: {formatPrice(event.min_price)}</span>
      <svg
        class="h-4.5 w-4.5 flex-shrink-0 text-purple-600 transition-transform group-hover:translate-x-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M14 5l7 7m0 0l-7 7m7-7H3"
        />
      </svg>
    </div>
  </div>
</a>
