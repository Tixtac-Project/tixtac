<script lang="ts">
  import type { SeatSelectionStore } from '$lib/stores/cart-store.svelte';
  import type { SeatMapSeat, SeatMapSection } from '$lib/types/seat-map';
  import { formatPrice } from '$lib/utils/price';
  import { getRowLabel } from '$lib/utils/seat-label';
  import { Minus, Plus } from 'lucide-svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import SeatItem from './SeatItem.svelte';

  interface Props {
    section: SeatMapSection;
    store: SeatSelectionStore;
  }

  let { section, store }: Props = $props();

  // Whether user can pick individual seats (all assigned sections are now pickable)
  let isPickable = $derived(section.type === 'assigned');

  // Build seat lookup map: "rowLabel-colNumber" -> seat
  let seatLookup = $derived.by(() => {
    const map = new SvelteMap<string, SeatMapSeat>();
    for (const seat of section.seats) {
      map.set(`${seat.row_label}-${seat.col_number}`, seat);
    }
    return map;
  });

  // Generate row labels
  let rowLabels = $derived.by(() => {
    const cfg = section.seat_config;
    const labels: string[] = [];
    for (let r = 0; r < cfg.rows; r++) {
      if (cfg.rowFormat === 'alphabetic') {
        labels.push(getRowLabel(cfg.startRowIndex + r - 1));
      } else {
        labels.push(String(cfg.startRowIndex + r));
      }
    }
    return labels;
  });

  // Generate col numbers
  let colNumbers = $derived.by(() => {
    const cfg = section.seat_config;
    const cols: number[] = [];
    for (let c = 0; c < cfg.cols; c++) {
      if (cfg.colDirection === 'ltr') {
        cols.push(cfg.startColIndex + c);
      } else {
        cols.push(cfg.startColIndex + (cfg.cols - 1 - c));
      }
    }
    return cols;
  });

  // Calculate seat size to fit within layout bounds
  let seatSize = $derived.by(() => {
    const cfg = section.seat_config;
    const lc = section.layout_config;
    if (cfg.rows <= 0 || cfg.cols <= 0) return 28;
    const gap = 2;
    const availW = lc.width - (cfg.cols - 1) * gap;
    const availH = lc.height - (cfg.rows - 1) * gap;
    const cellW = availW / cfg.cols;
    const cellH = availH / cfg.rows;
    return Math.max(8, Math.min(36, Math.floor(Math.min(cellW, cellH))));
  });

  let seatGap = $derived(seatSize > 16 ? 2 : 1);

  function handleSeatClick(seat: SeatMapSeat) {
    if (!isPickable) return;
    const prefix = seat.prefix ? `${seat.prefix}-` : '';
    const label = `${prefix}${seat.row_label}${seat.col_number}`;
    store.toggleSeat(seat.id, label, section.id, section.name, Number(section.price));
  }

  // Availability count for non-pickable assigned & general sections
  let availableCount = $derived.by(() => {
    if (section.type === 'general') {
      const sold = section.seats.filter((s) => s.status === 'sold' || s.status === 'locked').length;
      return section.capacity - sold;
    }
    // For assigned non-pickable, count available seats
    return section.seats.filter((s) => s.status === 'available').length;
  });

  // Quantity controls for non-pickable assigned & general
  let quantity = $derived(store.getGeneralQuantity(section.id));

  function increment() {
    if (quantity < availableCount) {
      store.setGeneralQuantity(section.id, quantity + 1);
    }
  }

  function decrement() {
    if (quantity > 0) {
      store.setGeneralQuantity(section.id, quantity - 1);
    }
  }
</script>

