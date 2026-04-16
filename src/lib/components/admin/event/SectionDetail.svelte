<!--
  SectionDetail.svelte
  Renders a single section's detail view — adaptive to assigned (seat grid) vs general admission (summary card).
-->
<script lang="ts">
  import * as Tooltip from '$lib/components/ui/tooltip';
  import { formatPrice } from '$lib/utils/price';
  import { getRowLabel } from '$lib/utils/seat-label';
  import { Armchair, Users } from 'lucide-svelte';

  type SeatInfo = { status: string; label: string };

  type SectionData = {
    id: number;
    name: string;
    type: string;
    price: number;
    capacity: number;
    layoutConfig: {
      x: number;
      y: number;
      width: number;
      height: number;
      rotation?: number;
      color?: string;
    };
    seatConfig: {
      rows: number;
      cols: number;
      prefix: string | null;
      rowFormat?: 'alphabetic' | 'numeric';
      colDirection?: 'ltr' | 'rtl';
      startRowIndex?: number;
      startColIndex?: number;
    } | null;
    stats: {
      total: number;
      available: number;
      locked: number;
      sold: number;
      disabled: number;
    };
    seatGrid: Record<string, Record<number, SeatInfo>>;
  };

  let { section }: { section: SectionData } = $props();

  const isAssigned = $derived(section.type === 'assigned');
  const seatCfg = $derived(section.seatConfig);
  const sectionRows = $derived(seatCfg?.rows ?? 0);
  const sectionCols = $derived(seatCfg?.cols ?? 0);
  const sectionStartRowIndex = $derived(seatCfg?.startRowIndex ?? 1);
  const sectionStartColIndex = $derived(seatCfg?.startColIndex ?? 1);
  const color = $derived(section.layoutConfig?.color || '#3b82f6');

  // GA stats
  const gaCapacity = $derived(section.capacity);
  // For GA sections, stats.total represents sold/locked count from order system
  // available = capacity - sold - locked (simplified)
  const gaSold = $derived(section.stats.sold);
  const gaLocked = $derived(section.stats.locked);
  const gaAvailable = $derived(gaCapacity - gaSold - gaLocked);
  const usedPercent = $derived(
    gaCapacity > 0 ? Math.round(((gaSold + gaLocked) / gaCapacity) * 100) : 0,
  );

  function seatColor(status: string): string {
    switch (status) {
      case 'available':
        return 'bg-green-500 hover:bg-green-600 text-white';
      case 'locked':
        return 'bg-red-500 hover:bg-red-600 text-white';
      case 'sold':
        return 'bg-gray-800 hover:bg-gray-900 dark:bg-gray-600 dark:hover:bg-gray-500 text-white';
      case 'disabled':
        return 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600';
      default:
        return 'bg-gray-300 text-gray-500';
    }
  }

  function statusLabelVi(status: string): string {
    switch (status) {
      case 'available':
        return 'Còn trống';
      case 'locked':
        return 'Đang giữ';
      case 'sold':
        return 'Đã bán';
      case 'disabled':
        return 'Vô hiệu';
      default:
        return status;
    }
  }
</script>

