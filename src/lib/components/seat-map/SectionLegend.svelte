<script lang="ts">
  import type { SeatSelectionStore } from '$lib/stores/seat-selection-store.svelte';
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
    return section.type === 'general' || !section.is_seat_pickable;
  }

  function getQuantity(sectionId: number): number {
    return store.getGeneralQuantity(sectionId);
  }

  function increment(section: SeatMapSection) {
    const qty = getQuantity(section.id);
    const avail = availableCount(section);
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

  {#each sections as section (section.id)}
    {@const avail = availableCount(section)}
    {@const total =
      section.type === 'general'
        ? section.capacity
        : section.seats.filter((s) => s.status !== 'disabled').length}
    {@const isGA = needsQuantityControl(section)}
    {@const qty = getQuantity(section.id)}

    <div class="rounded-lg bg-surface-container-low p-3">
      <!-- Section header -->
      <div class="mb-1 flex items-center gap-2">
        <div
          class="h-3 w-3 shrink-0 rounded-sm"
          style="background-color:{section.layout_config.color};"
        ></div>
        <span class="text-xs leading-tight font-bold text-foreground">{section.name}</span>
      </div>

      <!-- Info row -->
      <div class="mb-1 flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>
          {section.type === 'general'
            ? 'Vé đứng'
            : section.is_seat_pickable
              ? 'Chọn ghế'
              : 'Tự động xếp'}
        </span>
        <span>•</span>
        <span>{formatPrice(Number(section.price))}</span>
      </div>

      <!-- Availability -->
      <div class="text-[10px] text-muted-foreground">
        Còn trống: <span class="font-semibold text-foreground">{avail}</span>
        / {total}
      </div>

      <!-- Quantity control for GA / non-pickable -->
      {#if isGA}
        <div class="mt-2 flex items-center gap-2">
          <button
            type="button"
            class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-surface-container-high text-foreground transition-colors hover:bg-surface-container-highest disabled:cursor-not-allowed disabled:opacity-40"
            disabled={qty <= 0}
            onclick={() => decrement(section)}
          >
            <Minus class="h-3 w-3" />
          </button>
          <span class="min-w-6 text-center text-sm font-bold text-foreground">{qty}</span>
          <button
            type="button"
            class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-surface-container-high text-foreground transition-colors hover:bg-surface-container-highest disabled:cursor-not-allowed disabled:opacity-40"
            disabled={qty >= avail}
            onclick={() => increment(section)}
          >
            <Plus class="h-3 w-3" />
          </button>
        </div>
      {/if}
    </div>
  {/each}
</div>
