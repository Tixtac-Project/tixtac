<script lang="ts">
  import { resolve } from '$app/paths';
  import type { CarouselAPI } from '$lib/components/ui/carousel/context.js';
  import * as Carousel from '$lib/components/ui/carousel/index.js';
  import type { EventListItem } from '$lib/types/event-detail';
  import { formatPrice } from '$lib/utils/price';
  import Autoplay from 'embla-carousel-autoplay';
  import { ArrowRight, Calendar, ChevronLeft, ChevronRight, MapPin, Ticket } from 'lucide-svelte';

  interface Props {
    events: EventListItem[];
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
      canScrollNext = api!.canScrollNext();
    };

    onSelect();

    api.on('select', onSelect);
    api.on('reInit', onSelect);

    return () => {
      api!.off('select', onSelect);
      api!.off('reInit', onSelect);
    };
  });

  const autoplayPlugin = Autoplay({ delay: 6000, stopOnInteraction: true });

  const placeholderGradients = [
    'linear-gradient(135deg, #4338ca, #6366f1)',
    'linear-gradient(135deg, #0b132b, #1a2344)',
    'linear-gradient(135deg, #4f46e5, #818cf8)',
    'linear-gradient(135deg, #111d3d, #4338ca)',
    'linear-gradient(135deg, #1a2344, #6366f1)',
  ];

  function getGradient(i: number): string {
    return placeholderGradients[i % placeholderGradients.length];
  }
</script>

