<script lang="ts">
  import { goto, replaceState } from '$app/navigation';
  import { resolve } from '$app/paths';
  import ConflictModal from '$lib/components/ConflictModal.svelte';
  import SeatMap from '$lib/components/seat-map/SeatMap.svelte';
  import SummaryBar from '$lib/components/seat-map/SummaryBar.svelte';
  import { createSeatSelectionStore } from '$lib/stores/cart-store.svelte';
  import { toast } from '$lib/stores/toast';
  import type { MapConfig, SeatMapData, StageElement } from '$lib/types/seat-map';
  import { api } from '$lib/utils/api';
  import { formatDate, formatShortDate, formatTime, getDayInTZ } from '$lib/utils/datetime';
  import { ArrowLeft, Calendar, ChevronDown, Clock, LoaderCircle } from 'lucide-svelte';
  import { onDestroy } from 'svelte';
  import { fly } from 'svelte/transition';

  interface ShowInfo {
    id: number;
    title: string | null;
    show_date: string;
    start_time: string;
    end_time: string | null;
  }

  interface PageData {
    event: {
      id: number;
      title: string;
      venue: string;
      max_tickets_per_user: number;
      map_config: MapConfig;
      stage_layout: StageElement[];
    };
    show: ShowInfo;
    allShows: ShowInfo[];
    seatMap: SeatMapData;
  }

  let { data } = $props<{ data: PageData }>();

  let event = $derived(data.event);
  let allShows = $derived(data.allShows);

  let mapConfig = $derived<MapConfig>(data.event.map_config ?? { width: 1200, height: 800 });
  let stageLayout = $derived<StageElement[]>(
    Array.isArray(data.event.stage_layout) ? data.event.stage_layout : [],
  );

  // ── Current show & seat map state ──
  let currentShowId = $state(0);
  let seatMap = $state<SeatMapData>({ show_id: 0, sections: [] });
  let isLoadingSeatMap = $state(false);
  let showPickerOpen = $state(false);

  /** Track the last event+show combo we synced from server data */
  let lastSyncedKey = $state('');
  let lastEventId = $state<number | null>(null);

  let currentShow = $derived<ShowInfo>(
    allShows.find((s: ShowInfo) => s.id === currentShowId) ?? data.show,
  );

  // ── Store ──
  const getMaxTicketsPerUser = () => data.event.max_tickets_per_user;
  let store = createSeatSelectionStore(getMaxTicketsPerUser());

  // Sync from server data whenever the route's event/show changes
  // (handles initial load AND SvelteKit reusing this page for a different route)
  $effect(() => {
    const syncKey = `${data.event.id}-${data.show.id}`;
    if (syncKey === lastSyncedKey) return;

    const showId = data.show.id;
    const eventId = data.event.id;
    const mapData = data.seatMap;
    if (!showId || !mapData) return;

    lastSyncedKey = syncKey;
    currentShowId = showId;
    seatMap = mapData;

    // Abort any in-flight show switch
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
      isLoadingSeatMap = false;
    }

    // Reset the store only if we switched to a DIFFERENT event
    if (lastEventId !== null && lastEventId !== eventId) {
      store.clearAll();
    }
    lastEventId = eventId;

    const show = allShows.find((s: ShowInfo) => s.id === showId);
    const label = show ? getShowLabel(show) : `Suất #${showId}`;
    store.setActiveShow(showId, label);
    store.setSections(mapData.sections);
  });

  function getShowLabel(show: ShowInfo): string {
    return show.title || `${formatTime(show.start_time)}, ${formatDate(show.show_date)}`;
  }

  // Track active request to prevent stale responses
  let activeAbortController: AbortController | null = null;

  async function switchShow(showId: number) {
    if (showId === currentShowId) {
      showPickerOpen = false;
      // If a switch to another show is still in flight, abort it so
      // the UI stays on the show the user just confirmed.
      if (activeAbortController) {
        activeAbortController.abort();
        activeAbortController = null;
        isLoadingSeatMap = false;
      }
      return;
    }

    showPickerOpen = false;
    isLoadingSeatMap = true;

    // Abort any previous request
    if (activeAbortController) {
      activeAbortController.abort();
    }

    // Create new AbortController for this request
    const controller = new AbortController();
    activeAbortController = controller;

    try {
      const res = await api.get<SeatMapData>(`/events/${data.event.id}/shows/${showId}/seats`, {
        signal: controller.signal,
      });

      // Only update state if this request wasn't aborted (still the most recent)
      if (!controller.signal.aborted && res.data) {
        currentShowId = showId;
        seatMap = res.data;

        const show = allShows.find((s: ShowInfo) => s.id === showId);
        const label = show ? getShowLabel(show) : `Suất #${showId}`;
        store.setActiveShow(showId, label);
        store.setSections(res.data.sections);

        // Update URL without full navigation (respects paths.base)
        const newUrl = resolve(`/events/${data.event.id}/shows/${showId}/seats`);
        replaceState(newUrl, {});
      }
    } catch (error) {
      // Ignore abort errors, they are expected when switching shows rapidly
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      // Other errors already handled by api utility
    } finally {
      // Only clear loading state if this is still the active request
      if (activeAbortController === controller) {
        isLoadingSeatMap = false;
        activeAbortController = null;
      }
    }
  }

  function abortPendingRequest() {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
      isLoadingSeatMap = false;
    }
  }

  function goBack() {
    abortPendingRequest();
    goto(resolve(`/events/${data.event.id}`));
  }

  // Abort any in-flight request when the component is destroyed
  onDestroy(abortPendingRequest);

  let isSubmitting = $state(false);
  let showConflictModal = $state(false);
  let conflicts = $state<{ label: string; showName: string; type: 'seat' | 'section' }[]>([]);

  async function handleCheckout() {
    const activeCarts = store.getActiveCarts();
    if (activeCarts.length === 0 || isSubmitting) return;

    isSubmitting = true;

    // Build payload
    const cart_items = activeCarts.map((cart) => ({
      show_id: cart.showId,
      assigned_seats: cart.selectedSeats.map((s) => s.id),
      general_admission: Object.entries(cart.generalQuantities)
        .filter(([, qty]) => (qty as number) > 0)
        .map(([sectionId, qty]) => ({
          section_id: Number(sectionId),
          quantity: qty as number,
        })),
    }));

    const res = await api.post<{ order_id: number }>(`/events/${data.event.id}/checkout`, {
      cart_items,
    });

    if (res.status === 201 && res.data) {
      // Success: Clear cart and redirect
      const orderId = res.data.order_id;
      store.clearAll();
      goto(resolve(`/orders/${orderId}/checkout`));
      return;
    }

    if (res.status === 409 && res.details) {
      // Conflict handling
      const missingSeats = res.details.missing_seats?.split(',').map(Number) || [];
      const missingGaSection = res.details.missing_ga_section;
      const missingShowId = Number(res.details.show_id);

      const newConflicts: typeof conflicts = [];

      // Process missing assigned seats
      for (const seatId of missingSeats) {
        for (const cart of activeCarts) {
          const seat = cart.selectedSeats.find((s) => s.id === seatId);
          if (seat) {
            newConflicts.push({
              label: `Ghế ${seat.label}`,
              showName: cart.showLabel,
              type: 'seat',
            });
            store.removeSeatFromShow(cart.showId, seatId);
          }
        }
      }

      // Process missing GA section
      if (missingGaSection) {
        const cart = activeCarts.find((c) => c.showId === missingShowId);
        if (cart) {
          const sectionName =
            store.getSectionName(missingShowId, Number(missingGaSection)) || 'Khu vực đứng';
          newConflicts.push({
            label: sectionName,
            showName: cart.showLabel,
            type: 'section',
          });
          store.setGeneralQuantityForShow(missingShowId, Number(missingGaSection), 0);
        }
      }

      if (newConflicts.length > 0) {
        conflicts = newConflicts;
        showConflictModal = true;
      }
    } else if (res.status === 400 && res.error === 'MAX_TICKETS_EXCEEDED') {
      toast.error('Vượt quá giới hạn vé của sự kiện');
    }

    isSubmitting = false;
  }

  let showTitle = $derived(getShowLabel(currentShow));

  // Check if a show has items in the cart
  function showHasItems(showId: number): boolean {
    const cart = store.carts[showId];
    if (!cart) return false;
    return (
      cart.selectedSeats.length > 0 ||
      Object.values(cart.generalQuantities).some((q: number) => q > 0)
    );
  }
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

  <!-- Show Switcher (only if multiple shows) -->
  {#if allShows.length > 1}
    <div
      class="relative z-20 border-b border-border/20 bg-surface-container-lowest/70 backdrop-blur-sm"
    >
      <div class="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
        <div class="relative z-20">
          <!-- Trigger button -->
          <button
            type="button"
            class="flex w-full cursor-pointer items-center justify-between rounded-xl border border-border/40 bg-surface-container-low px-4 py-2.5 transition-colors hover:bg-surface-container-high"
            onclick={() => (showPickerOpen = !showPickerOpen)}
          >
            <div class="flex items-center gap-3">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Calendar class="h-4 w-4 text-primary" />
              </div>
              <div class="text-left">
                <p class="text-xs font-semibold text-foreground">
                  {formatShortDate(currentShow.show_date)} • {formatTime(currentShow.start_time)}
                </p>
                <p class="text-[10px] text-muted-foreground">
                  Nhấn để chuyển suất diễn ({allShows.length} suất)
                </p>
              </div>
            </div>
            <ChevronDown
              class="h-4 w-4 text-muted-foreground transition-transform {showPickerOpen
                ? 'rotate-180'
                : ''}"
            />
          </button>

          <!-- Dropdown -->
          {#if showPickerOpen}
            <!-- Backdrop -->
            <button
              class="fixed inset-0 z-30 bg-transparent"
              onclick={() => (showPickerOpen = false)}
              aria-label="Đóng"
            ></button>

            <div
              class="absolute right-0 left-0 z-40 mt-1 overflow-hidden rounded-xl border border-border/40 bg-surface-container-lowest shadow-xl"
              transition:fly={{ y: -8, duration: 200 }}
            >
              <div class="max-h-64 overflow-y-auto p-1.5">
                {#each allShows as show (show.id)}
                  {@const isActive = show.id === currentShowId}
                  {@const hasItems = showHasItems(show.id)}
                  <button
                    type="button"
                    class="my-0.5 flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors {isActive
                      ? 'bg-primary/10 ring-1 ring-primary/30'
                      : 'hover:bg-surface-container-high'}"
                    onclick={() => switchShow(show.id)}
                  >
                    <div
                      class="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg {isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-surface-container-high text-foreground'}"
                    >
                      <span class="text-[9px] leading-tight font-bold uppercase">
                        {formatShortDate(show.show_date).split(',')[0]?.trim() ?? ''}
                      </span>
                      <span class="text-xs leading-tight font-bold">
                        {getDayInTZ(show.show_date)}
                      </span>
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-semibold text-foreground">
                        {show.title || formatShortDate(show.show_date)}
                      </p>
                      <div class="flex items-center gap-2">
                        <div class="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock class="h-3 w-3" />
                          {formatTime(show.start_time)}
                          {#if show.end_time}
                            – {formatTime(show.end_time)}
                          {/if}
                        </div>
                        {#if hasItems}
                          <span
                            class="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary"
                          >
                            Có vé trong giỏ
                          </span>
                        {/if}
                      </div>
                    </div>
                    {#if isActive}
                      <div class="h-2 w-2 shrink-0 rounded-full bg-primary"></div>
                    {/if}
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- Loading overlay -->
  {#if isLoadingSeatMap}
    <div class="flex items-center justify-center py-20">
      <div class="flex flex-col items-center gap-3">
        <LoaderCircle class="h-8 w-8 animate-spin text-primary" />
        <p class="text-sm text-muted-foreground">Đang tải sơ đồ ghế...</p>
      </div>
    </div>
  {:else}
    <!-- Main content -->
    <main class="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <SeatMap sections={seatMap.sections} {mapConfig} {stageLayout} {store} />
    </main>
  {/if}

  <!-- Sticky summary bar -->
  <SummaryBar
    {store}
    onCheckout={handleCheckout}
    maxTickets={event.max_tickets_per_user}
    multiShowEvent={allShows.length > 1}
    isLoading={isSubmitting}
  />

  <ConflictModal
    open={showConflictModal}
    {conflicts}
    onConfirm={() => {
      showConflictModal = false;
      handleCheckout();
    }}
    onClose={() => (showConflictModal = false)}
  />
</div>
