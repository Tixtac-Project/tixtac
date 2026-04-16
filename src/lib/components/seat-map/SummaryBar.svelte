<script lang="ts">
  import type { SeatSelectionStore } from '$lib/stores/seat-selection-store.svelte';
  import { formatPrice } from '$lib/utils/price';
  import {
    ArrowRight,
    ChevronDown,
    ChevronsUp,
    ChevronUp,
    ShoppingCart,
    Trash2,
    X,
  } from 'lucide-svelte';
  import { fade, fly } from 'svelte/transition';

  interface Props {
    store: SeatSelectionStore;
    onCheckout: () => void;
    maxTickets: number;
  }

  let { store, onCheckout, maxTickets }: Props = $props();

  let expanded = $state(false);
  let hasSelection = $derived(store.totalCount > 0);

  /** Group selected assigned seats by section */
  let groupedSeats = $derived.by(() => {
    const groups: Record<
      number,
      { sectionName: string; seats: { id: number; label: string; price: number }[] }
    > = {};
    for (const seat of store.selectedSeats) {
      if (!groups[seat.sectionId]) {
        groups[seat.sectionId] = { sectionName: seat.sectionName, seats: [] };
      }
      groups[seat.sectionId].seats.push({ id: seat.id, label: seat.label, price: seat.price });
    }
    return groups;
  });

  /** General admission entries */
  let generalEntries = $derived.by(() => {
    const entries: {
      sectionId: number;
      sectionName: string;
      qty: number;
      unitPrice: number;
      total: number;
    }[] = [];
    for (const [sectionId, qty] of Object.entries(store.generalQuantities)) {
      if (qty > 0) {
        const sid = Number(sectionId);
        entries.push({
          sectionId: sid,
          sectionName: `Khu vực #${sid}`,
          qty,
          unitPrice: 0,
          total: 0,
        });
      }
    }
    return entries;
  });

  function toggleExpand() {
    expanded = !expanded;
  }

  function handleRemoveSeat(seatId: number) {
    store.toggleSeat(seatId, '', 0, '', 0);
  }

  function handleClearAll() {
    store.clearAll();
    expanded = false;
  }
</script>

