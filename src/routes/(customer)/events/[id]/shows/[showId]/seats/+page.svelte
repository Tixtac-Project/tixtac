<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import SeatMap from '$lib/components/seat-map/SeatMap.svelte';
  import SummaryBar from '$lib/components/seat-map/SummaryBar.svelte';
  import { createSeatSelectionStore } from '$lib/stores/seat-selection-store.svelte';
  import type { MapConfig, SeatMapData, StageElement } from '$lib/types/seat-map';
  import { formatDate, formatTime } from '$lib/utils/datetime';
  import { ArrowLeft } from 'lucide-svelte';
  import { SvelteURLSearchParams } from 'svelte/reactivity';

  interface PageData {
    event: {
      id: number;
      title: string;
      venue: string;
      max_tickets_per_user: number;
      map_config: MapConfig;
      stage_layout: StageElement[];
    };
    show: {
      id: number;
      title: string | null;
      show_date: string;
      start_time: string;
      end_time: string | null;
    };
    seatMap: SeatMapData;
  }

  let { data } = $props<{ data: PageData }>();

  let event = $derived(data.event);
  let show = $derived(data.show);
  let seatMap = $derived(data.seatMap);

  let mapConfig = $derived<MapConfig>(data.event.map_config ?? { width: 1200, height: 800 });

  let stageLayout = $derived<StageElement[]>(
    Array.isArray(data.event.stage_layout) ? data.event.stage_layout : [],
  );

  let store = createSeatSelectionStore(data.event.max_tickets_per_user);

  // Initialize sections ref when seatMap changes
  $effect(() => {
    store.setSections(seatMap.sections);
  });

  function goBack() {
    goto(resolve(`/events/${data.event.id}`));
  }

  function handleCheckout() {
    const seatIds = store.getSelectedSeatIds();
    const generalQty = store.generalQuantities;

    const params = new SvelteURLSearchParams();
    if (seatIds.length > 0) {
      params.set('seats', seatIds.join(','));
    }
    for (const [sectionId, qty] of Object.entries(generalQty)) {
      if (qty > 0) {
        params.set(`ga_${sectionId}`, String(qty));
      }
    }
    params.set('show_id', String(data.show.id));

    goto(resolve(`/events/${data.event.id}/checkout?${params.toString()}`));
  }

  let showTitle = $derived(
    show.title || `${formatTime(show.start_time)}, ${formatDate(show.show_date)}`,
  );
</script>

<svelte:head>
  <title>Chọn ghế - {event.title} - TixTac</title>
</svelte:head>

<div class="min-h-screen bg-surface pb-24">
  <!-- Header -->
  <header
    class="sticky top-0 z-20 border-b border-border/30 bg-surface-container-lowest/90 backdrop-blur-md"
  >
    <div class="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
      <button
        type="button"
        class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-foreground transition-colors hover:bg-surface-container-high"
        onclick={goBack}
        title="Quay lại"
      >
        <ArrowLeft class="h-5 w-5" />
      </button>
      <div class="min-w-0 flex-1">
        <h1 class="truncate text-sm font-bold text-foreground sm:text-base">
          {event.title}
        </h1>
        <p class="truncate text-[11px] text-muted-foreground sm:text-xs">
          Suất: {showTitle}
        </p>
      </div>
    </div>
  </header>

  <!-- Main content -->
  <main class="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
    <SeatMap sections={seatMap.sections} {mapConfig} {stageLayout} {store} />
  </main>

  <!-- Sticky summary bar -->
  <SummaryBar {store} onCheckout={handleCheckout} maxTickets={event.max_tickets_per_user} />
</div>
