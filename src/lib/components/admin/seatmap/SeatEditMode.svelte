<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import type { SectionFormData } from '$lib/shared/schemas/event.schema';
  import { getRowLabel } from '$lib/utils/seat-label';
  import { MousePointerClick, RotateCcw, Trash2, X } from 'lucide-svelte';

  let {
    section,
    disabledSeats = $bindable(),
    selectedSeats = $bindable(),
    onExit,
  }: {
    section: SectionFormData;
    disabledSeats: Set<string>;
    selectedSeats: Set<string>;
    onExit: () => void;
  } = $props();

  const sc = $derived(section.seat_config);
  const rows = $derived(sc.rows ?? 0);
  const cols = $derived(sc.cols ?? 0);
  const color = $derived(section.layout_config.color || '#3b82f6');

  let isDragging = $state(false);
  let dragMode = $state<'select' | 'deselect'>('select');

  // Build seat grid data
  let seatGrid = $derived.by(() => {
    const grid: { label: string; rowLabel: string; colNum: number; r: number; c: number }[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: (typeof grid)[0] = [];
      for (let c = 0; c < cols; c++) {
        const rowLabel =
          sc.rowFormat === 'alphabetic'
            ? getRowLabel(sc.startRowIndex + r - 1)
            : String(sc.startRowIndex + r);
        const colNum =
          sc.colDirection === 'ltr' ? sc.startColIndex + c : sc.startColIndex + (cols - 1 - c);
        const prefix = sc.prefix ? `${sc.prefix}-` : '';
        const label = `${prefix}${rowLabel}${colNum}`;
        row.push({ label, rowLabel, colNum, r, c });
      }
      grid.push(row);
    }
    return grid;
  });

  // Row labels for left axis
  let rowLabels = $derived.by(() => {
    const labels: string[] = [];
    for (let r = 0; r < rows; r++) {
      labels.push(
        sc.rowFormat === 'alphabetic'
          ? getRowLabel(sc.startRowIndex + r - 1)
          : String(sc.startRowIndex + r),
      );
    }
    return labels;
  });

  // ── Mutate SvelteSet in-place to avoid O(n) clone on every mouse event ──
  function handleMouseDown(label: string, e: MouseEvent) {
    e.preventDefault(); // prevent text selection during drag
    isDragging = true;
    if (selectedSeats.has(label)) {
      dragMode = 'deselect';
      selectedSeats.delete(label);
    } else {
      dragMode = 'select';
      selectedSeats.add(label);
    }
  }

  function handleMouseEnter(label: string) {
    if (!isDragging) return;
    if (dragMode === 'select') {
      selectedSeats.add(label);
    } else {
      selectedSeats.delete(label);
    }
  }

  function handleMouseUp() {
    isDragging = false;
  }

  // Disable selected seats
  function disableSelected() {
    for (const label of selectedSeats) {
      disabledSeats.add(label);
    }
    selectedSeats.clear();
  }

  // Enable selected seats
  function enableSelected() {
    for (const label of selectedSeats) {
      disabledSeats.delete(label);
    }
    selectedSeats.clear();
  }

  // Select all disabled
  function selectAllDisabled() {
    selectedSeats.clear();
    for (const label of disabledSeats) {
      selectedSeats.add(label);
    }
  }

  // Clear selection
  function clearSelection() {
    selectedSeats.clear();
  }

  let disabledCount = $derived(disabledSeats.size);
  let selectedCount = $derived(selectedSeats.size);

  // Compute counts efficiently without spreading entire sets
  let selectedDisabledCount = $derived.by(() => {
    let count = 0;
    for (const s of selectedSeats) {
      if (disabledSeats.has(s)) count++;
    }
    return count;
  });
  let selectedEnabledCount = $derived(selectedCount - selectedDisabledCount);
  let hasSelectedDisabled = $derived(selectedDisabledCount > 0);
  let hasSelectedEnabled = $derived(selectedEnabledCount > 0);
</script>

<svelte:window onmouseup={handleMouseUp} />

