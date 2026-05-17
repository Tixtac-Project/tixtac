<!--
  SectionDetail.svelte
  Renders a single section's detail view — adaptive to assigned (seat grid or summary)
  vs general admission (progress card). Works with both full seat data and aggregated counters.
-->
<script lang="ts">
  import { formatPrice } from '$lib/utils/price';
  import { getRowLabel } from '$lib/utils/seat-label';
  import { Users } from 'lucide-svelte';
  import { SvelteSet } from 'svelte/reactivity';

  type SeatInfo = { status: string; label: string };

  type SectionData = {
    id: number;
    name: string;
    type: string;
    price: number;
    capacity: number;
    layout_config?: {
      x: number;
      y: number;
      width: number;
      height: number;
      rotation?: number;
      color?: string;
    };
    seat_config?: {
      rows: number;
      cols: number;
      prefix: string | null;
      rowFormat?: 'alphabetic' | 'numeric';
      colDirection?: 'ltr' | 'rtl';
      startRowIndex?: number;
      startColIndex?: number;
    } | null;
    stats?: {
      total?: number;
      available?: number;
      locked?: number;
      sold?: number;
      disabled?: number;
    };
    // From event-detail API: materialized counters
    seat_count?: number;
    available_count?: number;
    disabled_count?: number;
    sold_count?: number;
    seatGrid?: Record<string, Record<number, SeatInfo>> | null;
  };

  let { section }: { section: SectionData } = $props();

  const isAssigned = $derived(section.type === 'assigned');
  const color = $derived(section.layout_config?.color || '#3b82f6');

  // Normalized stats from either source
  const statTotal = $derived(section.stats?.total ?? section.seat_count ?? 0);
  const statAvailable = $derived(section.stats?.available ?? section.available_count ?? 0);
  const statDisabled = $derived(section.stats?.disabled ?? section.disabled_count ?? 0);
  const statSold = $derived(section.stats?.sold ?? section.sold_count ?? 0);
  const statLocked = $derived(section.stats?.locked ?? 0);
  const statUsed = $derived(statSold + statLocked);

  // GA
  const gaCapacity = $derived(section.capacity);
  const gaUsed = $derived(statUsed);
  const gaAvailable = $derived(gaCapacity - gaUsed);
  const usedPercent = $derived(gaCapacity > 0 ? Math.round((gaUsed / gaCapacity) * 100) : 0);

  // Clamped percentages for GA progress bar (prevent sum > 100%)
  const safeSold = $derived(gaCapacity > 0 ? Math.min(statSold, gaCapacity) : 0);
  const safeLocked = $derived(gaCapacity > 0 ? Math.min(statLocked, gaCapacity - safeSold) : 0);
  const safeAvail = $derived(gaCapacity > 0 ? Math.max(gaCapacity - safeSold - safeLocked, 0) : 0);

  const soldPctGa = $derived(gaCapacity > 0 ? (safeSold / gaCapacity) * 100 : 0);
  const lockedPctGa = $derived(gaCapacity > 0 ? (safeLocked / gaCapacity) * 100 : 0);
  const availablePctGa = $derived(gaCapacity > 0 ? (safeAvail / gaCapacity) * 100 : 0);

  // Clamped percentages for assigned summary progress bar
  const assignedBase = $derived(statTotal + statDisabled);
  const assignedSafeSold = $derived(assignedBase > 0 ? Math.min(statSold, assignedBase) : 0);
  const assignedSafeLocked = $derived(
    assignedBase > 0 ? Math.min(statLocked, assignedBase - assignedSafeSold) : 0,
  );
  const assignedSafeDisabled = $derived(
    assignedBase > 0
      ? Math.min(statDisabled, assignedBase - assignedSafeSold - assignedSafeLocked)
      : 0,
  );
  const assignedSafeAvail = $derived(
    assignedBase > 0
      ? Math.max(assignedBase - assignedSafeSold - assignedSafeLocked - assignedSafeDisabled, 0)
      : 0,
  );

  const soldPctAssigned = $derived(assignedBase > 0 ? (assignedSafeSold / assignedBase) * 100 : 0);
  const lockedPctAssigned = $derived(
    assignedBase > 0 ? (assignedSafeLocked / assignedBase) * 100 : 0,
  );
  const disabledPctAssigned = $derived(
    assignedBase > 0 ? (assignedSafeDisabled / assignedBase) * 100 : 0,
  );
  const availablePctAssigned = $derived(
    assignedBase > 0 ? (assignedSafeAvail / assignedBase) * 100 : 0,
  );

  // Grid dimensions from seatConfig OR inferred from seatGrid
  const seatCfg = $derived(section.seat_config ?? null);
  const gridKeys = $derived(Object.keys(section.seatGrid ?? {}));

  const gridCols = $derived.by(() => {
    const cols = new SvelteSet<number>();
    for (const row of Object.values(section.seatGrid ?? {})) {
      for (const c of Object.keys(row)) cols.add(Number(c));
    }
    return [...cols].sort((a, b) => a - b);
  });

  const sectionRows = $derived(seatCfg?.rows ?? gridKeys.length);
  const sectionCols = $derived(
    seatCfg?.cols ?? (gridCols.length > 0 ? Math.max(...gridCols) - Math.min(...gridCols) + 1 : 0),
  );
  const sectionStartRowIndex = $derived(seatCfg?.startRowIndex ?? 1);
  const sectionStartColIndex = $derived(
    seatCfg?.startColIndex ?? (gridCols.length > 0 ? Math.min(...gridCols) : 1),
  );

  const hasGridData = $derived(!!seatCfg && gridKeys.length > 0 && gridCols.length > 0);

  // ── Pre-computed grid arrays (avoids Array.from + getRowLabel in template) ──
  // Respect rowFormat: alphabetic sections use A/B/C, numeric sections use 1/2/3
  const gridRowLabels = $derived(
    Array.from({ length: sectionRows }, (_, i) => {
      const idx = sectionStartRowIndex + i - 1;
      return seatCfg?.rowFormat === 'numeric' ? String(idx + 1) : getRowLabel(idx);
    }),
  );
  const gridColNumbers = $derived(
    Array.from({ length: sectionCols }, (_, i) => sectionStartColIndex + i),
  );

  // ── Single floating tooltip for seat grid (replaces per-cell Tooltip.Root) ──
  let gridContainer = $state<HTMLDivElement>();
  let gridTooltip = $state<{ visible: boolean; x: number; y: number; text: string }>({
    visible: false,
    x: 0,
    y: 0,
    text: '',
  });

  function showGridTooltip(e: MouseEvent, text: string) {
    const rect = gridContainer?.getBoundingClientRect();
    if (!rect) return;
    gridTooltip = { visible: true, x: e.clientX - rect.left, y: e.clientY - rect.top - 8, text };
  }

  function hideGridTooltip() {
    gridTooltip.visible = false;
  }

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
            class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase {isAssigned
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}"
          >
            {isAssigned ? 'Ngồi' : 'Đứng'}
          </span>
        </div>
        <p class="text-xs text-muted-foreground">
          Giá: {formatPrice(section.price)}
          {#if isAssigned}
            · {statTotal} ghế ({statAvailable} trống{statDisabled > 0
              ? ` · ${statDisabled} vô hiệu`
              : ''})
          {/if}
        </p>
      </div>
    </div>

    <!-- Stats pills -->
    <div class="flex flex-wrap gap-2">
      <span
        class="rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
      >
        {isAssigned ? statAvailable : gaAvailable} trống
      </span>
      {#if statLocked > 0}
        <span
          class="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
        >
          {statLocked} giữ
        </span>
      {/if}
      {#if statSold > 0}
        <span
          class="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
        >
          {statSold} bán
        </span>
      {/if}
      {#if statDisabled > 0}
        <span
          class="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-600"
        >
          {statDisabled} vô hiệu
        </span>
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
      <div class="mt-4 space-y-1.5">
        <div class="flex justify-between text-xs text-muted-foreground">
          <span>{gaUsed > 0 ? `Đã sử dụng ${usedPercent}%` : 'Chưa có giao dịch'}</span>
          <span>{gaAvailable} còn trống</span>
        </div>
        <div class="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {#if soldPctGa > 0}
            <div
              class="h-full shrink-0 bg-primary transition-all duration-300"
              style="width: {soldPctGa}%"
            ></div>
          {/if}
          {#if lockedPctGa > 0}
            <div
              class="h-full shrink-0 bg-warning transition-all duration-300"
              style="width: {lockedPctGa}%"
            ></div>
          {/if}
          {#if availablePctGa > 0}
            <div
              class="h-full shrink-0 bg-emerald-500 transition-all duration-300"
              style="width: {availablePctGa}%"
            ></div>
          {/if}
        </div>
        <div class="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span class="flex items-center gap-1">
            <span class="inline-block h-2 w-2 rounded-full bg-primary"></span>
            Đã bán ({statSold})
          </span>
          {#if statLocked > 0}
            <span class="flex items-center gap-1">
              <span class="inline-block h-2 w-2 rounded-full bg-warning"></span>
              Đang giữ ({statLocked})
            </span>
          {/if}
          <span class="flex items-center gap-1">
            <span class="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
            Còn trống ({gaAvailable})
          </span>
        </div>
      </div>
    </div>
  {:else if hasGridData && sectionRows > 0 && sectionCols > 0}
    <!-- ═══ ASSIGNED: Full seat grid (only when seatGrid data is available) ═══ -->
    <div
      class="relative overflow-x-auto rounded-lg border border-border/30 bg-muted/10 p-4"
      bind:this={gridContainer}
    >
      <div class="inline-block min-w-fit">
        <!-- Legend -->
        <div class="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
          <span class="flex items-center gap-1.5">
            <span class="inline-block h-3 w-3 rounded bg-green-500"></span>
            Trống ({statAvailable})
          </span>
          {#if statLocked > 0}
            <span class="flex items-center gap-1.5">
              <span class="inline-block h-3 w-3 rounded bg-red-500"></span>
              Giữ ({statLocked})
            </span>
          {/if}
          {#if statSold > 0}
            <span class="flex items-center gap-1.5">
              <span class="inline-block h-3 w-3 rounded bg-gray-700 dark:bg-gray-500"></span>
              Bán ({statSold})
            </span>
          {/if}
          {#if statDisabled > 0}
            <span class="flex items-center gap-1.5">
              <span
                class="inline-block h-3 w-3 rounded border border-dashed border-gray-400 bg-gray-200 dark:bg-gray-800"
              ></span>
              Vô hiệu ({statDisabled})
            </span>
          {/if}
        </div>

        <!-- Column headers -->
        <div class="mb-1.5 flex items-center gap-1.5">
          <div class="w-9 shrink-0"></div>
          {#each gridColNumbers as col (col)}
            <div
              class="flex h-7 w-9 shrink-0 items-center justify-center rounded text-[11px] font-semibold text-muted-foreground"
            >
              {col}
            </div>
          {/each}
        </div>

        {#each gridRowLabels as rowLabel (rowLabel)}
          <div class="mb-1.5 flex items-center gap-1.5">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded text-xs font-bold text-muted-foreground"
            >
              {rowLabel}
            </div>
            {#each gridColNumbers as col (col)}
              {@const seatInfo = section.seatGrid?.[rowLabel]?.[col]}
              {#if seatInfo}
                {@const colorClass = seatColor(seatInfo.status)}
                {@const seatTooltip = `${seatInfo.label} — ${statusLabelVi(seatInfo.status)}`}
                {#if seatInfo.status === 'disabled'}
                  <div
                    class="flex h-9 w-9 shrink-0 cursor-default items-center justify-center rounded-md border border-dashed border-gray-300 dark:border-gray-700 {colorClass} text-[10px] font-medium"
                    title={seatTooltip}
                  >
                    ✕
                  </div>
                {:else}
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <div
                    class="flex h-9 w-9 shrink-0 cursor-default items-center justify-center rounded-md text-[11px] font-semibold transition-colors {colorClass}"
                    title={seatTooltip}
                    onmouseenter={(e) => showGridTooltip(e, seatTooltip)}
                    onmouseleave={hideGridTooltip}
                  >
                    {col}
                  </div>
                {/if}
              {:else}
                <div class="h-9 w-9 shrink-0"></div>
              {/if}
            {/each}
          </div>
        {/each}
      </div>

      <!-- Floating tooltip (single instance, follows mouse — replaces per-cell Tooltip.Root) -->
      {#if gridTooltip.visible}
        <div
          class="pointer-events-none absolute z-50 rounded-lg bg-gray-900/90 px-3 py-1.5 text-white shadow-lg backdrop-blur-sm"
          style="left: {gridTooltip.x}px; top: {gridTooltip.y}px; transform: translate(-50%, -100%);"
        >
          <p class="text-[11px] font-semibold">{gridTooltip.text}</p>
        </div>
      {/if}
    </div>
  {:else if isAssigned}
    <!-- ═══ ASSIGNED: Summary card (no seat grid data available from API) ═══ -->
    <div class="rounded-xl border border-border/50 bg-muted/10 p-5">
      <div class="flex items-center gap-4">
        <div
          class="flex h-14 w-14 items-center justify-center rounded-2xl"
          style="background-color: {color}20;"
        >
          <Users class="h-7 w-7" style="color: {color};" />
        </div>
        <div class="flex-1">
          <p class="text-sm font-medium text-muted-foreground">Tổng ghế khu vực</p>
          <p class="text-3xl font-extrabold tracking-tight text-foreground">
            {statTotal.toLocaleString('vi-VN')}
            <span class="text-base font-normal text-muted-foreground">ghế</span>
          </p>
        </div>
      </div>
      <div class="mt-4 space-y-1.5">
        <div class="flex justify-between text-xs text-muted-foreground">
          <span>
            {statUsed > 0
              ? `Đã sử dụng ${assignedBase > 0 ? Math.round((statUsed / assignedBase) * 100) : 0}%`
              : 'Chưa có giao dịch'}
          </span>
          <span>{statAvailable} còn trống</span>
        </div>
        <div class="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {#if soldPctAssigned > 0}
            <div
              class="h-full shrink-0 bg-primary transition-all duration-300"
              style="width: {soldPctAssigned}%"
            ></div>
          {/if}
          {#if lockedPctAssigned > 0}
            <div
              class="h-full shrink-0 bg-warning transition-all duration-300"
              style="width: {lockedPctAssigned}%"
            ></div>
          {/if}
          {#if disabledPctAssigned > 0}
            <div
              class="h-full shrink-0 bg-muted-foreground/40 transition-all duration-300"
              style="width: {disabledPctAssigned}%"
            ></div>
          {/if}
          {#if availablePctAssigned > 0}
            <div
              class="h-full shrink-0 bg-emerald-500 transition-all duration-300"
              style="width: {availablePctAssigned}%"
            ></div>
          {/if}
        </div>
        <div class="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span class="flex items-center gap-1">
            <span class="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
            Còn trống ({statAvailable})
          </span>
          {#if statLocked > 0}
            <span class="flex items-center gap-1">
              <span class="inline-block h-2 w-2 rounded-full bg-warning"></span>
              Đang giữ ({statLocked})
            </span>
          {/if}
          {#if statSold > 0}
            <span class="flex items-center gap-1">
              <span class="inline-block h-2 w-2 rounded-full bg-primary"></span>
              Đã bán ({statSold})
            </span>
          {/if}
          {#if statDisabled > 0}
            <span class="flex items-center gap-1">
              <span class="inline-block h-2 w-2 rounded-full bg-muted-foreground/40"></span>
              Vô hiệu ({statDisabled})
            </span>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>
