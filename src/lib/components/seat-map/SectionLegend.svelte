<script lang="ts">
  import type { SeatSelectionStore } from '$lib/stores/cart-store.svelte';
  import { toast } from '$lib/stores/toast';
  import type { SeatMapSection } from '$lib/types/seat-map';
  import { formatPrice } from '$lib/utils/price';
  import { Minus, Plus } from 'lucide-svelte';

  interface Props {
    sections: SeatMapSection[];
    store: SeatSelectionStore;
  }

  let { sections, store }: Props = $props();

  function availableCount(section: SeatMapSection): number {
    if (section.type === 'general') {
      const used = section.seats.filter((s) => s.status === 'sold' || s.status === 'locked').length;
      return section.capacity - used;
    }
    return section.seats.filter((s) => s.status === 'available').length;
  }

  function needsQuantityControl(section: SeatMapSection): boolean {
    return section.type === 'general';
  }

  function getQuantity(sectionId: number): number {
    return store.getGeneralQuantity(sectionId);
  }

  let lastLimitToastTime = 0;
  const LIMIT_TOAST_COOLDOWN = 2000;

  function showLimitToast() {
    const now = Date.now();
    if (now - lastLimitToastTime < LIMIT_TOAST_COOLDOWN) return;
    lastLimitToastTime = now;
    toast.warning(`Bạn chỉ được chọn tối đa ${store.maxTickets} vé.`);
  }

  function increment(section: SeatMapSection) {
    const qty = getQuantity(section.id);
    const avail = availableCount(section);
    if (store.isAtLimit) {
      showLimitToast();
      return;
    }
    if (qty < avail) {
      store.setGeneralQuantity(section.id, qty + 1);
    }
  }

  function decrement(section: SeatMapSection) {
    const qty = getQuantity(section.id);
    if (qty > 0) {
      store.setGeneralQuantity(section.id, qty - 1);
    }
  }
</script>

<div class="flex flex-col gap-3">
  <h3 class="text-xs font-bold tracking-wide text-foreground uppercase">Khu vực</h3>

  {#each [...sections].sort((a, b) => {
    if (a.type === 'general' && b.type !== 'general') return -1;
    if (a.type !== 'general' && b.type === 'general') return 1;
    return 0;
  }) as section (section.id)}
    {@const avail = availableCount(section)}
    {@const total =
      section.type === 'general'
        ? section.capacity
        : section.seats.filter((s) => s.status !== 'disabled').length}
    {@const isGA = needsQuantityControl(section)}
    {@const qty = getQuantity(section.id)}
    {@const atLimit = store.isAtLimit}

    <div class="rounded-lg bg-surface-container-low p-3">
      <!-- Section header -->
      <div class="mb-1 flex items-center gap-2">
        <div
          class="h-3 w-3 shrink-0 rounded-sm"
          style="background-color:{section.layout_config.color};"
        ></div>
        <span class="text-xs leading-tight font-bold text-foreground">{section.name}</span>
        {#if isGA}
          <span
            class="ml-auto rounded-sm bg-cta-muted px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-cta-muted-foreground uppercase"
          >
            GA
          </span>
        {/if}
      </div>

      <!-- Info row -->
      <div class="mb-1 flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>{section.type === 'general' ? 'Vé đứng' : 'Chọn ghế'}</span>
        <span>•</span>
        <span>{formatPrice(Number(section.price))}</span>
      </div>

      <!-- Availability + quantity on same row for GA -->
      {#if isGA}
        <div class="mt-2.5 flex items-center justify-between gap-2">
          <!-- Availability -->
          <div class="text-[10px] text-muted-foreground">
            Còn: <span class="font-semibold text-foreground">{avail}</span>
            <span class="opacity-50">/ {total}</span>
          </div>

          <!-- Quantity control — uses CTA orange -->
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg
                     border border-border bg-surface-container-high
                     text-foreground transition-all
                     hover:border-cta/40 hover:bg-cta-muted hover:text-cta-muted-foreground
                     active:scale-90
                     disabled:cursor-not-allowed disabled:opacity-30
                     disabled:hover:border-border disabled:hover:bg-surface-container-high disabled:hover:text-foreground"
              disabled={qty <= 0}
              onclick={() => decrement(section)}
              aria-label="Giảm số lượng"
            >
              <Minus class="h-3.5 w-3.5" />
            </button>

            <span
              class="min-w-[2rem] text-center text-sm font-black text-foreground tabular-nums
                     {qty > 0 ? 'text-cta' : ''}"
            >
              {qty}
            </span>

            <button
              type="button"
              class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg
                     transition-all active:scale-90
                     disabled:cursor-not-allowed disabled:opacity-30
                     {qty > 0
                ? 'bg-cta text-cta-foreground shadow-sm shadow-cta/30 hover:bg-cta-hover disabled:bg-surface-container-high disabled:text-foreground disabled:shadow-none'
                : 'border border-border bg-surface-container-high text-foreground hover:border-cta/40 hover:bg-cta-muted hover:text-cta-muted-foreground disabled:hover:border-border disabled:hover:bg-surface-container-high disabled:hover:text-foreground'}"
              disabled={qty >= avail || (atLimit && qty === getQuantity(section.id))}
              onclick={() => increment(section)}
              aria-label="Tăng số lượng"
            >
              <Plus class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      {:else}
        <!-- Non-GA: availability on its own row -->
        <div class="text-[10px] text-muted-foreground">
          Còn trống: <span class="font-semibold text-foreground">{avail}</span>
          <span class="opacity-50">/ {total}</span>
        </div>
      {/if}
    </div>
  {/each}
</div>