<div class="flex h-full flex-col">
  <!-- Top bar -->
  <div
    class="flex items-center justify-between border-b border-border bg-background/95 px-4 py-2 backdrop-blur"
  >
    <div class="flex items-center gap-3">
      <div class="h-4 w-4 rounded" style="background-color: {color}"></div>
      <div>
        <h3 class="text-sm font-semibold text-foreground">
          Chỉnh sửa ghế — {section.name || 'Khu vực'}
        </h3>
        <p class="text-[10px] text-muted-foreground">
          {rows} hàng × {cols} cột • {disabledCount} ghế đã vô hiệu hóa
        </p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      {#if selectedCount > 0}
        <span class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          {selectedCount} ghế đã chọn
        </span>
      {/if}
      <Button variant="outline" size="sm" class="h-7 gap-1.5 text-xs" onclick={onExit}>
        <X class="h-3.5 w-3.5" />
        Thoát
      </Button>
    </div>
  </div>

  <div class="flex flex-1 overflow-hidden">
    <!-- Seat grid -->
    <div class="flex-1 overflow-auto p-6">
      <div class="inline-flex flex-col gap-1.5 select-none" role="grid">
        <!-- Column headers -->
        <div class="flex items-center gap-1.5">
          <span class="w-10 shrink-0"></span>
          {#each seatGrid[0] ?? [] as seat (seat.label)}
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center text-[10px] font-semibold text-muted-foreground"
            >
              {seat.colNum}
            </span>
          {/each}
        </div>

        {#each seatGrid as row, r (r)}
          <div class="flex items-center gap-1.5">
            <!-- Row label -->
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center text-[10px] font-semibold text-muted-foreground"
            >
              {rowLabels[r]}
            </span>

            {#each row as seat (seat.label)}
              {@const isDisabled = disabledSeats.has(seat.label)}
              {@const isSelected = selectedSeats.has(seat.label)}
              <button
                type="button"
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold shadow-sm transition-all
                  {isDisabled && isSelected
                  ? 'bg-destructive text-white ring-2 ring-destructive ring-offset-2'
                  : isDisabled
                    ? 'border-2 border-destructive/40 bg-destructive/10 text-destructive/70 line-through'
                    : isSelected
                      ? 'text-white shadow-md ring-2 ring-primary ring-offset-2'
                      : 'border-2 border-border bg-background text-foreground hover:border-primary/60 hover:bg-primary/10 hover:shadow-md'}"
                style={!isDisabled && isSelected ? `background-color: ${color}` : ''}
                onmousedown={(e) => handleMouseDown(seat.label, e)}
                onmouseenter={() => handleMouseEnter(seat.label)}
                role="gridcell"
                aria-label="{seat.label} {isDisabled ? '(disabled)' : ''}"
              >
                {seat.rowLabel}{seat.colNum}
              </button>
            {/each}
          </div>
        {/each}
      </div>
    </div>

    <!-- Right panel: actions -->
    <div class="w-56 border-l border-border bg-background p-4">
      <h4 class="mb-3 text-xs font-semibold text-foreground">Thao tác</h4>

      <div class="space-y-2">
        <p class="text-[10px] text-muted-foreground">
          <MousePointerClick class="mr-1 inline h-3 w-3" />
          Click hoặc kéo để chọn ghế, sau đó dùng nút bên dưới.
        </p>

        <Button
          variant="destructive"
          size="sm"
          class="w-full gap-1.5 text-xs"
          disabled={!hasSelectedEnabled}
          onclick={disableSelected}
        >
          <Trash2 class="h-3.5 w-3.5" />
          Vô hiệu hóa ({selectedEnabledCount})
        </Button>

        <Button
          variant="outline"
          size="sm"
          class="w-full gap-1.5 text-xs"
          disabled={!hasSelectedDisabled}
          onclick={enableSelected}
        >
          <RotateCcw class="h-3.5 w-3.5" />
          Khôi phục ({selectedDisabledCount})
        </Button>

        <div class="h-px bg-border"></div>

        <Button
          variant="ghost"
          size="sm"
          class="w-full text-xs"
          onclick={selectAllDisabled}
          disabled={disabledCount === 0}
        >
          Chọn tất cả đã vô hiệu ({disabledCount})
        </Button>

        <Button
          variant="ghost"
          size="sm"
          class="w-full text-xs"
          onclick={clearSelection}
          disabled={selectedCount === 0}
        >
          Bỏ chọn tất cả
        </Button>
      </div>

      <!-- Stats -->
      <div class="mt-6 space-y-1.5 rounded-lg border border-border/50 bg-muted/20 p-3">
        <p class="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          Thống kê
        </p>
        <div class="flex justify-between text-[11px]">
          <span class="text-muted-foreground">Tổng ghế:</span>
          <span class="font-medium text-foreground">{rows * cols}</span>
        </div>
        <div class="flex justify-between text-[11px]">
          <span class="text-muted-foreground">Khả dụng:</span>
          <span class="font-medium text-success">{rows * cols - disabledCount}</span>
        </div>
        <div class="flex justify-between text-[11px]">
          <span class="text-muted-foreground">Đã vô hiệu:</span>
          <span class="font-medium text-destructive">{disabledCount}</span>
        </div>
      </div>
    </div>
  </div>
</div>
