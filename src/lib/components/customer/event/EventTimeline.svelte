<script lang="ts">
  import type { EventDetailShow } from '$lib/types/event-detail';

  interface TimelineItem {
    time?: string;
    time_start?: string;
    time_end?: string;
    activity?: string;
    title?: string;
    description?: string;
  }

  interface Props {
    show: EventDetailShow;
    class?: string;
  }

  let { show, class: extraClass = '' }: Props = $props();

  const hasItinerary = $derived(Array.isArray(show.itinerary) && show.itinerary.length > 0);
</script>

{#if hasItinerary}
  {@const items = show.itinerary as TimelineItem[]}
  <div class="rounded-xl bg-surface-container-lowest p-4 shadow-sm md:p-8 {extraClass}">
    <h3 class="mb-4 font-heading text-lg font-bold text-foreground md:mb-6 md:text-xl">
      Lịch trình sự kiện
    </h3>
    <div class="space-y-0">
      {#each items as item, i (i)}
        {@const isFirst = i < Math.ceil(items.length / 2)}
        {@const isLast = i === items.length - 1}
        <div
          class="relative ml-2 flex gap-5 md:gap-6 {isLast
            ? ''
            : 'border-l-2 border-primary/20 pb-5 md:pb-7'}"
        >
          <div
            class="absolute top-0 -left-2.25 h-3.5 w-3.5 rounded-full md:h-4 md:w-4 {isFirst
              ? 'bg-primary'
              : 'bg-surface-container-highest'} ring-4 ring-background"
          ></div>
          <div class="pl-3 md:pl-4">
            <span
              class="text-xs font-bold tracking-widest uppercase {isFirst
                ? 'text-primary'
                : 'text-muted-foreground'}"
            >
              {item.time || item.time_start || ''}{item.time_end ? ` — ${item.time_end}` : ''}
            </span>
            <h4 class="mt-0.5 font-semibold text-foreground">
              {item.activity || item.title || ''}
            </h4>
            {#if item.description}
              <p class="mt-1 text-sm text-muted-foreground">{item.description}</p>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}