{#if hasSelection}
  <!-- Backdrop when expanded -->
  {#if expanded}
    <button
      class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
      onclick={() => (expanded = false)}
      aria-label="Đóng giỏ vé"
      transition:fade={{ duration: 200 }}
    ></button>
  {/if}

  <div class="fixed right-0 bottom-0 left-0 z-50 flex flex-col">
    <!-- Expandable cart items panel -->
    {#if expanded}
      <div
        class="flex max-h-[60vh] flex-col overflow-hidden rounded-t-2xl bg-surface-container-lowest shadow-2xl"
        transition:fly={{ y: 300, duration: 300, opacity: 1 }}
      >
        <!-- Drag handle indicator -->
        <div class="flex justify-center pt-3 pb-1">
          <div class="h-1 w-10 rounded-full bg-outline-variant/50"></div>
        </div>

        <!-- Header -->
        <div class="flex items-center justify-between px-4 pt-1 pb-3 sm:px-6 lg:px-8">
          <div class="flex items-center gap-2">
            <ShoppingCart class="h-4 w-4 text-primary" />
            <h3 class="text-sm font-bold text-foreground">Giỏ vé của bạn</h3>
            <span class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {store.totalCount}
            </span>
          </div>
          <div class="flex items-center gap-2">
            {#if store.totalCount > 0}
              <button
                type="button"
                class="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs text-destructive transition-colors hover:bg-destructive/10"
                onclick={handleClearAll}
              >
                <Trash2 class="h-3 w-3" />
                Xóa tất cả
              </button>
            {/if}
            <button
              type="button"
              class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-container-high"
              onclick={() => (expanded = false)}
            >
              <X class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Cart items (scrollable) — extra pb to clear the bottom bar -->
        <div class="flex-1 space-y-3 overflow-y-auto px-4 pb-20 sm:px-6 lg:px-8">
          <!-- Assigned seats grouped by section -->
          {#each Object.entries(groupedSeats) as [_sectionId, group] (_sectionId)}
            <div class="rounded-xl bg-surface-container-low p-3">
              <p class="mb-2 text-[11px] font-semibold tracking-wide text-primary uppercase">
                {group.sectionName}
              </p>
              <div class="space-y-1.5">
                {#each group.seats as seat (seat.id)}
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex min-w-0 items-center gap-2">
                      <span
                        class="inline-flex h-6 items-center rounded-md bg-surface-container-highest px-2 text-[11px] font-semibold text-foreground"
                      >
                        {seat.label}
                      </span>
                    </div>
                    <div class="flex shrink-0 items-center gap-2">
                      <span class="text-xs font-semibold text-foreground">
                        {formatPrice(seat.price)}
                      </span>
                      <button
                        type="button"
                        class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        onclick={() => handleRemoveSeat(seat.id)}
                        title="Xóa ghế {seat.label}"
                      >
                        <X class="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/each}

          <!-- General admission -->
          {#each generalEntries as entry (entry.sectionId)}
            <div class="rounded-xl bg-surface-container-low p-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-[11px] font-semibold tracking-wide text-primary uppercase">
                    {entry.sectionName}
                  </p>
                  <p class="mt-0.5 text-xs text-muted-foreground">Vé đứng × {entry.qty}</p>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    onclick={() => store.setGeneralQuantity(entry.sectionId, 0)}
                    title="Xóa vé"
                  >
                    <X class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          {/each}

          {#if store.totalCount === 0}
            <p class="py-4 text-center text-sm text-muted-foreground">Giỏ vé trống</p>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Bottom bar (always visible) -->
    <div
      class="border-t border-border/40 bg-surface-container-lowest/95 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-md"
    >
      <!-- Pull-up indicator strip -->
      {#if !expanded}
        <div class="flex justify-center pt-2">
          <button
            type="button"
            class="flex cursor-pointer flex-col items-center gap-0 opacity-50 transition-opacity hover:opacity-80"
            onclick={toggleExpand}
            aria-label="Mở giỏ vé"
          >
            <ChevronsUp class="h-4 w-4 animate-bounce text-muted-foreground" />
          </button>
        </div>
      {/if}

      <!-- Total price row -->
      <div
        class="mx-auto flex max-w-7xl items-center justify-between gap-4 border-b border-border/20 px-4 py-1.5 sm:px-6 lg:px-8"
      >
        <span class="text-xs text-muted-foreground">Tổng cộng</span>
        <span class="text-base font-extrabold text-foreground sm:text-lg">
          {formatPrice(store.totalPrice)}
        </span>
      </div>

      <!-- Main bar row -->
      <div
        class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-8"
      >
        <!-- Left: expand toggle + selected info -->
        <button
          type="button"
          class="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
          onclick={toggleExpand}
        >
          <div class="relative">
            <ShoppingCart class="h-5 w-5 text-primary" />
            <span
              class="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground"
            >
              {store.totalCount}
            </span>
          </div>
          <div class="min-w-0 flex-1">
            <span class="text-xs font-semibold text-foreground sm:text-sm">
              {store.totalCount} vé đã chọn
              {#if maxTickets > 0}
                <span class="text-muted-foreground">/ tối đa {maxTickets}</span>
              {/if}
            </span>
            <p class="mt-0.5 truncate text-[11px] text-muted-foreground sm:text-xs">
              Nhấn để xem chi tiết
            </p>
          </div>
          <!-- Up/Down toggle icon -->
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high transition-colors"
          >
            {#if expanded}
              <ChevronDown class="h-4 w-4 text-foreground" />
            {:else}
              <ChevronUp class="h-4 w-4 text-foreground" />
            {/if}
          </div>
        </button>

        <!-- Right: checkout button -->
        <button
          type="button"
          class="btn-primary-gradient flex shrink-0 items-center gap-2 px-6 py-3 text-sm font-bold"
          onclick={onCheckout}
        >
          Tiếp tục
          <ArrowRight class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
{/if}