<section class="relative w-full py-4 sm:py-10">
  <div class="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
    <Carousel.Root
      opts={{ align: 'start', loop: true }}
      plugins={[autoplayPlugin]}
      setApi={(emblaApi) => (api = emblaApi)}
      class="w-full"
      onmouseenter={autoplayPlugin.stop}
      onmouseleave={autoplayPlugin.reset}
    >
      <Carousel.Content class="-ms-4">
        {#each events as event, i (event.id)}
          <Carousel.Item class="basis-full ps-4">
            <a
              href={resolve(`/events/${event.id}`)}
              class="group relative flex aspect-3/4 w-full flex-col overflow-hidden rounded-[1.5rem] bg-slate-950 ring-1 ring-border/10 sm:aspect-[16/9] lg:aspect-auto lg:min-h-[560px]"
            >
              <!-- 1. Background Image Full-bleed -->
              <div class="absolute inset-0">
                {#if event.bannerImageUrl}
                  <img
                    src={event.bannerImageUrl}
                    alt={event.title}
                    class="h-full w-full object-cover opacity-90 transition-transform duration-[1500ms] ease-out group-hover:scale-105"
                    loading={i < 2 ? 'eager' : 'lazy'}
                  />
                {:else}
                  <div
                    class="flex h-full w-full items-center justify-center transition-transform duration-[1500ms] ease-out group-hover:scale-105"
                    style="background: {getGradient(i)}"
                  >
                    <span class="text-9xl opacity-20 blur-sm">🎫</span>
                  </div>
                {/if}
              </div>

              <!-- 2. Smooth Gradient Overlay -->
              <div
                class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent lg:bg-gradient-to-r lg:from-slate-950 lg:via-slate-950/80 lg:to-transparent/20"
              ></div>
              <div
                class="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent lg:hidden"
              ></div>

              <!-- 3. Content Block -->
              <div class="absolute inset-0 z-10 flex flex-col p-4 sm:p-8 lg:p-12">
                <div
                  class="flex flex-1 flex-col justify-end pb-6 md:w-[70%] md:justify-center md:pb-0"
                >
                  <!-- Category Badge -->
                  {#if event.categoryName}
                    <span
                      class="mb-3 inline-block w-fit rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold tracking-widest text-white uppercase backdrop-blur-md sm:mb-4 sm:px-3.5 sm:py-1 sm:text-[11px]"
                    >
                      {event.categoryName}
                    </span>
                  {/if}

                  <!-- Title -->
                  <h2
                    class="mb-3 line-clamp-3 font-heading text-2xl leading-tight font-black tracking-tight text-white drop-shadow-lg sm:text-3xl md:text-5xl lg:text-[3.5rem] lg:leading-[1.15]"
                  >
                    {event.title}
                  </h2>

                  <!-- Meta Data (Date & Venue) -->
                  <div
                    class="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-sm font-medium text-slate-300"
                  >
                    {#if event.earliestShowDate}
                      <span
                        class="flex items-center gap-2 rounded-full bg-black/20 px-3 py-1.5 backdrop-blur-sm"
                      >
                        <Calendar class="size-4 text-info/80" />
                        {new Date(event.earliestShowDate).toLocaleDateString('vi-VN', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    {/if}
                    <span
                      class="flex items-center gap-2 rounded-full bg-black/20 px-3 py-1.5 backdrop-blur-sm"
                    >
                      <MapPin class="size-4 text-info/80" />
                      <span class="line-clamp-1">{event.venue}</span>
                    </span>
                  </div>
                </div>

                <div
                  class="mt-auto flex w-full flex-wrap items-end justify-between gap-3 border-t border-white/10 pt-4 md:border-none md:pt-0"
                >
                  <div class="flex flex-col">
                    <span
                      class="mb-0.5 text-[9px] font-bold tracking-widest text-slate-400 uppercase drop-shadow-sm sm:text-[10px]"
                    >
                      Giá vé từ
                    </span>
                    <span
                      class="flex items-center gap-1.5 text-xl font-black text-white drop-shadow-md sm:text-2xl md:text-3xl lg:text-4xl"
                    >
                      <Ticket class="size-4 text-info/80 sm:size-5 md:size-6 lg:size-7" />
                      {formatPrice(event.min_price)}
                    </span>
                  </div>

                  <span
                    class="group/btn relative inline-flex items-center gap-1.5 overflow-hidden rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/40 sm:px-8 sm:py-3.5 sm:text-base"
                  >
                    <span class="relative z-10 flex items-center gap-1.5">
                      Mua vé ngay
                      <ArrowRight
                        class="size-3.5 transition-transform duration-300 group-hover/btn:translate-x-1 sm:size-4"
                      />
                    </span>
                    <div
                      class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover/btn:translate-x-full"
                    ></div>
                  </span>
                </div>
              </div>
            </a>
          </Carousel.Item>
        {/each}
      </Carousel.Content>

      <!-- Carousel Controls (Dots & Arrows) -->
      {#if count > 1}
        <div class="mt-4 flex items-center justify-between px-2 sm:mt-8">
          <!-- Modern Pill Indicators -->
          <div class="flex items-center gap-2">
            {#each [...Array(count).keys()] as index (index)}
              <button
                type="button"
                onclick={() => api?.scrollTo(index)}
                class="h-2 rounded-full transition-all duration-500 ease-out {current === index
                  ? 'w-10 bg-primary'
                  : 'w-2 bg-muted-foreground/30 hover:w-4 hover:bg-muted-foreground/60'}"
                aria-label="Đi đến slide {index + 1}"
                aria-current={current === index ? 'true' : undefined}
              ></button>
            {/each}
          </div>

          <!-- Solid Action Arrows -->
          <div class="flex gap-2">
            <button
              type="button"
              onclick={() => api?.scrollPrev()}
              disabled={!canScrollPrev}
              class="flex size-11 items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-border/50 transition-all hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              aria-label="Slide trước"
            >
              <ChevronLeft class="size-5 text-foreground" />
            </button>
            <button
              type="button"
              onclick={() => api?.scrollNext()}
              disabled={!canScrollNext}
              class="flex size-11 items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-border/50 transition-all hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              aria-label="Slide tiếp"
            >
              <ChevronRight class="size-5 text-foreground" />
            </button>
          </div>
        </div>
      {/if}
    </Carousel.Root>
  </div>
</section>
