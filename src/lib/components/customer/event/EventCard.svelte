<script lang="ts">
  import { resolve } from '$app/paths';
  import { formatDate } from '$lib/utils/datetime';
  import { formatPrice } from '$lib/utils/price';

  interface Event {
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

  interface Props {
    event: Event;
    badge?: string;
    index?: number;
  }

  let { event, badge, index = 0 }: Props = $props();

  const placeholderGradients = [
    'linear-gradient(135deg, oklch(0.96 0.02 262), oklch(0.90 0.06 262))',
    'linear-gradient(135deg, oklch(0.96 0.02 250), oklch(0.90 0.06 250))',
    'linear-gradient(135deg, oklch(0.96 0.02 280), oklch(0.90 0.06 280))',
    'linear-gradient(135deg, oklch(0.96 0.02 155), oklch(0.90 0.06 155))',
    'linear-gradient(135deg, oklch(0.96 0.02 85), oklch(0.90 0.06 85))',
  ];

  function getGradient(i: number): string {
    return placeholderGradients[i % placeholderGradients.length];
  }

  const showDate = $derived(event.earliestShowDate ? new Date(event.earliestShowDate) : null);

  // Availability status
  const availabilityStatus = $derived.by(() => {
    if (event.availableSeats === undefined || event.totalSeats === undefined) return null;
    if (event.availableSeats === 0) return 'soldout';
    if (event.availableSeats <= 10) return 'limited';
    return 'available';
  });
</script>

<a
  href={resolve(`/events/${event.id}`)}
  class="bento-card-interactive group flex flex-col overflow-hidden !p-0"
>
  <!-- Banner -->
  <div class="relative h-40 overflow-hidden bg-muted sm:h-48">
    {#if event.bannerImageUrl}
      <img
        src={event.bannerImageUrl}
        alt={event.title}
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
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
            class="inline-block rounded-full bg-danger px-2.5 py-1 text-xs font-bold text-danger-foreground"
          >
            🔥 HOT
          </span>
        {:else if badge === 'live'}
          <span
            class="inline-block rounded-full bg-warning px-2.5 py-1 text-xs font-bold text-warning-foreground"
          >
            🔴 LIVE
          </span>
        {/if}
      </div>
    {/if}

    <!-- Availability badge -->
    {#if availabilityStatus === 'soldout'}
      <div class="absolute top-3 left-3 z-10">
        <span
          class="inline-block rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground"
        >
          Sold out
        </span>
      </div>
    {:else if availabilityStatus === 'limited'}
      <div class="absolute top-3 left-3 z-10">
        <span
          class="inline-block rounded-full bg-warning-muted px-2.5 py-1 text-xs font-bold text-warning-muted-foreground"
        >
          Sắp hết vé
        </span>
      </div>
    {/if}

    <!-- Date badge -->
    {#if showDate}
      <div
        class="absolute top-3 right-3 z-10 rounded-xl border border-border bg-card/90 p-1.5 text-center backdrop-blur"
      >
        <div class="block text-sm font-black text-foreground">{showDate.getDate()}</div>
        <div class="block text-xs font-bold text-muted-foreground uppercase">
          {showDate.toLocaleString('vi-VN', { month: 'short' })}
        </div>
      </div>
    {/if}
  </div>

  <!-- Card body -->
  <div class="flex flex-1 flex-col p-5">
    <!-- Category tag -->
    {#if event.categoryName}
      <span
        class="mb-2 inline-block w-fit rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground"
      >
        {event.categoryName}
      </span>
    {/if}

    <!-- Title -->
    <h3
      class="mb-2.5 line-clamp-2 text-base font-bold text-foreground transition-colors group-hover:text-primary"
    >
      {event.title}
    </h3>

    <!-- Meta info -->
    <div class="mb-3 space-y-1.5 text-sm text-muted-foreground">
      <!-- Date -->
      {#if event.earliestShowDate}
        <div class="flex items-center gap-1.5">
          <svg
            class="h-3.5 w-3.5 flex-shrink-0"
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
          <span>{formatDate(event.earliestShowDate)}</span>
        </div>
      {/if}

      <!-- Venue -->
      <div class="flex items-center gap-1.5">
        <svg class="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div class="mt-auto flex items-center justify-between border-t border-border pt-3">
      <span class="text-sm font-bold text-primary">Giá từ: {formatPrice(event.min_price)}</span>
      <svg
        class="h-4.5 w-4.5 flex-shrink-0 text-primary transition-transform group-hover:translate-x-1"
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
