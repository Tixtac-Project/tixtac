<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import type { MapConfigInput, SectionFormData } from '$lib/shared/schemas/event.schema';
  import { createDefaultSection } from '$lib/utils/section-defaults';
  import {
    ArrowLeft,
    Check,
    Copy,
    Grid3x3,
    LayoutGrid,
    Loader,
    Magnet,
    Maximize,
    Pencil,
    Redo2,
    Save,
    Undo2,
    ZoomIn,
    ZoomOut,
  } from 'lucide-svelte';
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';
  import SeatEditMode from './SeatEditMode.svelte';
  import SeatmapCanvas from './SeatmapCanvas.svelte';
  import SeatmapProperties from './SeatmapProperties.svelte';
  import SeatmapToolbox from './SeatmapToolbox.svelte';
  import {
    SECTION_COLORS,
    STAGE_ELEMENT_DEFAULTS,
    autoGridDimensions,
    generateExcessDisabledSeats,
    type CanvasSelection,
    type StageElement,
    type TicketTier,
  } from './types';

  let {
    eventTitle = '',
    showTitle = '',
    showsList = [],
    selectedShowIndex = $bindable(0),
    sections = $bindable<SectionFormData[]>([]),
    mapConfig = $bindable<MapConfigInput>({
      width: 1200,
      height: 800,
      gridSize: 20,
      snapToGrid: true,
    }),
    stageElements = $bindable<StageElement[]>([]),
    tiers = $bindable<TicketTier[]>([]),
    isSaving = false,
    isSaved = false,
    onSave,
    onFinish,
    onCloneMap,
    onBackToInventory,
  }: {
    eventTitle?: string;
    showTitle?: string;
    showsList?: { id: number; title: string | null; show_date: string }[];
    selectedShowIndex?: number;
    sections: SectionFormData[];
    mapConfig: MapConfigInput;
    stageElements: StageElement[];
    tiers?: TicketTier[];
    isSaving?: boolean;
    isSaved?: boolean;
    onSave?: () => void | Promise<void>;
    onFinish?: () => void | Promise<void>;
    onCloneMap?: () => void | Promise<void>;
    onBackToInventory?: () => void;
  } = $props();

  // ── Canvas state ──
  let selection = $state<CanvasSelection>({ kind: 'none' });
  let zoom = $state(1);
  let showGrid = $state(true);
  let snapToGrid = $state(mapConfig.snapToGrid);

  /** Called by SeatmapCanvas when internal zoom changes (wheel) */
  function handleZoomChange(newZoom: number) {
    zoom = newZoom;
  }

  // ── Seat edit mode ──
  let seatEditMode = $state(false);
  let seatEditSectionIndex = $state<number | null>(null);
  let seatEditDisabled = $state(new SvelteSet<string>());
  let seatEditSelected = $state(new SvelteSet<string>());

  // ── Undo/Redo stacks (use plain arrays to avoid reactive overhead on large snapshots) ──
  let undoStack: string[] = [];
  let redoStack: string[] = [];
  let undoLen = $state(0);
  let redoLen = $state(0);

  function pushUndo() {
    undoStack.push(
      JSON.stringify({
        sections: $state.snapshot(sections),
        stageElements: $state.snapshot(stageElements),
      }),
    );
    redoStack.length = 0;
    if (undoStack.length > 50) undoStack.splice(0, undoStack.length - 50);
    undoLen = undoStack.length;
    redoLen = 0;
  }

  function undo() {
    if (undoStack.length === 0) return;
    const current = JSON.stringify({
      sections: $state.snapshot(sections),
      stageElements: $state.snapshot(stageElements),
    });
    redoStack.push(current);
    const prev = JSON.parse(undoStack.pop()!);
    sections = prev.sections;
    stageElements = prev.stageElements;
    undoLen = undoStack.length;
    redoLen = redoStack.length;
  }

  function redo() {
    if (redoStack.length === 0) return;
    const current = JSON.stringify({
      sections: $state.snapshot(sections),
      stageElements: $state.snapshot(stageElements),
    });
    undoStack.push(current);
    const next = JSON.parse(redoStack.pop()!);
    sections = next.sections;
    stageElements = next.stageElements;
    undoLen = undoStack.length;
    redoLen = redoStack.length;
  }

  // ── Zoom controls ──
  function zoomIn() {
    zoom = Math.min(zoom * 1.2, 5);
  }
  function zoomOut() {
    zoom = Math.max(zoom / 1.2, 0.2);
  }
  function zoomFit() {
    zoom = 1;
  }

  // ── Sync tier placedCount from sections ──
  let tierPlacedCounts = $derived.by(() => {
    const countMap = new SvelteMap<string, number>();
    for (const sec of sections) {
      const key = `${sec.name}||${sec.layout_config.color}`;
      const count =
        sec.type === 'general'
          ? (sec.capacity ?? 0)
          : (sec.seat_config.rows ?? 0) * (sec.seat_config.cols ?? 0);
      countMap.set(key, (countMap.get(key) ?? 0) + count);
    }
    return countMap;
  });

  $effect(() => {
    if (tiers.length === 0) return;
    const countMap = tierPlacedCounts;
    let changed = false;
    const updated = tiers.map((t) => {
      const key = `${t.name}||${t.color}`;
      const placed = countMap.get(key) ?? 0;
      if (t.placedCount !== placed) {
        changed = true;
        return { ...t, placedCount: placed };
      }
      return t;
    });
    if (changed) {
      // Use queueMicrotask to avoid writing to `tiers` during this $effect's tracking phase
      queueMicrotask(() => {
        tiers = updated;
      });
    }
  });

  // ── Add section from tier (auto-generate block) ──
  function handleAddTierToCanvas(tierIndex: number) {
    const tier = tiers[tierIndex];
    if (!tier) return;

    pushUndo();
    const idx = sections.length;
    const remaining = Math.max(0, tier.capacity - tier.placedCount);
    if (remaining <= 0) return;

    const sec = createDefaultSection(idx);
    sec.name = tier.name;
    sec.price = tier.price;
    sec.type = tier.type;
    sec.layout_config.color = tier.color;
    sec.seat_config.prefix = tier.prefix || null;

    // Position: stagger blocks so they don't stack
    sec.layout_config.x = 50 + (idx % 4) * 180;
    sec.layout_config.y = 150 + Math.floor(idx / 4) * 180;

    if (tier.type === 'assigned') {
      const { rows, cols } = autoGridDimensions(remaining);
      sec.seat_config.rows = rows;
      sec.seat_config.cols = cols;
      sec.is_seat_pickable = true;
      sec.layout_config.width = Math.max(150, cols * 22);
      sec.layout_config.height = Math.max(100, rows * 22);
      // Auto-disable excess seats so exact capacity is preserved
      sec.disabled_seats = generateExcessDisabledSeats(
        remaining,
        rows,
        cols,
        sec.seat_config.prefix,
        sec.seat_config.startRowIndex,
        sec.seat_config.startColIndex,
      );
    } else {
      sec.capacity = remaining;
      sec.is_seat_pickable = false;
      sec.layout_config.width = 150;
      sec.layout_config.height = 100;
    }

    sections = [...sections, sec];
    selection = { kind: 'section', index: idx };
  }

  // ── Add elements from toolbox (generic) ──
  function handleAddSection(type: 'assigned' | 'general') {
    pushUndo();
    const idx = sections.length;
    const color = SECTION_COLORS[idx % SECTION_COLORS.length];

    const sec = createDefaultSection(idx);
    sec.type = type;
    sec.name = type === 'assigned' ? `Khu ${idx + 1}` : `GA ${idx + 1}`;
    sec.layout_config = {
      x: 50 + (idx % 4) * 150,
      y: 150 + Math.floor(idx / 4) * 150,
      width: type === 'assigned' ? 200 : 150,
      height: type === 'assigned' ? 150 : 100,
      rotation: 0,
      color,
    };
    if (type === 'assigned') {
      sec.seat_config.rows = 5;
      sec.seat_config.cols = 10;
    }
    if (type === 'general') {
      sec.capacity = 100;
      sec.is_seat_pickable = false;
    }

    sections = [...sections, sec];
    selection = { kind: 'section', index: idx };
  }

  function handleAddStageElement(elementType: 'stage' | 'obstacle' | 'entrance') {
    pushUndo();
    const defaults = STAGE_ELEMENT_DEFAULTS[elementType];
    const id = `${elementType}-${Date.now()}`;
    const el: StageElement = {
      id,
      type: elementType,
      label: defaults.label ?? elementType,
      x: 100 + Math.random() * 200,
      y: 50 + Math.random() * 100,
      width: defaults.width ?? 100,
      height: defaults.height ?? 60,
      rotation: 0,
    };
    stageElements = [...stageElements, el];
    selection = { kind: 'stage', id };
  }

  // ── Auto-layout: stack all blocks vertically with spacing ──
  function handleAutoLayout() {
    if (sections.length === 0) return;
    pushUndo();
    const GAP = 30;
    let currentY = 150; // leave room for stage at top

    sections = sections.map((sec) => {
      const updated = { ...sec };
      updated.layout_config = {
        ...sec.layout_config,
        x: 50,
        y: currentY,
      };
      currentY += sec.layout_config.height + GAP;
      return updated;
    });
  }

  // ── Selection handlers ──
  function handleSelect(sel: CanvasSelection) {
    selection = sel;
  }

  function handleDeselect() {
    selection = { kind: 'none' };
  }

  // ── Section update from canvas (drag/resize) ──
  // Note: pushUndo is NOT called here — it's called by dragStart handlers
  // to avoid pushing an undo entry on every micro-move during drag.
  function handleSectionTransform(
    index: number,
    layout: Partial<SectionFormData['layout_config']>,
  ) {
    sections = sections.map((sec, i) =>
      i === index ? { ...sec, layout_config: { ...sec.layout_config, ...layout } } : sec,
    );
  }

  function handleStageTransform(id: string, updates: Partial<StageElement>) {
    stageElements = stageElements.map((el) => (el.id === id ? { ...el, ...updates } : el));
  }

  /** Called before drag/transform starts to snapshot current state */
  function handleTransformStart() {
    pushUndo();
  }

  // ── Delete selected ──
  function handleDeleteSelected() {
    if (selection.kind === 'section') {
      const idx = selection.index;
      pushUndo();
      sections = sections.filter((_, i) => i !== idx);
      selection = { kind: 'none' };
    } else if (selection.kind === 'stage') {
      const id = selection.id;
      pushUndo();
      stageElements = stageElements.filter((el) => el.id !== id);
      selection = { kind: 'none' };
    }
  }

  // ── Enter seat edit mode ──
  function enterSeatEditMode(sectionIndex: number) {
    const sec = sections[sectionIndex];
    seatEditSectionIndex = sectionIndex;
    const labels = sec.disabled_seats
      ? sec.disabled_seats
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
      : [];
    seatEditDisabled = new SvelteSet(labels);
    seatEditSelected = new SvelteSet();
    seatEditMode = true;
  }

  function exitSeatEditMode() {
    if (seatEditSectionIndex !== null) {
      pushUndo();
      const idx = seatEditSectionIndex;
      sections = sections.map((sec, i) =>
        i === idx ? { ...sec, disabled_seats: [...seatEditDisabled].join(', ') } : sec,
      );
    }
    seatEditMode = false;
    seatEditSectionIndex = null;
    seatEditSelected = new SvelteSet();
  }

  // ── Keyboard shortcuts ──
  function handleKeydown(e: KeyboardEvent) {
    // Don't intercept when user is typing in an input/textarea/select
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      // Allow Escape to blur the input
      if (e.key === 'Escape') (e.target as HTMLElement).blur();
      return;
    }

    if (seatEditMode) {
      if (e.key === 'Escape') exitSeatEditMode();
      return;
    }
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      undo();
    }
    if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      redo();
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selection.kind !== 'none') handleDeleteSelected();
    }
    if (e.key === 'Escape') handleDeselect();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="fixed inset-0 z-50 flex flex-col bg-background">
  <!-- ═══ A. TOP BAR ═══ -->
  <header
    class="flex h-12 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur"
  >
    <!-- Left: Back + Event & Show info -->
    <div class="flex items-center gap-3 text-sm">
      {#if onBackToInventory && !seatEditMode}
        <Button variant="ghost" size="sm" class="h-8 gap-1.5 text-xs" onclick={onBackToInventory}>
          <ArrowLeft class="h-3.5 w-3.5" />
          Quay lại
        </Button>
        <div class="h-4 w-px bg-border"></div>
      {/if}
      {#if seatEditMode && seatEditSectionIndex !== null}
        <div class="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1 dark:bg-amber-900/20">
          <Pencil class="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span class="text-xs font-medium text-amber-700 dark:text-amber-300">
            Đang chỉnh sửa ghế: {sections[seatEditSectionIndex]?.name || 'Khu vực'}
          </span>
        </div>
      {/if}
      <span class="max-w-48 truncate font-semibold text-foreground">{eventTitle}</span>
      <span class="text-muted-foreground">›</span>
      {#if showsList.length > 1}
        <select
          class="rounded-md border border-border bg-background px-2 py-1 text-xs"
          value={selectedShowIndex}
          onchange={(e) => (selectedShowIndex = Number((e.target as HTMLSelectElement).value))}
        >
          {#each showsList as show, i (show.id)}
            <option value={i}>{show.title || `Suất #${i + 1}`} — {show.show_date}</option>
          {/each}
        </select>
      {:else}
        <span class="text-xs text-muted-foreground">{showTitle}</span>
      {/if}
      {#if showsList.length > 1}
        <span
          class="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        >
          Đang sửa: {showsList[selectedShowIndex]?.title || `Suất #${selectedShowIndex + 1}`}
        </span>
      {/if}
    </div>

    <!-- Center: Canvas tools -->
    <div class="flex items-center gap-1" class:invisible={seatEditMode}>
      <Button variant="ghost" size="icon" class="h-8 w-8" onclick={undo} disabled={undoLen === 0}>
        <Undo2 class="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" class="h-8 w-8" onclick={redo} disabled={redoLen === 0}>
        <Redo2 class="h-4 w-4" />
      </Button>
      <div class="mx-2 h-4 w-px bg-border"></div>
      <Button
        variant={showGrid ? 'secondary' : 'ghost'}
        size="icon"
        class="h-8 w-8"
        onclick={() => (showGrid = !showGrid)}
        title="Bật/Tắt lưới"
      >
        <Grid3x3 class="h-4 w-4" />
      </Button>
      <Button
        variant={snapToGrid ? 'secondary' : 'ghost'}
        size="icon"
        class="h-8 w-8"
        onclick={() => {
          snapToGrid = !snapToGrid;
          mapConfig = { ...mapConfig, snapToGrid };
        }}
        title="Snap to Grid"
      >
        <Magnet class="h-4 w-4" />
      </Button>
      <div class="mx-2 h-4 w-px bg-border"></div>
      <Button
        variant="ghost"
        size="sm"
        class="h-8 gap-1.5 text-xs"
        onclick={handleAutoLayout}
        title="Tự động sắp xếp các khối"
        disabled={sections.length === 0}
      >
        <LayoutGrid class="h-3.5 w-3.5" />
        Auto-layout
      </Button>
      {#if selection.kind === 'section' && sections[selection.index]?.type === 'assigned'}
        <div class="mx-2 h-4 w-px bg-border"></div>
        <Button
          variant="outline"
          size="sm"
          class="h-8 gap-1.5 border-amber-300 bg-amber-50 text-xs text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40"
          onclick={() => enterSeatEditMode(selection.kind === 'section' ? selection.index : 0)}
          title="Chỉnh sửa từng ghế trong khu vực này"
        >
          <Pencil class="h-3.5 w-3.5" />
          Sửa ghế
        </Button>
      {/if}
    </div>

    <!-- Right: Save & Finish -->
    <div class="flex items-center gap-2">
      {#if showsList.length > 1 && onCloneMap}
        <Button variant="outline" size="sm" class="h-8 gap-1.5 text-xs" onclick={onCloneMap}>
          <Copy class="h-3.5 w-3.5" />
          Clone cho suất khác
        </Button>
      {/if}
      <Button
        variant="outline"
        size="sm"
        class="h-8 gap-1.5 text-xs"
        onclick={onSave}
        disabled={isSaving}
      >
        {#if isSaving}
          <Loader class="h-3.5 w-3.5 animate-spin" />
        {:else if isSaved}
          <Check class="h-3.5 w-3.5" />
        {:else}
          <Save class="h-3.5 w-3.5" />
        {/if}
        {isSaved ? 'Đã lưu' : 'Lưu nháp'}
      </Button>
      <Button size="sm" class="h-8 gap-1.5 text-xs" onclick={onFinish}>
        <Check class="h-3.5 w-3.5" />
        Hoàn tất
      </Button>
    </div>
  </header>

  <!-- ═══ MAIN CONTENT ═══ -->
  <div class="flex flex-1 overflow-hidden">
    <!-- ═══ B. LEFT SIDEBAR (Toolbox) ═══ -->
    {#if !seatEditMode}
      <SeatmapToolbox
        {tiers}
        {selection}
        {sections}
        {stageElements}
        onAddSection={handleAddSection}
        onAddTierToCanvas={handleAddTierToCanvas}
        onAddStageElement={handleAddStageElement}
      />
    {/if}

    <!-- ═══ C. CENTER CANVAS ═══ -->
    <div class="relative flex-1 overflow-hidden bg-muted/30">
      {#if seatEditMode && seatEditSectionIndex !== null}
        <SeatEditMode
          section={sections[seatEditSectionIndex]}
          bind:disabledSeats={seatEditDisabled}
          bind:selectedSeats={seatEditSelected}
          onExit={exitSeatEditMode}
        />
      {:else}
        <SeatmapCanvas
          {sections}
          {stageElements}
          {mapConfig}
          {selection}
          {showGrid}
          {snapToGrid}
          {zoom}
          onSelect={handleSelect}
          onDeselect={handleDeselect}
          onSectionTransform={handleSectionTransform}
          onStageTransform={handleStageTransform}
          onTransformStart={handleTransformStart}
          onDblClickSection={enterSeatEditMode}
          onZoomChange={handleZoomChange}
        />
      {/if}

      <!-- Zoom controls (bottom-left) — hidden in seat edit mode -->
      <div
        class="absolute bottom-4 left-4 flex items-center gap-1 rounded-lg border border-border bg-background/90 p-1 shadow-sm backdrop-blur"
        class:hidden={seatEditMode}
      >
        <Button variant="ghost" size="icon" class="h-7 w-7" onclick={zoomOut}>
          <ZoomOut class="h-3.5 w-3.5" />
        </Button>
        <span class="w-12 text-center text-xs font-medium text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="ghost" size="icon" class="h-7 w-7" onclick={zoomIn}>
          <ZoomIn class="h-3.5 w-3.5" />
        </Button>
        <div class="mx-0.5 h-4 w-px bg-border"></div>
        <Button variant="ghost" size="icon" class="h-7 w-7" onclick={zoomFit} title="Fit to screen">
          <Maximize class="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>

    <!-- ═══ D. RIGHT SIDEBAR (Properties) ═══ -->
    {#if !seatEditMode}
      <SeatmapProperties
        {selection}
        bind:sections
        bind:mapConfig
        bind:stageElements
        onDelete={handleDeleteSelected}
        onEnterSeatEdit={enterSeatEditMode}
        onPushUndo={pushUndo}
      />
    {/if}
  </div>
</div>
