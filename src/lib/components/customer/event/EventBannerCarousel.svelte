<script lang="ts">
  import { resolve } from '$app/paths';
  import Button from '$lib/components/ui/button/button.svelte';
  import { ChevronLeft, ChevronRight } from 'lucide-svelte';

  interface Event {
    id: number;
    title: string;
    eventDate: string | Date;
    venue: string;
    bannerImageUrl?: string;
    min_price: number | string;
  }

  interface Props {
    events: Event[];
  }

  let { events }: Props = $props();

  let currentSlide = $state(0);

  // 1. FIX: Khởi tạo giá trị mặc định tĩnh cho SSR (1024)
  let windowWidth = $state(1024);

  let eventsPerSlide = $derived(windowWidth >= 768 ? 2 : 1);
  let totalSlides = $derived(Math.ceil(events.length / eventsPerSlide));

  // Resume slide if it exceeds totalSlides when responsive changes
  $effect(() => {
    if (currentSlide >= totalSlides && totalSlides > 0) {
      currentSlide = 0;
    }
  });

  function nextSlide() {
    currentSlide = (currentSlide + 1) % totalSlides;
  }

  function prevSlide() {
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
  }

  function formatDate(dateStr: string | Date): string {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
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

  function getGradient(i: number): string {
    return placeholderGradients[i % placeholderGradients.length];
  }
</script>

<svelte:window bind:innerWidth={windowWidth} />

<section class="mx-auto max-w-7xl px-4 pt-2 pb-4 sm:px-6">
  <div class="relative">
    <div class="overflow-hidden rounded-xl bg-transparent">
      <div class="relative h-96 sm:h-[500px] md:h-[550px]">
        <div
          class="flex h-full transition-transform duration-500 ease-out"
          style="transform: translateX(-{currentSlide * 100}%)"
        >
          {#each { length: totalSlides } as _, slideIndex (slideIndex)}
            <div class="relative flex h-full w-full shrink-0 gap-4 p-4 sm:p-6 md:gap-4">
              {#each events.slice(slideIndex * eventsPerSlide, (slideIndex + 1) * eventsPerSlide) as event (event.id)}
                <a
                  href={resolve(`/events/${event.id}`)}
                  class="group relative flex flex-1 overflow-hidden rounded-lg transition-transform duration-300 hover:scale-105"
                >
                  <div class="relative h-full w-full">
                    {#if event.bannerImageUrl}
                      <img
                        src={event.bannerImageUrl}
                        alt={event.title}
                        class="h-full w-full object-cover"
                        loading="lazy"
                      />
                    {:else}
                      <div
                        class="flex h-full w-full items-center justify-center"
                        style="background: {getGradient(event.id)}"
                      >
                        <span class="text-6xl opacity-60">🎫</span>
                      </div>
                    {/if}

                    <div
                      class="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent"
                    ></div>

                    <div class="absolute inset-0 flex flex-col justify-end p-4 sm:p-6">
                      <h3 class="line-clamp-2 text-lg font-bold text-white sm:text-2xl">
                        {event.title}
                      </h3>
                      <p class="mt-1 line-clamp-1 text-sm text-slate-200 sm:text-base">
                        📍 {event.venue}
                      </p>
                      <p class="mt-1 text-xs text-slate-300 sm:text-sm">
                        📅 {formatDate(event.eventDate)}
                      </p>
                      <p class="mt-2 text-base font-semibold text-primary sm:text-lg">
                        {formatPrice(event.min_price)}
                      </p>
                    </div>
                  </div>
                </a>
              {/each}
            </div>
          {/each}
        </div>

        {#if totalSlides > 1}
          <button
            onclick={prevSlide}
            class="absolute top-1/2 left-2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full bg-white/20 p-2 backdrop-blur-sm transition-all hover:bg-white/40 sm:left-4 sm:p-3"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5 text-white sm:h-6 sm:w-6" />
          </button>

          <button
            onclick={nextSlide}
            class="absolute top-1/2 right-2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full bg-white/20 p-2 backdrop-blur-sm transition-all hover:bg-white/40 sm:right-4 sm:p-3"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5 text-white sm:h-6 sm:w-6" />
          </button>
        {/if}
      </div>
    </div>

    {#if totalSlides > 1}
      <div class="mt-2 flex justify-center gap-2">
        {#each Array(totalSlides) as _, index (index)}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onclick={() => (currentSlide = index)}
            class={`h-2 rounded-full transition-all duration-300 hover:bg-slate-400 ${
              currentSlide === index
                ? 'w-6 bg-primary hover:bg-primary'
                : 'w-2 bg-slate-300 hover:bg-slate-400'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        {/each}
      </div>
    {/if}
  </div>
</section>
