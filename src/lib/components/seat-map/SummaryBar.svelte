<script lang="ts">
  import type { SeatSelectionStore, ShowCart } from '$lib/stores/seat-selection-store.svelte';
  import { formatPrice } from '$lib/utils/price';
  import {
    ArrowRight,
    Calendar,
    ChevronDown,
    ChevronsUp,
    ChevronUp,
    ShieldAlert,
    ShoppingCart,
    Trash2,
    X,
  } from 'lucide-svelte';
  import { fade, fly } from 'svelte/transition';

  interface Props {
    store: SeatSelectionStore;
    onCheckout: () => void;
    maxTickets: number;
    /** Whether the event has multiple shows (always show per-show grouping) */
    multiShowEvent?: boolean;
  }

  let { store, onCheckout, maxTickets, multiShowEvent = false }: Props = $props();

  let expanded = $state(false);
  let hasSelection = $derived(store.totalCount > 0);

  /** Get all active carts (carts with selections) */
  let activeCarts = $derived(store.getActiveCarts());
  let isMultiShow = $derived(multiShowEvent || activeCarts.length > 1);

  /** Group selected assigned seats by section for a given cart */
  function groupSeatsBySection(cart: ShowCart) {
    const groups: Record<
      number,
      { sectionName: string; seats: { id: number; label: string; price: number }[] }
    > = {};
    for (const seat of cart.selectedSeats) {
      if (!groups[seat.sectionId]) {
        groups[seat.sectionId] = { sectionName: seat.sectionName, seats: [] };
      }
      groups[seat.sectionId].seats.push({ id: seat.id, label: seat.label, price: seat.price });
    }
    return groups;
  }

  /** General admission entries for a given cart */
  function getGeneralEntries(cart: ShowCart) {
    const entries: {
      sectionId: number;
      sectionName: string;
      qty: number;
    }[] = [];
    for (const [sectionId, qty] of Object.entries(cart.generalQuantities)) {
      if (qty > 0) {
        const sid = Number(sectionId);
        const name = store.getSectionName(cart.showId, sid) ?? `Khu vực #${sid}`;
        entries.push({
          sectionId: sid,
          sectionName: name,
          qty,
        });
      }
    }
    return entries;
  }

  function toggleExpand() {
    expanded = !expanded;
  }

  function handleRemoveSeat(showId: number, seatId: number) {
    store.removeSeatFromShow(showId, seatId);
  }

  function handleClearAll() {
    store.clearAll();
    expanded = false;
  }

  function handleClearShow(showId: number) {
    store.clearShow(showId);
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

        <!-- Warning banner -->
        <div
          class="mx-4 mb-2 flex items-start gap-2 rounded-lg border border-warning-border bg-warning-muted px-3 py-2 sm:mx-6 lg:mx-8"
        >
          <ShieldAlert class="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <p class="text-[12px] leading-snug text-warning-muted-foreground md:text-sm">
            Vé trong giỏ <span class="font-bold">chưa được giữ chỗ</span>
            và có thể bị người khác đặt trước. Hãy nhấn
            <span class="font-bold">Tiếp tục</span>
            để tiến hành thanh toán sớm nhất có thể.
          </p>
        </div>

        <!-- Cart items (scrollable) -->
        <div class="flex-1 space-y-3 overflow-y-auto px-4 pb-20 sm:px-6 lg:px-8">
          {#each activeCarts as cart (cart.showId)}
            {@const groupedSeats = groupSeatsBySection(cart)}
            {@const generalEntries = getGeneralEntries(cart)}

            <!-- Show card — wraps all tickets for this show -->
            <div
              class="overflow-hidden rounded-xl border {isMultiShow
                ? 'border-primary/20'
                : 'border-border/30'}"
            >
              <!-- Show header (always show if multi-show, compact if single) -->
              {#if isMultiShow}
                <div
                  class="flex items-center justify-between border-b border-primary/10 bg-primary/5 px-3 py-2"
                >
                  <div class="flex items-center gap-2">
                    <Calendar class="h-3.5 w-3.5 text-primary" />
                    <span class="text-sm font-bold text-primary">
                      {cart.showLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    class="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    onclick={() => handleClearShow(cart.showId)}
                    title="Xóa vé suất này"
                  >
                    <Trash2 class="h-3 w-3" />
                  </button>
                </div>
              {/if}

              <!-- Tickets content inside the show card -->
              <div class="divide-y divide-border/20 bg-surface-container-low">
                <!-- Assigned seats grouped by section -->
                {#each Object.entries(groupedSeats) as [_sectionId, group] (_sectionId)}
                  <div class="px-3 py-2.5">
                    <p
                      class="mb-1.5 text-[12px] font-semibold tracking-wide text-primary uppercase"
                    >
                      {group.sectionName}
                    </p>
                    <div class="mx-2 space-y-2">
                      {#each group.seats as seat (seat.id)}
                        <div class="flex items-center justify-between gap-2 text-[12px]">
                          <span
                            class="inline-flex h-5 items-center rounded bg-surface-container-highest px-1.5 font-semibold text-foreground"
                          >
                            {seat.label}
                          </span>
                          <div class="flex shrink-0 items-center gap-1.5">
                            <span class="font-semibold text-foreground">
                              {formatPrice(seat.price)}
                            </span>
                            <button
                              type="button"
                              class="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              onclick={() => handleRemoveSeat(cart.showId, seat.id)}
                              title="Xóa ghế {seat.label}"
                            >
                              <X class="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/each}

                <!-- General admission -->
                {#each generalEntries as entry (entry.sectionId)}
                  <div class="flex items-center justify-between px-3 py-2.5 text-[12px]">
                    <div>
                      <p class=" font-semibold tracking-wide text-primary uppercase">
                        {entry.sectionName}
                      </p>
                      <p class="mx-2 mt-0.5 font-semibold">
                        Vé đứng × {entry.qty}
                      </p>
                    </div>
                    <button
                      type="button"
                      class="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      onclick={() =>
                        store.setGeneralQuantityForShow(cart.showId, entry.sectionId, 0)}
                      title="Xóa vé"
                    >
                      <X class="h-3 w-3" />
                    </button>
                  </div>
                {/each}
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
            class="flex w-full cursor-pointer flex-col items-center gap-0 opacity-50 transition-opacity hover:opacity-80 md:hidden"
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
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted-foreground">Tổng cộng</span>
          {#if isMultiShow}
            <span
              class="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary"
            >
              {activeCarts.length} suất
            </span>
          {/if}
        </div>
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
              {#if isMultiShow}
                {activeCarts.length} suất diễn • Nhấn để xem chi tiết
              {:else}
                Nhấn để xem chi tiết
              {/if}
            </p>
          </div>
          <!-- Up/Down toggle icon -->
          <div
            class="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high transition-colors md:flex"
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