{#if section.type === 'assigned' && isPickable}
  <!-- Assigned seating with individual seat picking -->
  <div
    class="relative"
    style="width:{section.layout_config.width}px;height:{section.layout_config.height}px;"
  >
    <!-- Section background -->
    <div
      class="absolute inset-0 rounded-md opacity-15"
      style="background-color:{section.layout_config.color};"
    ></div>

    <!-- Seat grid positioned inside -->
    <div
      class="absolute inset-0 flex flex-wrap content-start items-start justify-start p-0"
      style="gap:{seatGap}px;"
    >
      {#each rowLabels as rowLabel (rowLabel)}
        {#each colNumbers as col (`${rowLabel}-${col}`)}
          {@const seat = seatLookup.get(`${rowLabel}-${col}`)}
          {#if seat}
            <SeatItem
              {seat}
              selected={store.isSeatSelected(seat.id)}
              sectionColor={section.layout_config.color}
              size={seatSize}
              onclick={() => handleSeatClick(seat)}
            />
          {:else}
            <div style="width:{seatSize}px;height:{seatSize}px;"></div>
          {/if}
        {/each}
      {/each}
    </div>

    <!-- Section label overlay -->
    <div class="pointer-events-none absolute inset-x-0 -top-5 flex items-center gap-1.5">
      <div
        class="h-2.5 w-2.5 rounded-full"
        style="background-color:{section.layout_config.color};"
      ></div>
      <span class="text-[10px] font-bold text-foreground">{section.name}</span>
      <span class="text-[9px] text-muted-foreground">({formatPrice(Number(section.price))})</span>
    </div>
  </div>
{:else if section.type === 'assigned' && !isPickable}
  <!-- Assigned seating without individual picking (auto-assign, quantity select) -->
  <div
    class="relative"
    style="width:{section.layout_config.width}px;height:{section.layout_config.height}px;"
  >
    <!-- Section background -->
    <div
      class="absolute inset-0 rounded-md opacity-15"
      style="background-color:{section.layout_config.color};"
    ></div>

    <!-- Seat grid (display only, not clickable) -->
    <div
      class="absolute inset-0 flex flex-wrap content-start items-start justify-start p-0"
      style="gap:{seatGap}px;"
    >
      {#each rowLabels as rowLabel (rowLabel)}
        {#each colNumbers as col (`${rowLabel}-${col}`)}
          {@const seat = seatLookup.get(`${rowLabel}-${col}`)}
          {#if seat}
            <SeatItem
              {seat}
              selected={false}
              sectionColor={section.layout_config.color}
              size={seatSize}
              onclick={() => {}}
            />
          {:else}
            <div style="width:{seatSize}px;height:{seatSize}px;"></div>
          {/if}
        {/each}
      {/each}
    </div>

    <!-- Quantity selector overlay — positioned above the section label -->
    <div class="absolute inset-x-0 -top-10 flex items-center justify-center gap-1.5">
      <div
        class="flex items-center gap-1.5 rounded-xl px-2.5 py-1 shadow-md"
        style="background-color:{section.layout_config.color}20;border:1px solid {section
          .layout_config.color}50;"
      >
        <button
          type="button"
          class="flex size-6 cursor-pointer items-center justify-center rounded-lg bg-white/60 text-foreground transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-30"
          disabled={quantity <= 0}
          onclick={decrement}
          aria-label="Giảm số lượng vé"
        >
          <Minus class="size-3" />
        </button>
        <span class="min-w-5 text-center text-sm font-extrabold text-foreground tabular-nums">
          {quantity}
        </span>
        <button
          type="button"
          class="flex size-6 cursor-pointer items-center justify-center rounded-lg bg-cta text-cta-foreground shadow-sm transition-all hover:bg-cta-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
          disabled={quantity >= availableCount}
          onclick={increment}
          aria-label="Tăng số lượng vé"
        >
          <Plus class="size-3" />
        </button>
      </div>
    </div>

    <!-- Section label overlay -->
    <div class="pointer-events-none absolute inset-x-0 -top-5 flex items-center gap-1.5">
      <div
        class="h-2.5 w-2.5 rounded-full"
        style="background-color:{section.layout_config.color};"
      ></div>
      <span class="text-[10px] font-bold text-foreground">{section.name}</span>
      <span class="text-[9px] text-muted-foreground">({formatPrice(Number(section.price))})</span>
      <span class="text-[9px] text-muted-foreground">• Còn {availableCount}</span>
    </div>
  </div>
{:else}
  <!-- General admission panel (standing tickets) -->
  <div
    class="relative flex flex-col rounded-xl p-3.5"
    style="width:{section.layout_config.width}px;height:{section.layout_config
      .height}px;background-color:{section.layout_config.color}15;border:2px solid {section
      .layout_config.color}40;"
  >
    <!-- Header row: section name + availability -->
    <div class="mb-2.5 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <div
          class="size-3 shrink-0 rounded-sm"
          style="background-color:{section.layout_config.color};"
        ></div>
        <span class="truncate text-sm font-bold text-foreground">{section.name}</span>
      </div>
      <span
        class="shrink-0 rounded-full bg-background/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
      >
        {availableCount}/{section.capacity}
      </span>
    </div>

    <!-- Price line -->
    <p class="mb-3 text-xs text-muted-foreground">
      Vé đứng • {formatPrice(Number(section.price))} / vé
    </p>

    <!-- Quantity selector — prominent CTA-style -->
    <div class="mt-auto flex items-center justify-center gap-2.5">
      <button
        type="button"
        class="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-primary/90 text-primary-foreground shadow-sm transition-all hover:bg-primary hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
        disabled={quantity <= 0}
        onclick={decrement}
        aria-label="Giảm số lượng vé"
      >
        <Minus class="size-4" />
      </button>
      <div class="flex min-w-[3rem] flex-col items-center">
        <span class="text-2xl leading-none font-extrabold text-foreground tabular-nums">
          {quantity}
        </span>
        <span class="text-[9px] text-muted-foreground">vé đã chọn</span>
      </div>
      <button
        type="button"
        class="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-cta text-cta-foreground shadow-sm shadow-cta/25 transition-all hover:bg-cta-hover hover:shadow-md hover:shadow-cta/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
        disabled={quantity >= availableCount}
        onclick={increment}
        aria-label="Tăng số lượng vé"
      >
        <Plus class="size-4" />
      </button>
    </div>
  </div>
{/if}
