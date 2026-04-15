<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import type { SectionFormData } from '$lib/shared/schemas/event.schema';
  import { getRowLabel } from '$lib/utils/seat-label';
  import { createDefaultSection } from '$lib/utils/section-defaults';
  import { LayoutGrid, Plus } from 'lucide-svelte';
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';
  import SectionItem from './SectionItem.svelte';

  let {
    sections = $bindable(),
    errors = {},
    errPrefix = '',
    onvalidationchange,
  }: {
    sections: SectionFormData[];
    errors?: Record<string, string>;
    /** Prefix for error keys, e.g. "shows.0." so field errors resolve to "shows.0.sections.0.name" */
    errPrefix?: string;
    onvalidationchange?: (state: { hasOverlap: boolean; duplicatePrefixes: string[] }) => void;
  } = $props();

  function addSection() {
    sections = [...sections, createDefaultSection()];
  }

  function removeSection(index: number) {
    sections = sections.filter((_, i) => i !== index);
  }

  let totalSeats = $derived(
    sections.reduce((sum, s) => {
      if (s.type === 'general') {
        return sum + Math.max(s.capacity ?? 0, 0);
      }
      const r = s.seat_config.rows > 0 ? s.seat_config.rows : 0;
      const c = s.seat_config.cols > 0 ? s.seat_config.cols : 0;
      return sum + r * c;
    }, 0),
  );

  // ── Color palette for sections ──
  const SECTION_COLORS = [
    {
      bg: 'bg-blue-100 dark:bg-blue-900/40',
      border: 'border-blue-300 dark:border-blue-700',
      text: 'text-blue-700 dark:text-blue-300',
      label: 'bg-blue-500',
    },
    {
      bg: 'bg-emerald-100 dark:bg-emerald-900/40',
      border: 'border-emerald-300 dark:border-emerald-700',
      text: 'text-emerald-700 dark:text-emerald-300',
      label: 'bg-emerald-500',
    },
    {
      bg: 'bg-amber-100 dark:bg-amber-900/40',
      border: 'border-amber-300 dark:border-amber-700',
      text: 'text-amber-700 dark:text-amber-300',
      label: 'bg-amber-500',
    },
    {
      bg: 'bg-purple-100 dark:bg-purple-900/40',
      border: 'border-purple-300 dark:border-purple-700',
      text: 'text-purple-700 dark:text-purple-300',
      label: 'bg-purple-500',
    },
    {
      bg: 'bg-rose-100 dark:bg-rose-900/40',
      border: 'border-rose-300 dark:border-rose-700',
      text: 'text-rose-700 dark:text-rose-300',
      label: 'bg-rose-500',
    },
    {
      bg: 'bg-cyan-100 dark:bg-cyan-900/40',
      border: 'border-cyan-300 dark:border-cyan-700',
      text: 'text-cyan-700 dark:text-cyan-300',
      label: 'bg-cyan-500',
    },
  ];

  const MAX_GRID_ROWS = 30;
  const MAX_GRID_COLS = 40;

  // ── Build unified seat grid ──
  type SeatCell = {
    sectionIndex: number;
    sectionName: string;
    seatLabel: string;
    isDisabled: boolean;
    isOverlap: boolean;
    overlapWith?: string;
  };

  // ── Detect duplicate prefixes across sections ──
  let computedDuplicatePrefixes = $derived.by(() => {
    const prefixCount = new SvelteMap<string, number>();
    for (const s of sections) {
      const p = (s.seat_config.prefix ?? '').trim().toUpperCase();
      if (!p) continue;
      prefixCount.set(p, (prefixCount.get(p) || 0) + 1);
    }
    return [...prefixCount.entries()].filter(([, count]) => count > 1).map(([prefix]) => prefix);
  });

  let gridData = $derived.by(() => {
    if (sections.length === 0) return null;

    // Compute bounding box across all sections
    let minRow = Infinity,
      maxRow = -Infinity;
    let minCol = Infinity,
      maxCol = -Infinity;

    const parsedSections = sections.map((s, idx) => {
      const seatCfg = s.seat_config;
      const layoutCfg = s.layout_config;

      // Seat labeling
      const prefix = seatCfg.prefix || '';
      const labelStartRow = Math.max(seatCfg.startRowIndex, 1);
      const labelStartCol = Math.max(seatCfg.startColIndex, 1);
      const rows = Math.max(seatCfg.rows, 0);
      const cols = Math.max(seatCfg.cols, 0);

      // Visual position on venue map
      const gridStartRow = Math.max(layoutCfg.y, 0);
      const gridStartCol = Math.max(layoutCfg.x, 0);
      const gridEndRow = gridStartRow + rows - 1;
      const gridEndCol = gridStartCol + cols - 1;

      if (rows > 0 && cols > 0) {
        minRow = Math.min(minRow, gridStartRow);
        maxRow = Math.max(maxRow, gridEndRow);
        minCol = Math.min(minCol, gridStartCol);
        maxCol = Math.max(maxCol, gridEndCol);
      }

      const disabledSet = new SvelteSet(
        s.disabled_seats
          ? s.disabled_seats
              .split(',')
              .map((d) => d.trim().toUpperCase())
              .filter(Boolean)
          : [],
      );

      return {
        idx,
        prefix,
        labelStartRow,
        labelStartCol,
        rows,
        cols,
        gridStartRow,
        gridStartCol,
        gridEndRow,
        gridEndCol,
        disabledSet,
        name: s.name || `Khu vực ${idx + 1}`,
      };
    });

    if (minRow > maxRow) return null;

    const totalRows = maxRow - minRow + 1;
    const totalCols = maxCol - minCol + 1;
    const isTruncated = totalRows > MAX_GRID_ROWS || totalCols > MAX_GRID_COLS;
    const displayRows = Math.min(totalRows, MAX_GRID_ROWS);
    const displayCols = Math.min(totalCols, MAX_GRID_COLS);

    // Build 2D grid
    const grid: (SeatCell | null)[][] = [];
    for (let r = 0; r < displayRows; r++) {
      const row: (SeatCell | null)[] = [];
      for (let c = 0; c < displayCols; c++) {
        row.push(null);
      }
      grid.push(row);
    }

    // Build a seat-label → section-name map to detect duplicate labels across sections
    const seatLabelOwner = new SvelteMap<string, string>();
    const duplicateLabels = new SvelteSet<string>();

    // First pass: detect duplicate seat labels
    for (const sec of parsedSections) {
      if (sec.rows <= 0 || sec.cols <= 0) continue;
      for (let r = 0; r < sec.rows; r++) {
        for (let c = 0; c < sec.cols; c++) {
          const rowLabel = getRowLabel(sec.labelStartRow + r - 1);
          const colNum = sec.labelStartCol + c;
          const seatLabel = sec.prefix
            ? `${sec.prefix}-${rowLabel}${colNum}`
            : `${rowLabel}${colNum}`;
          if (seatLabelOwner.has(seatLabel)) {
            duplicateLabels.add(seatLabel);
          } else {
            seatLabelOwner.set(seatLabel, sec.name);
          }
        }
      }
    }

    // Second pass: fill grid cells & detect visual overlap
    let labelOverlapCount = duplicateLabels.size;
    let visualOverlapCount = 0;
    const gridCellOwner = new SvelteMap<string, { sectionName: string; seatLabel: string }>();

    for (const sec of parsedSections) {
      if (sec.rows <= 0 || sec.cols <= 0) continue;
      for (let r = 0; r < sec.rows; r++) {
        for (let c = 0; c < sec.cols; c++) {
          const gridAbsRow = sec.gridStartRow + r;
          const gridAbsCol = sec.gridStartCol + c;
          const gridR = gridAbsRow - minRow;
          const gridC = gridAbsCol - minCol;
          if (gridR >= displayRows || gridC >= displayCols) continue;

          const rowLabel = getRowLabel(sec.labelStartRow + r - 1);
          const colNum = sec.labelStartCol + c;
          const seatLabel = sec.prefix
            ? `${sec.prefix}-${rowLabel}${colNum}`
            : `${rowLabel}${colNum}`;

          const cellKey = `${gridR},${gridC}`;
          const existingOwner = gridCellOwner.get(cellKey);
          const isVisualOverlap =
            existingOwner !== undefined && existingOwner.sectionName !== sec.name;
          if (isVisualOverlap && !grid[gridR][gridC]?.isOverlap) {
            visualOverlapCount++;
          }

          const isLabelDuplicate = duplicateLabels.has(seatLabel);
          const duplicateOwner = isLabelDuplicate ? seatLabelOwner.get(seatLabel) : undefined;

          const isOverlap = isLabelDuplicate || isVisualOverlap;
          const overlapWith = isVisualOverlap
            ? existingOwner?.sectionName
            : isLabelDuplicate && duplicateOwner !== sec.name
              ? duplicateOwner
              : undefined;

          grid[gridR][gridC] = {
            sectionIndex: sec.idx,
            sectionName: sec.name,
            seatLabel: isVisualOverlap ? `${existingOwner!.seatLabel} / ${seatLabel}` : seatLabel,
            isDisabled: sec.disabledSet.has(seatLabel),
            isOverlap,
            overlapWith,
          };

          if (!existingOwner) {
            gridCellOwner.set(cellKey, { sectionName: sec.name, seatLabel });
          }
        }
      }
    }

    const overlapCount = labelOverlapCount + visualOverlapCount;

    const rowLabels: number[] = [];
    for (let r = 0; r < displayRows; r++) {
      rowLabels.push(minRow + r);
    }

    const colLabels: number[] = [];
    for (let c = 0; c < displayCols; c++) {
      colLabels.push(minCol + c);
    }

    return { grid, rowLabels, colLabels, isTruncated, displayRows, displayCols, overlapCount };
  });

  // Notify parent of validation state changes
  $effect(() => {
    onvalidationchange?.({
      hasOverlap: (gridData?.overlapCount ?? 0) > 0,
      duplicatePrefixes: computedDuplicatePrefixes,
    });
  });
