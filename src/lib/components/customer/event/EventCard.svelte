<script lang="ts">
  import { resolve } from '$app/paths';
  import type { EventListItem } from '$lib/types/event-detail';
  import { formatPrice } from '$lib/utils/price';
  import { Calendar, MapPin, Ticket } from 'lucide-svelte';

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
  class="bento-card-interactive group flex h-full flex-col overflow-hidden p-0!"
>
  <!-- ═══════════ BANNER ═══════════ -->
  <div class="relative aspect-[16/9] overflow-hidden bg-muted md:aspect-auto md:h-44">
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

    <div class="absolute inset-0 bg-linear-to-t from-black/25 to-transparent"></div>

    <!-- Category (mobile: overlaid on banner) -->
    {#if event.categoryName}
      <div class="absolute bottom-2 left-2 z-10 md:hidden">
        <span
          class="inline-block rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm"
        >
          {event.categoryName}
        </span>
      </div>
    {/if}

    <!-- Badges (top-right, consistent across breakpoints) -->
    {#if badge && !availabilityStatus}
      <div class="absolute top-2.5 right-2.5 z-10">
        {#if badge === 'hot'}
          <span
            class="inline-block rounded-md bg-danger px-2 py-0.5 text-[10px] font-bold text-danger-foreground md:px-2.5 md:py-1 md:text-xs"
          >
            🔥 HOT
          </span>
        {:else if badge === 'live'}
          <span
            class="inline-block rounded-md bg-warning px-2 py-0.5 text-[10px] font-bold text-warning-foreground md:px-2.5 md:py-1 md:text-xs"
          >
            🔴 LIVE
          </span>
        {/if}
      </div>
    {/if}

    {#if availabilityStatus === 'soldout'}
      <div class="absolute top-2.5 right-2.5 z-10">
        <span
          class="inline-block rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground md:px-2.5 md:py-1 md:text-xs"
        >
          Sold out
        </span>
      </div>
    {:else if availabilityStatus === 'limited'}
      <div class="absolute top-2.5 right-2.5 z-10">
        <span
          class="inline-block rounded-md bg-warning-muted px-2 py-0.5 text-[10px] font-bold text-warning-muted-foreground md:px-2.5 md:py-1 md:text-xs"
        >
          Sắp hết vé
        </span>
      </div>
    {/if}
  </div>

  <!-- ═══════════ CARD BODY ═══════════ -->
  <div class="flex flex-1 flex-col gap-3 p-3.5 md:gap-4 md:p-5">
    <!-- Category + Title block -->
    <div class="space-y-1.5">
      {#if event.categoryName}
        <span
          class="hidden w-fit rounded-md bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary md:inline-block"
        >
          {event.categoryName}
        </span>
      {/if}

      <h3
        class="line-clamp-2 font-heading text-sm leading-snug font-extrabold tracking-tight text-foreground transition-colors group-hover:text-primary md:text-base"
      >
        {event.title}
      </h3>
    </div>

    <!-- Meta — pushed to bottom regardless of title height -->
    <div class="mt-auto flex flex-col gap-3">
      <!-- Mobile meta -->
      <div class="flex flex-col gap-1 text-xs text-muted-foreground md:hidden">
        {#if showDate}
          <span class="inline-flex items-center gap-1.5 font-semibold text-foreground">
            <Calendar class="size-3.5 shrink-0 text-primary" />
            {showDate.toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        {/if}
        <span class="inline-flex items-center gap-1.5">
          <MapPin class="size-3.5 shrink-0" />
          <span class="line-clamp-1">{event.venue}</span>
        </span>
      </div>

      <!-- Desktop meta -->
      <div class="hidden items-start gap-3 md:flex">
        {#if showDate}
          <div
            class="flex w-20 shrink-0 flex-col items-center self-start rounded-lg bg-primary-light px-3 py-2.5 text-center"
          >
            <span class="text-xl leading-none font-extrabold text-primary">
              {showDate.getDate()}
            </span>
            <span class="mt-0.5 text-[11px] font-bold tracking-wider text-primary/70 uppercase">
              THG {showDate.toLocaleString('vi-VN', { month: 'numeric' })}
            </span>
            <span class="mt-0.5 text-[10px] leading-none font-medium text-primary/50">
              {showDate.getFullYear()}
            </span>
          </div>
        {/if}
        <div class="min-w-0 flex-1 pt-0.5 text-sm text-muted-foreground">
          <div class="flex items-start gap-1.5">
            <MapPin class="mt-0.5 size-3.5 shrink-0" />
            <span class="line-clamp-2 break-words">{event.venue}</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between border-t border-border pt-3">
        <div class="flex flex-col gap-0.5">
          <span
            class="text-[9px] font-medium tracking-wider text-muted-foreground uppercase md:text-[10px]"
          >
            Giá từ
          </span>
          <span class="text-sm font-extrabold text-foreground md:text-base">
            {formatPrice(event.min_price)}
          </span>
        </div>
        <span
          class="inline-flex items-center gap-1.5 rounded-lg bg-cta px-3 py-1.5 text-xs font-bold text-cta-foreground shadow-sm shadow-cta/15 transition-all group-hover:scale-105 group-hover:shadow-md group-hover:shadow-cta/20 md:px-4 md:py-2"
        >
          <Ticket class="size-3.5" />
          Mua vé
        </span>
      </div>
    </div>
  </div>
</a>
