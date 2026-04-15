<script lang="ts">
  import { resolve } from '$app/paths';
  import type { CarouselAPI } from '$lib/components/ui/carousel/context.js';
  import * as Carousel from '$lib/components/ui/carousel/index.js';
  import { formatDate } from '$lib/utils/datetime';
  import Autoplay from 'embla-carousel-autoplay';
  import { Calendar, ChevronLeft, ChevronRight, MapPin, Ticket } from 'lucide-svelte';

  interface Event {
    id: number;
    title: string;
    venue: string;
    bannerImageUrl?: string | null;
    categoryName?: string | null;
    categorySlug?: string | null;
    earliestShowDate?: string | null;
    min_price: number;
  }

  interface Props {
    events: Event[];
  }

  let { events }: Props = $props();

  let api = $state<CarouselAPI>();
  let current = $state(0);
  let canScrollPrev = $state(false);
  let canScrollNext = $state(false);
  const count = $derived(api ? api.scrollSnapList().length : 0);

  $effect(() => {
    if (!api) return;

    const onSelect = () => {
      current = api!.selectedScrollSnap();
      canScrollPrev = api!.canScrollPrev();
  $effect(() => {
    if (api) {
      current = api.selectedScrollSnap();
      const handler = () => {
        current = api!.selectedScrollSnap();
      };
      api.on('select', handler);
      return () => {
        api.off('select', handler);
      };
    }
  });

  const autoplayPlugin = Autoplay({ delay: 5000, stopOnInteraction: true });

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
    'linear-gradient(135deg, oklch(0.96 0.02 262), oklch(0.85 0.08 262))',
    'linear-gradient(135deg, oklch(0.96 0.02 250), oklch(0.85 0.08 250))',
    'linear-gradient(135deg, oklch(0.96 0.02 280), oklch(0.85 0.08 280))',
    'linear-gradient(135deg, oklch(0.96 0.02 155), oklch(0.85 0.08 155))',
    'linear-gradient(135deg, oklch(0.96 0.02 85), oklch(0.85 0.08 85))',
  ];

  function getGradient(i: number): string {
    return placeholderGradients[i % placeholderGradients.length];
  }
</script>

<section class="mx-auto max-w-7xl px-4 pt-4 pb-2 sm:px-6" aria-label="Sự kiện nổi bật">
  <Carousel.Root
    opts={{
      align: 'start',
      loop: true,
    }}
    plugins={[autoplayPlugin]}
    setApi={(emblaApi) => (api = emblaApi)}
    class="w-full"
    onmouseenter={autoplayPlugin.stop}
    onmouseleave={autoplayPlugin.reset}
  >
    <Carousel.Content class="-ms-5">
      {#each events as event, i (event.id)}
        <Carousel.Item class="basis-full ps-5 md:basis-1/2">
          <a
            href={resolve(`/events/${event.id}`)}
            class="group relative block overflow-hidden rounded-2xl"
          >
            <!-- 16:9 aspect ratio -->
            <div class="relative aspect-video">
              <!-- Image / Placeholder -->
              {#if event.bannerImageUrl}
                <img
                  src={event.bannerImageUrl}
                  alt=""
                  class="h-full w-full object-cover transition-transform duration-700 ease-(--ease-bento) group-hover:scale-105"
                  loading={i < 2 ? 'eager' : 'lazy'}
                />
              {:else}
                <div
                  class="flex h-full w-full items-center justify-center"
                  style="background: {getGradient(event.id)}"
                >
                  <span class="text-6xl opacity-40 sm:text-7xl">🎫</span>
                </div>
              {/if}

              <!-- Gradient overlay -->
              <div
                class="absolute inset-0 bg-linear-to-t from-black/70 via-black/25 to-transparent"
              ></div>

              <!-- Content -->
              <div class="absolute inset-x-0 bottom-0 flex flex-col justify-end p-4 sm:p-6">
                {#if event.categoryName}
                  <span
                    class="mb-1.5 inline-block w-fit rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm sm:text-xs"
                  >
                    {event.categoryName}
                  </span>
                {/if}

                <h3
                  class="line-clamp-2 font-heading text-base leading-snug font-bold text-white sm:text-xl lg:text-2xl"
                >
                  {event.title}
                </h3>

                <div
                  class="mt-1.5 flex flex-col gap-1 text-xs text-white/75 sm:flex-row sm:items-center sm:gap-3 sm:text-sm"
                >
                  {#if event.earliestShowDate}
                    <span class="inline-flex items-center gap-1">
                      <Calendar class="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                      {formatDate(event.earliestShowDate)}
                    </span>
                  {/if}
                  <span class="inline-flex items-center gap-1">
                    <MapPin class="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                    <span class="line-clamp-1">{event.venue}</span>
                  </span>
                </div>

                <div class="mt-2 flex items-center gap-3">
                  <span
                    class="inline-flex items-center gap-1 text-sm font-bold text-white sm:text-base"
                  >
                    <Ticket class="h-4 w-4" />
                    {formatPrice(event.min_price)}
                  </span>
                  <span
                    class="hidden rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-transform group-hover:scale-105 sm:inline-block"
                  >
                    Mua vé →
                  </span>
                </div>
              </div>
            </div>
          </a>
        </Carousel.Item>
      {/each}
    </Carousel.Content>

    <!-- Controls below the carousel -->
    {#if count > 1}
      <div class="mt-3 flex items-center justify-between px-1">
        <!-- Dot indicators -->
        <div class="flex gap-1.5">
          {#each [...Array(count).keys()] as index (index)}
            <button
              type="button"
              onclick={() => api?.scrollTo(index)}
              class="h-1.5 rounded-full transition-all duration-300 {current === index
                ? 'w-7 bg-primary'
                : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'}"
              aria-label="Đi đến slide {index + 1}"
              aria-current={current === index ? 'true' : undefined}
            ></button>
          {/each}
        </div>

        <!-- Custom arrow buttons -->
        <div class="flex gap-2">
          <button
            type="button"
            onclick={() => api?.scrollPrev()}
            disabled={!canScrollPrev}
            class="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-all hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
            aria-label="Slide trước"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <button
            type="button"
            onclick={() => api?.scrollNext()}
            disabled={!canScrollNext}
            class="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-all hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
            aria-label="Slide tiếp"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    {/if}
  </Carousel.Root>
</section>
