<script lang="ts">
  import type { MapConfigInput, SectionFormData } from '$lib/shared/schemas/event.schema';
  import { getRowLabel } from '$lib/utils/seat-label';
  import type Konva from 'konva';
  import { onMount } from 'svelte';
  import { Group, Layer, Line, Rect, Stage, Text, Transformer } from 'svelte-konva';
  import { LOD_SEAT_ZOOM, SECTION_COLORS, type CanvasSelection, type StageElement } from './types';

  let {
    sections,
    stageElements,
    mapConfig,
    selection,
    showGrid,
    snapToGrid,
    zoom = 1,
    onSelect,
    onDeselect,
    onSectionTransform,
    onStageTransform,
    onTransformStart,
    onDblClickSection,
    onZoomChange,
  }: {
    sections: SectionFormData[];
    stageElements: StageElement[];
    mapConfig: MapConfigInput;
    selection: CanvasSelection;
    showGrid: boolean;
    snapToGrid: boolean;
    zoom?: number;
    onSelect: (sel: CanvasSelection) => void;
    onDeselect: () => void;
    onSectionTransform: (index: number, layout: Partial<SectionFormData['layout_config']>) => void;
    onStageTransform: (id: string, updates: Partial<StageElement>) => void;
    onTransformStart?: () => void;
    onDblClickSection: (index: number) => void;
    onZoomChange?: (zoom: number) => void;
  } = $props();

  // ── Container sizing ──
  let containerEl = $state<HTMLDivElement>();
  let stageWidth = $state(900);
  let stageHeight = $state(600);

  onMount(() => {
    if (!containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    stageWidth = rect.width;
    stageHeight = rect.height;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      stageWidth = entry.contentRect.width;
      stageHeight = entry.contentRect.height;
    });
    ro.observe(containerEl);
    return () => ro.disconnect();
  });

  // ── Refs ──
  let stageRef = $state<ReturnType<typeof Stage>>();
  let sectionTransformerRef = $state<ReturnType<typeof Transformer>>();
  let stageElTransformerRef = $state<ReturnType<typeof Transformer>>();
  let sectionGroupRefs = $state<Record<number, ReturnType<typeof Group>>>({});
  let stageElGroupRefs = $state<Record<string, ReturnType<typeof Group>>>({});

  // ── Cleanup stale refs when sections/stageElements are removed ──
  $effect(() => {
    const validIndices = new Set(sections.map((_, i) => i));
    for (const key of Object.keys(sectionGroupRefs)) {
      const idx = Number(key);
      if (!validIndices.has(idx)) {
        delete sectionGroupRefs[idx];
      }
    }
  });

  $effect(() => {
    const validIds = new Set(stageElements.map((el) => el.id));
    for (const key of Object.keys(stageElGroupRefs)) {
      if (!validIds.has(key)) {
        delete stageElGroupRefs[key];
      }
    }
  });

  // ── Track stage scale for LOD ──
  let stageScale = $state(1);

  // ── Apply zoom from parent (button clicks) to Konva stage ──
  $effect(() => {
    const st = stageRef?.node;
    if (!st) return;
    const currentScale = st.scaleX();
    // Only apply if meaningfully different (avoids fighting with wheel zoom)
    if (Math.abs(currentScale - zoom) > 0.001) {
      // Zoom toward center of viewport
      const centerX = stageWidth / 2;
      const centerY = stageHeight / 2;
      const oldScale = currentScale;
      const mousePointTo = {
        x: (centerX - st.x()) / oldScale,
        y: (centerY - st.y()) / oldScale,
      };
      st.scale({ x: zoom, y: zoom });
      st.position({
        x: centerX - mousePointTo.x * zoom,
        y: centerY - mousePointTo.y * zoom,
      });
      stageScale = zoom;
    }
  });

  // ── Wire section transformer imperatively ──
  $effect(() => {
    if (!sectionTransformerRef) return;
    const tr = sectionTransformerRef.node;
    if (!tr) return;
    if (selection.kind === 'section' && sectionGroupRefs[selection.index]?.node) {
      tr.nodes([sectionGroupRefs[selection.index].node]);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  });

  // ── Wire stage element transformer imperatively ──
  $effect(() => {
    if (!stageElTransformerRef) return;
    const tr = stageElTransformerRef.node;
    if (!tr) return;
    if (selection.kind === 'stage' && stageElGroupRefs[selection.id]?.node) {
      tr.nodes([stageElGroupRefs[selection.id].node]);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  });

  // ── Build grid lines data ──
  let gridLines = $derived.by(() => {
    if (!showGrid) return [];
    const gs = mapConfig.gridSize || 20;
    const cw = mapConfig.width;
    const ch = mapConfig.height;
    const lines: { points: number[]; key: string }[] = [];

    // Vertical lines
    for (let x = 0; x <= cw; x += gs) {
      lines.push({ points: [x, 0, x, ch], key: `v-${x}` });
    }
    // Horizontal lines
    for (let y = 0; y <= ch; y += gs) {
      lines.push({ points: [0, y, cw, y], key: `h-${y}` });
    }
    return lines;
  });

  // ── Snap helper ──
  function snapValue(val: number): number {
    if (!snapToGrid) return Math.round(val);
    const g = mapConfig.gridSize || 20;
    return Math.round(val / g) * g;
  }

  // ── Stage element colors ──
  function stageElFill(type: string) {
    return type === 'stage' ? '#a78bfa' : type === 'obstacle' ? '#9ca3af' : '#86efac';
  }
  function stageElStroke(type: string) {
    return type === 'stage' ? '#7c3aed' : type === 'obstacle' ? '#6b7280' : '#22c55e';
  }

  // ── Section seat data builder (memoized per section) ──
  type SeatDot = {
    key: string;
    cx: number;
    cy: number;
    radius: number;
    fill: string;
    opacity: number;
    stroke: string;
    label: string;
    showLabel: boolean;
    fontSize: number;
  };

  // Memoization cache to avoid recomputing seat dots every render (plain Map, no reactivity needed)
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const seatDotsCache = new Map<string, SeatDot[]>();

  function seatDotsCacheKey(sec: SectionFormData): string {
    const lc = sec.layout_config;
    const sc = sec.seat_config;
    return `${lc.width}|${lc.height}|${lc.color}|${sc.rows}|${sc.cols}|${sc.prefix}|${sc.rowFormat}|${sc.colDirection}|${sc.startRowIndex}|${sc.startColIndex}|${sec.disabled_seats}`;
  }

  function buildSeatDots(sec: SectionFormData): SeatDot[] {
    const cacheKey = seatDotsCacheKey(sec);
    const cached = seatDotsCache.get(cacheKey);
    if (cached) return cached;

    const lc = sec.layout_config;
    const sc = sec.seat_config;
    if (sc.rows <= 0 || sc.cols <= 0) return [];

    const disabledSet = new Set(
      sec.disabled_seats
        ? sec.disabled_seats
            .split(',')
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean)
        : [],
    );
    const cellW = lc.width / sc.cols;
    const cellH = lc.height / sc.rows;
    const dotRadius = Math.min(cellW, cellH) * 0.35;
    const showLabels = cellW > 18;
    const color = lc.color || '#3b82f6';
    const fontSize = Math.min(8, cellW * 0.35);
    const dots: SeatDot[] = [];

    for (let r = 0; r < sc.rows; r++) {
      const rowLabel =
        sc.rowFormat === 'alphabetic'
          ? getRowLabel(sc.startRowIndex + r - 1)
          : String(sc.startRowIndex + r);
      for (let c = 0; c < sc.cols; c++) {
        const colNum =
          sc.colDirection === 'ltr' ? sc.startColIndex + c : sc.startColIndex + (sc.cols - 1 - c);
        const prefix = sc.prefix ? `${sc.prefix}-` : '';
        const seatKey = `${prefix}${rowLabel}${colNum}`;
        const isDisabled = disabledSet.has(seatKey);

        dots.push({
          key: seatKey,
          cx: cellW * c + cellW / 2,
          cy: cellH * r + cellH / 2,
          radius: dotRadius,
          fill: isDisabled ? 'rgba(239, 68, 68, 0.4)' : color,
          opacity: isDisabled ? 0.4 : 0.8,
          stroke: isDisabled ? '#dc2626' : '#ffffff',
          label: `${rowLabel}${colNum}`,
          showLabel: showLabels,
          fontSize,
        });
      }
    }

    // Keep cache bounded (LRU-style eviction)
    if (seatDotsCache.size > 50) {
      const firstKey = seatDotsCache.keys().next().value;
      if (firstKey !== undefined) seatDotsCache.delete(firstKey);
    }
    seatDotsCache.set(cacheKey, dots);
    return dots;
  }

  function getContrastColor(hex: string): string {
    try {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? '#1f2937' : '#ffffff';
    } catch {
      return '#ffffff';
    }
  }

  function getSectionLabel(sec: SectionFormData, idx: number): string {
    const seatCount =
      sec.type === 'general'
        ? sec.capacity
        : (sec.seat_config.rows ?? 0) * (sec.seat_config.cols ?? 0);
    return `${sec.name || `Khu ${idx + 1}`}\n${seatCount} ${sec.type === 'general' ? 'vé' : 'ghế'}`;
  }

  // ── Stage click handler (deselect when clicking background) ──
  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    // Only deselect when clicking directly on the stage or the background rect
    const target = e.target;
    const stage = stageRef?.node;
    if (!stage) return;
    // If the click target is the stage itself or the background rect, deselect
    if (target === stage || target.name() === 'bg-rect') {
      onDeselect();
    }
  }

  // ── Wheel zoom ──
  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const st = stageRef?.node;
    if (!st) return;
    const oldScale = st.scaleX();
    const pointer = st.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = {
      x: (pointer.x - st.x()) / oldScale,
      y: (pointer.y - st.y()) / oldScale,
    };
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const factor = 1.08;
    const newScale = direction > 0 ? oldScale * factor : oldScale / factor;
    const clampedScale = Math.max(0.1, Math.min(5, newScale));
    st.scale({ x: clampedScale, y: clampedScale });
    st.position({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
    stageScale = clampedScale;
    onZoomChange?.(clampedScale);
  }

  // ── Section event handlers ──
  function handleSectionClick(idx: number, e: Konva.KonvaEventObject<MouseEvent>) {
    e.cancelBubble = true;
    onSelect({ kind: 'section', index: idx });
  }

  function handleSectionDblClick(
    idx: number,
    sec: SectionFormData,
    e: Konva.KonvaEventObject<MouseEvent>,
  ) {
    e.cancelBubble = true;
    if (sec.type === 'assigned') {
      onDblClickSection(idx);
    }
  }

  function handleSectionDragStart(_e: Konva.KonvaEventObject<Event>) {
    onTransformStart?.();
  }

  function handleSectionDragMove(e: Konva.KonvaEventObject<Event>) {
    if (!snapToGrid) return;
    const node = e.target;
    const g = mapConfig.gridSize || 20;
    node.x(Math.round(node.x() / g) * g);
    node.y(Math.round(node.y() / g) * g);
  }

  function handleSectionDragEnd(idx: number, e: Konva.KonvaEventObject<Event>) {
    const node = e.target;
    onSectionTransform(idx, {
      x: snapValue(node.x()),
      y: snapValue(node.y()),
    });
  }

  function handleSectionTransformStart(_e: Konva.KonvaEventObject<Event>) {
    onTransformStart?.();
  }

  function handleSectionTransformEnd(idx: number, e: Konva.KonvaEventObject<Event>) {
    const node = e.target;
    const sx = node.scaleX();
    const sy = node.scaleY();
    // Get old dimensions from state since Group.width()/height() returns 0
    const oldW = sections[idx].layout_config.width;
    const oldH = sections[idx].layout_config.height;
    // Reset scale to 1 so Konva doesn't double-apply
    node.scaleX(1);
    node.scaleY(1);
    onSectionTransform(idx, {
      x: snapValue(node.x()),
      y: snapValue(node.y()),
      width: Math.max(20, Math.round(oldW * sx)),
      height: Math.max(20, Math.round(oldH * sy)),
      rotation: Math.round(node.rotation()),
    });
  }

  // ── Stage element event handlers ──
  function handleStageElClick(id: string, e: Konva.KonvaEventObject<MouseEvent>) {
    e.cancelBubble = true;
    onSelect({ kind: 'stage', id });
  }

  function handleStageElDragStart(_e: Konva.KonvaEventObject<Event>) {
    onTransformStart?.();
  }

  function handleStageElDragMove(e: Konva.KonvaEventObject<Event>) {
    if (!snapToGrid) return;
    const node = e.target;
    const g = mapConfig.gridSize || 20;
    node.x(Math.round(node.x() / g) * g);
    node.y(Math.round(node.y() / g) * g);
  }

  function handleStageElDragEnd(id: string, e: Konva.KonvaEventObject<Event>) {
    const node = e.target;
    onStageTransform(id, {
      x: snapValue(node.x()),
      y: snapValue(node.y()),
    });
  }

  function handleStageElTransformStart(_e: Konva.KonvaEventObject<Event>) {
    onTransformStart?.();
  }

  function handleStageElTransformEnd(id: string, e: Konva.KonvaEventObject<Event>) {
    const node = e.target;
    const sx = node.scaleX();
    const sy = node.scaleY();
    // Get old dimensions from state since Group.width()/height() returns 0
    const el = stageElements.find((el) => el.id === id);
    const oldW = el?.width ?? 100;
    const oldH = el?.height ?? 60;
    node.scaleX(1);
    node.scaleY(1);
    onStageTransform(id, {
      x: snapValue(node.x()),
      y: snapValue(node.y()),
      width: Math.max(10, Math.round(oldW * sx)),
      height: Math.max(10, Math.round(oldH * sy)),
      rotation: Math.round(node.rotation()),
    });
  }

  // ── LOD flags ──
  let showSeatsFlags = $derived(
    sections.map(
      (sec) =>
        stageScale >= LOD_SEAT_ZOOM &&
        sec.type === 'assigned' &&
        sec.seat_config.rows > 0 &&
        sec.seat_config.cols > 0,
    ),
  );
</script>

<div bind:this={containerEl} class="h-full w-full cursor-grab active:cursor-grabbing">
  {#if stageWidth > 0 && stageHeight > 0}
    <Stage
      bind:this={stageRef}
      width={stageWidth}
      height={stageHeight}
      draggable
      onpointerclick={handleStageClick}
      onwheel={handleWheel}
    >
      <!-- Single layer for everything (grid + objects + transformers) -->
      <Layer>
        <!-- Canvas background (click target for deselect) -->
        <Rect
          name="bg-rect"
          x={0}
          y={0}
          width={mapConfig.width}
          height={mapConfig.height}
          fill="#fafafa"
          stroke="#e5e7eb"
          strokeWidth={1}
        />

        <!-- Grid lines -->
        {#if showGrid}
          {#each gridLines as line (line.key)}
            <Line
              points={line.points}
              stroke="#e5e7eb"
              strokeWidth={0.5}
              opacity={0.6}
              listening={false}
            />
          {/each}
        {/if}

        <!-- Stage elements -->
        {#each stageElements as el (el.id)}
          {@const isSelected = selection.kind === 'stage' && selection.id === el.id}
          <Group
            bind:this={stageElGroupRefs[el.id]}
            x={el.x}
            y={el.y}
            rotation={el.rotation}
            draggable
            onpointerclick={(e) => handleStageElClick(el.id, e)}
            ondragstart={handleStageElDragStart}
            ondragmove={handleStageElDragMove}
            ondragend={(e) => handleStageElDragEnd(el.id, e)}
            ontransformstart={handleStageElTransformStart}
            ontransformend={(e) => handleStageElTransformEnd(el.id, e)}
          >
            <Rect
              width={el.width}
              height={el.height}
              fill={stageElFill(el.type)}
              stroke={isSelected ? '#2563eb' : stageElStroke(el.type)}
              strokeWidth={isSelected ? 2 : 1}
              cornerRadius={el.type === 'stage' ? 8 : 4}
            />
            <Text
              text={el.label}
              width={el.width}
              height={el.height}
              align="center"
              verticalAlign="middle"
              fontSize={12}
              fontStyle="bold"
              fill="#fff"
              listening={false}
            />
          </Group>
        {/each}

        <!-- Seat sections (keyed by name+color+index for stable identity) -->
        {#each sections as sec, idx (`${idx}-${sec.name}-${sec.layout_config.color}`)}
          {@const lc = sec.layout_config}
          {@const isSelected = selection.kind === 'section' && selection.index === idx}
          {@const color = lc.color || SECTION_COLORS[idx % SECTION_COLORS.length]}
          {@const showSeats = showSeatsFlags[idx]}

          <Group
            bind:this={sectionGroupRefs[idx]}
            x={lc.x}
            y={lc.y}
            rotation={lc.rotation}
            draggable
            onpointerclick={(e) => handleSectionClick(idx, e)}
            ondblclick={(e) => handleSectionDblClick(idx, sec, e)}
            ondragstart={handleSectionDragStart}
            ondragmove={handleSectionDragMove}
            ondragend={(e) => handleSectionDragEnd(idx, e)}
            ontransformstart={handleSectionTransformStart}
            ontransformend={(e) => handleSectionTransformEnd(idx, e)}
          >
            <!-- Block background -->
            <Rect
              width={lc.width}
              height={lc.height}
              fill={color}
              opacity={0.3}
              stroke={isSelected ? '#2563eb' : color}
              strokeWidth={isSelected ? 2 : 1}
              cornerRadius={6}
            />

            {#if showSeats}
              <!-- LOD: individual seat dots when zoomed in -->
              {#each buildSeatDots(sec) as dot (dot.key)}
                <Rect
                  x={dot.cx - dot.radius}
                  y={dot.cy - dot.radius}
                  width={dot.radius * 2}
                  height={dot.radius * 2}
                  cornerRadius={dot.radius}
                  fill={dot.fill}
                  opacity={dot.opacity}
                  stroke={dot.stroke}
                  strokeWidth={0.5}
                  listening={false}
                />
                {#if dot.showLabel}
                  <Text
                    x={dot.cx - 10}
                    y={dot.cy - 4}
                    width={20}
                    text={dot.label}
                    fontSize={dot.fontSize}
                    fill="#fff"
                    align="center"
                    listening={false}
                  />
                {/if}
              {/each}
            {:else}
              <!-- LOD: block label when zoomed out -->
              <Text
                text={getSectionLabel(sec, idx)}
                width={lc.width}
                height={lc.height}
                align="center"
                verticalAlign="middle"
                fontSize={Math.min(14, lc.width / 8)}
                fontStyle="bold"
                fill={getContrastColor(color)}
                listening={false}
                padding={4}
              />
            {/if}
          </Group>
        {/each}

        <!-- Transformers at bottom of layer, wired via $effect -->
        <Transformer
          bind:this={stageElTransformerRef}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          rotateEnabled={true}
        />
        <Transformer
          bind:this={sectionTransformerRef}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          rotateEnabled={true}
        />
      </Layer>
    </Stage>
  {/if}
</div>