</script>

<div class="space-y-5">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-success/10">
        <LayoutGrid class="h-5 w-5 text-success" />
      </div>
      <div>
        <h3 class="text-base font-semibold text-foreground">Khu vực ghế & vé</h3>
        <p class="text-xs text-muted-foreground">
          Tổng: <strong class="text-foreground">{totalSeats.toLocaleString('vi-VN')}</strong>
          ghế
        </p>
      </div>
    </div>
  </div>

  {#if errors[`${errPrefix}sections`]}
    <p class="text-sm text-destructive">{errors[`${errPrefix}sections`]}</p>
  {/if}

  {#if computedDuplicatePrefixes.length > 0}
    <div class="rounded-2xl border border-destructive/50 bg-destructive/10 px-4 py-3">
      <p class="text-sm font-medium text-destructive">
        ⚠️ Mã tiền tố trùng lặp: <strong>{computedDuplicatePrefixes.join(', ')}</strong>
      </p>
      <p class="text-xs text-destructive/80">
        Mỗi khu vực phải có mã tiền tố (prefix) riêng biệt để đảm bảo mã ghế không bị trùng.
      </p>
    </div>
  {/if}

  {#each sections as section, i (section)}
    <SectionItem
      bind:section={sections[i]}
      index={i}
      onremove={() => removeSection(i)}
      {errors}
      {errPrefix}
    />
  {/each}

  <Button type="button" variant="outline" class="w-full border-dashed py-5" onclick={addSection}>
    <Plus class="mr-2 h-4 w-4" />
    Thêm khu vực ghế
  </Button>

  <!-- Total seat map preview -->
  {#if gridData}
    <div class="bento-card">
      <div class="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h3 class="text-sm font-semibold text-foreground">🗺️ Sơ đồ ghế tổng thể</h3>
        <div class="flex flex-wrap gap-2">
          {#if gridData.overlapCount > 0}
            <span
              class="rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
            >
              ⚠️ {gridData.overlapCount} vị trí bị chồng lấn
            </span>
          {/if}
          {#if gridData.isTruncated}
            <span class="text-xs text-amber-600">
              (Thu gọn: hiển thị tối đa {MAX_GRID_ROWS} hàng × {MAX_GRID_COLS} cột)
            </span>
          {/if}
        </div>
      </div>

      <div class="overflow-x-auto pb-0.5">
        <div class="inline-flex flex-col gap-px">
          <!-- Column header -->
          <div class="flex items-center gap-px">
            <span class="w-7 shrink-0"></span>
            {#each gridData.colLabels as col (col)}
              <span
                class="flex h-4 w-4 shrink-0 items-center justify-center font-mono text-[8px] text-muted-foreground"
              >
                {col}
              </span>
            {/each}
          </div>

          <!-- Rows -->
          {#each gridData.grid as row, r (`row-${r}`)}
            <div class="flex items-center gap-px">
              <span class="w-7 shrink-0 pr-1 text-right font-mono text-[9px] text-muted-foreground">
                {gridData.rowLabels[r]}
              </span>
              {#each row as cell, c (`${r}-${c}`)}
                {#if cell}
                  {@const color = SECTION_COLORS[cell.sectionIndex % SECTION_COLORS.length]}
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <div
                        class="h-4 w-4 shrink-0 rounded-[2px] border transition-colors
                          {cell.isOverlap
                          ? 'border-destructive bg-destructive/40 ring-1 ring-destructive/60'
                          : cell.isDisabled
                            ? 'border-destructive/40 bg-destructive/20'
                            : `${color.border} ${color.bg}`}"
                      ></div>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <span class="text-xs">
                        {cell.seatLabel} — {cell.sectionName}
                        {#if cell.isOverlap}
                          <span class="text-destructive">⚠️ chồng lấn với {cell.overlapWith}</span>
                        {:else if cell.isDisabled}
                          (hỏng)
                        {/if}
                      </span>
                    </Tooltip.Content>
                  </Tooltip.Root>
                {:else}
                  <div class="h-4 w-4 shrink-0"></div>
                {/if}
              {/each}
            </div>
          {/each}
        </div>
      </div>

      <!-- Legend -->
      <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-muted-foreground">
        {#each sections as sec, i (i)}
          {@const color = SECTION_COLORS[i % SECTION_COLORS.length]}
          <span class="flex items-center gap-1">
            <span class="inline-block h-3 w-3 rounded-[2px] {color.label}"></span>
            {sec.name || `Khu vực ${i + 1}`}
          </span>
        {/each}
        <span class="flex items-center gap-1">
          <span
            class="inline-block h-3 w-3 rounded-[2px] border border-destructive/40 bg-destructive/20"
          ></span>
          Ghế hỏng
        </span>
        {#if gridData.overlapCount > 0}
          <span class="flex items-center gap-1">
            <span
              class="inline-block h-3 w-3 rounded-[2px] border border-destructive bg-destructive/40"
            ></span>
            Chồng lấn
          </span>
        {/if}
        <span class="flex items-center gap-1">
          <span
            class="inline-block h-3 w-3 rounded-[2px] border border-dashed border-border"
          ></span>
          Trống (không thuộc khu vực nào)
        </span>
      </div>
    </div>
  {/if}
</div>