<div class="rounded-xl border bg-card p-4 shadow-sm md:p-6">
  <!-- Section header -->
  <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
    <div class="flex items-center gap-3">
      <div class="h-8 w-1.5 rounded-full" style="background-color: {color};"></div>
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-base font-semibold text-foreground">{section.name}</h2>
          <span
            class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase
              {isAssigned
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}"
          >
            {isAssigned ? 'Ngồi' : 'Đứng'}
          </span>
        </div>
        <p class="text-xs text-muted-foreground">
          Giá: {formatPrice(section.price)}
        </p>
      </div>
    </div>

    <!-- Stats pills -->
    <div class="flex flex-wrap gap-2">
      {#if isAssigned}
        <span
          class="rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
        >
          {section.stats.available} trống
        </span>
        <span
          class="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
        >
          {section.stats.locked} giữ
        </span>
        <span
          class="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
        >
          {section.stats.sold} bán
        </span>
        {#if section.stats.disabled > 0}
          <span
            class="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-600"
          >
            {section.stats.disabled} vô hiệu
          </span>
        {/if}
      {:else}
        <span
          class="rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
        >
          {gaAvailable} trống
        </span>
        {#if gaLocked > 0}
          <span
            class="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
          >
            {gaLocked} giữ
          </span>
        {/if}
        {#if gaSold > 0}
          <span
            class="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
          >
            {gaSold} bán
          </span>
        {/if}
      {/if}
    </div>
  </div>

  {#if !isAssigned}
    <!-- ═══ GENERAL ADMISSION: Summary card ═══ -->
    <div class="rounded-xl border border-border/50 bg-muted/10 p-5">
      <div class="flex items-center gap-4">
        <div
          class="flex h-14 w-14 items-center justify-center rounded-2xl"
          style="background-color: {color}20;"
        >
          <Users class="h-7 w-7" style="color: {color};" />
        </div>
        <div class="flex-1">
          <p class="text-sm font-medium text-muted-foreground">Sức chứa khu vực</p>
          <p class="text-3xl font-extrabold tracking-tight text-foreground">
            {gaCapacity.toLocaleString('vi-VN')}
            <span class="text-base font-normal text-muted-foreground">vé</span>
          </p>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="mt-4 space-y-1.5">
        <div class="flex justify-between text-xs text-muted-foreground">
          <span>Đã sử dụng {usedPercent}%</span>
          <span>{gaAvailable} còn trống</span>
        </div>
        <div class="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          {#if gaSold > 0}
            <div
              class="inline-block h-full bg-gray-700 dark:bg-gray-500"
              style="width: {gaCapacity > 0 ? (gaSold / gaCapacity) * 100 : 0}%;"
            ></div>
          {/if}
          {#if gaLocked > 0}
            <div
              class="inline-block h-full bg-red-500"
              style="width: {gaCapacity > 0 ? (gaLocked / gaCapacity) * 100 : 0}%;"
            ></div>
          {/if}
        </div>
        <div class="flex gap-4 text-[11px] text-muted-foreground">
          <span class="flex items-center gap-1">
            <span class="inline-block h-2 w-2 rounded-full bg-gray-700 dark:bg-gray-500"></span>
            Đã bán ({gaSold})
          </span>
          <span class="flex items-center gap-1">
            <span class="inline-block h-2 w-2 rounded-full bg-red-500"></span>
            Đang giữ ({gaLocked})
          </span>
          <span class="flex items-center gap-1">
            <span class="inline-block h-2 w-2 rounded-full bg-green-500"></span>
            Còn trống ({gaAvailable})
          </span>
        </div>
      </div>
    </div>
  {:else if sectionRows > 0 && sectionCols > 0}
    <!-- ═══ ASSIGNED: Seat grid ═══ -->
    <div class="overflow-x-auto">
      <div class="inline-block min-w-fit">
        <!-- Column headers -->
        <div class="mb-1 flex items-center gap-1">
          <div class="w-8 shrink-0"></div>
          {#each Array.from({ length: sectionCols }, (_, i) => sectionStartColIndex + i) as col (col)}
            <div
              class="flex h-6 w-8 shrink-0 items-center justify-center text-xs font-medium text-muted-foreground"
            >
              {col}
            </div>
          {/each}
        </div>

        <!-- Rows -->
        {#each Array.from({ length: sectionRows }, (_, i) => i) as rowIdx (rowIdx)}
          {@const rowLabel = getRowLabel(sectionStartRowIndex + rowIdx - 1)}
          <div class="mb-1 flex items-center gap-1">
            <!-- Row label -->
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center text-xs font-semibold text-muted-foreground"
            >
              {rowLabel}
            </div>

            <!-- Seats -->
            {#each Array.from({ length: sectionCols }, (_, i) => sectionStartColIndex + i) as col (col)}
              {@const seatInfo = section.seatGrid[rowLabel]?.[col]}
              {#if seatInfo}
                <Tooltip.Root>
                  <Tooltip.Trigger aria-label="{seatInfo.label} — {statusLabelVi(seatInfo.status)}">
                    {#if seatInfo.status === 'disabled'}
                      <div
                        class="flex h-8 w-8 shrink-0 cursor-default items-center justify-center rounded border border-dashed border-gray-300 dark:border-gray-700 {seatColor(
                          seatInfo.status,
                        )} text-[10px]"
                      >
                        ✕
                      </div>
                    {:else}
                      <div
                        class="flex h-8 w-8 shrink-0 cursor-default items-center justify-center rounded text-xs font-medium transition-colors {seatColor(
                          seatInfo.status,
                        )}"
                      >
                        {col}
                      </div>
                    {/if}
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p>{seatInfo.label} — {statusLabelVi(seatInfo.status)}</p>
                  </Tooltip.Content>
                </Tooltip.Root>
              {:else}
                <div class="h-8 w-8 shrink-0"></div>
              {/if}
            {/each}
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <!-- Assigned but no seat config -->
    <div
      class="flex items-center gap-3 rounded-xl border border-dashed border-border/50 bg-muted/10 px-5 py-8 text-center"
    >
      <Armchair class="mx-auto h-8 w-8 text-muted-foreground/40" />
      <p class="text-sm text-muted-foreground">Khu vực này chưa có cấu hình ghế.</p>
    </div>
  {/if}
</div>
