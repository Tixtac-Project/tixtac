<script lang="ts">
  import { resolve } from '$app/paths';
  import type { EventListItem } from '$lib/types/event-detail';
  import { formatPrice } from '$lib/utils/price';
  import { MapPin, Ticket } from 'lucide-svelte';

  interface Props {
    event: EventListItem;
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

  const availabilityStatus = $derived.by(() => {
    if (event.availableSeats === undefined || event.totalSeats === undefined) return null;
    if (event.availableSeats === 0) return 'soldout';
    if (event.availableSeats <= 10) return 'limited';
    return 'available';
  });
</script>

<a
  href={resolve(`/events/${event.id}`)}
  class="bento-card-interactive group flex h-full flex-col overflow-hidden !p-0"
>
  <!-- Banner -->
  <div class="relative h-48 overflow-hidden bg-muted">
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
    <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

    <!-- Badge (HOT/LIVE) - top left -->
    {#if badge}
      <div class="absolute top-3 left-3 z-10">
        {#if badge === 'hot'}
          <span
            class="inline-block rounded-md bg-danger px-2.5 py-1 text-xs font-bold text-danger-foreground"
          >
            🔥 HOT
          </span>
        {:else if badge === 'live'}
          <span
            class="inline-block rounded-md bg-warning px-2.5 py-1 text-xs font-bold text-warning-foreground"
          >
            🔴 LIVE
          </span>
        {/if}
      </div>
    {/if}

    <!-- Availability badge - top left -->
    {#if availabilityStatus === 'soldout'}
      <div class="absolute top-3 left-3 z-10">
        <span
          class="inline-block rounded-md bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground"
        >
          Sold out
        </span>
      </div>
    {:else if availabilityStatus === 'limited'}
      <div class="absolute top-3 left-3 z-10">
        <span
          class="inline-block rounded-md bg-warning-muted px-2.5 py-1 text-xs font-bold text-warning-muted-foreground"
        >
          Sắp hết vé
        </span>
      </div>
    {/if}
  </div>

  <!-- Card body -->
  <div class="flex flex-1 flex-col p-5">
    <!-- Category tag -->
    {#if event.categoryName}
      <span
        class="mb-2 inline-block w-fit rounded-md bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary"
      >
        {event.categoryName}
      </span>
    {/if}

    <!-- Title -->
    <h3
      class="mb-3 line-clamp-2 font-heading text-lg leading-tight font-extrabold tracking-tight text-foreground transition-colors group-hover:text-primary"
    >
      {event.title}
    </h3>

    <!-- Meta: Date block on left + venue on right -->
    <div class="mb-3 flex items-start gap-3">
      <!-- Date block - calendar style with year -->
      {#if showDate}
        <div
          class="flex min-w-[52px] shrink-0 flex-col items-center rounded-md bg-primary-light px-2 py-1.5 text-center"
        >
          <span class="text-xl leading-none font-extrabold text-primary">{showDate.getDate()}</span>
          <span class="text-[10px] font-bold tracking-wider text-primary/70 uppercase">
            {showDate.toLocaleString('vi-VN', { month: 'short' })}
          </span>
          <span class="mt-0.5 text-[9px] leading-none font-semibold text-primary/50">
            {showDate.getFullYear()}
          </span>
        </div>
      {/if}

      <!-- Venue (top-aligned, uses remaining space, truncates if needed) -->
      <div class="min-w-0 flex-1 text-sm text-muted-foreground">
        <div class="flex items-start gap-1.5">
          <MapPin class="mt-0.5 size-3.5 flex-shrink-0" />
          <span class="line-clamp-2 break-words">{event.venue}</span>
        </div>
      </div>
    </div>

    <!-- Footer with price + CTA -->
    <div class="mt-auto flex items-center justify-between border-t border-border pt-3">
      <div class="flex flex-col">
        <span class="text-[10px] tracking-wider text-muted-foreground uppercase">Giá từ</span>
        <span class="text-base font-extrabold text-foreground">{formatPrice(event.min_price)}</span>
      </div>
      <span
        class="inline-flex items-center gap-1.5 rounded-md bg-cta px-4 py-2 text-xs font-bold text-cta-foreground shadow-sm shadow-cta/15 transition-all group-hover:scale-105 group-hover:shadow-md group-hover:shadow-cta/20"
      >
        <Ticket class="size-3.5" />
        Mua vé
      </span>
    </div>
  </div>
</a>
