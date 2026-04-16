<script lang="ts">
  import type { SeatSelectionStore } from '$lib/stores/seat-selection-store.svelte';
  import { formatPrice } from '$lib/utils/price';
  import { ArrowRight, ShoppingCart } from 'lucide-svelte';

  interface Props {
    store: SeatSelectionStore;
    onCheckout: () => void;
    maxTickets: number;
  }

  let { store, onCheckout, maxTickets }: Props = $props();

  let summaryLabels = $derived(store.getSummaryLabels());
  let hasSelection = $derived(store.totalCount > 0);
</script>

{#if hasSelection}
  <div
    class="fixed right-0 bottom-0 left-0 z-50 border-t border-border/40 bg-surface-container-lowest/95 shadow-2xl backdrop-blur-md"
  >
    <div
      class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8"
    >
      <!-- Left: selected info -->
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <ShoppingCart class="h-4 w-4 shrink-0 text-primary" />
          <span class="text-xs font-semibold text-foreground sm:text-sm">
            {store.totalCount} vé
            {#if maxTickets > 0}
              <span class="text-muted-foreground">/ tối đa {maxTickets}</span>
            {/if}
          </span>
        </div>
        <p
          class="mt-0.5 truncate text-[11px] text-muted-foreground sm:text-xs"
          title={summaryLabels}
        >
          {summaryLabels}
        </p>
      </div>

      <!-- Right: total + button -->
      <div class="flex shrink-0 items-center gap-3">
        <div class="text-right">
          <p class="text-[10px] text-muted-foreground">Tổng cộng</p>
          <p class="text-lg font-extrabold text-foreground sm:text-xl">
            {formatPrice(store.totalPrice)}
          </p>
        </div>
        <button
          type="button"
          class="btn-primary-gradient flex items-center gap-2 px-5 py-2.5 text-sm"
          onclick={onCheckout}
        >
          Tiếp tục
          <ArrowRight class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
{/if}
