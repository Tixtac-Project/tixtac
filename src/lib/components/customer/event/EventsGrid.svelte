<script lang="ts">
  import EventCard from './EventCard.svelte';

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
    variant?: 'default' | 'compact' | 'full-width';
  }

  let { events = [], variant = 'default' }: Props = $props();

  // Determine badge pattern for events (every nth event gets a badge)
  // function getBadge(index: number): string | undefined {
  //   if (index % 3 === 0) return 'hot';
  //   if (index % 3 === 1) return 'live';
  //   return undefined;
  // }

  const gridClass = {
    default: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5',
    compact: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
    'full-width': 'grid-cols-1 gap-6',
  };
</script>

<div class={`grid ${gridClass[variant]}`}>
  {#each events as event, i (event.id)}
    <EventCard {event} index={i} />
    <!-- Thêm getBadge sau khi có Status Events -->
  {/each}
</div>
