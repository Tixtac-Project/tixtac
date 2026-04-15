<script lang="ts">
  import EventCard from './EventCard.svelte';

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
    events: Event[];
    variant?: 'default' | 'compact' | 'full-width';
  }

  let { events = [], variant = 'default' }: Props = $props();

  const gridClass = {
    default: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5',
    compact: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5',
    'full-width': 'grid-cols-1 gap-5',
  };
</script>

<div class={`bento-grid ${gridClass[variant]}`}>
  {#each events as event, i (event.id)}
    <div class="bento-fade-in">
      <EventCard {event} index={i} />
    </div>
  {/each}
</div>
