<!--
  SeatMap.svelte
  Unified SVG seat map component.
  - Interactive mode (default): seat picking for customer booking page
  - Readonly mode: preview for admin detail / customer event detail pages
-->
<script lang="ts">
  import type { SeatSelectionStore } from '$lib/stores/seat-selection-store.svelte';
  import type { MapConfig, SeatMapSeat, SeatMapSection, StageElement } from '$lib/types/seat-map';
  import { formatPrice } from '$lib/utils/price';
  import { getRowLabel } from '$lib/utils/seat-label';
  import { Minus, Plus, RotateCcw } from 'lucide-svelte';
  import SectionLegend from './SectionLegend.svelte';

  const CLICK_THRESHOLD = 4;

  interface Props {
    sections: SeatMapSection[];
    mapConfig: MapConfig;
    stageLayout: StageElement[];
    store?: SeatSelectionStore | null;
    readonly?: boolean;
    showAvailability?: boolean;
  }

  let {
    sections,
    mapConfig,
    stageLayout,
    store = null,
    readonly = false,
    showAvailability = true,
  }: Props = $props();

  // ── Container ──
  let containerEl = $state<HTMLDivElement>();

  // ── Zoom / Pan ──
  let zoom = $state(1);
  let panX = $state(0);
  let panY = $state(0);
  let isPanning = $state(false);
  let panStartX = $state(0);
  let panStartY = $state(0);
  let didDrag = $state(false);
  let mouseDownX = $state(0);
  let mouseDownY = $state(0);

  const MIN_ZOOM = 0.2;
  const MAX_ZOOM = 5;

  function zoomIn() {
    zoom = Math.min(MAX_ZOOM, zoom * 1.3);
  }
  function zoomOut() {
    zoom = Math.max(MIN_ZOOM, zoom / 1.3);
  }
  function resetZoom() {
    zoom = 1;
    panX = 0;
    panY = 0;
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const dir = e.deltaY > 0 ? -1 : 1;
    const next = dir > 0 ? zoom * 1.08 : zoom / 1.08;
    zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
  }

  function handleMouseDown(e: MouseEvent) {
    isPanning = true;
    didDrag = false;
    mouseDownX = e.clientX;
    mouseDownY = e.clientY;
    panStartX = e.clientX - panX;
    panStartY = e.clientY - panY;
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isPanning) return;
    const dx = e.clientX - mouseDownX;
    const dy = e.clientY - mouseDownY;
    if (!didDrag && Math.abs(dx) + Math.abs(dy) > CLICK_THRESHOLD) {
      didDrag = true;
    }
    panX = e.clientX - panStartX;
    panY = e.clientY - panStartY;
  }

  function handleMouseUp() {
    isPanning = false;
  }

  // ── Touch pan ──
  let lastTouchX = $state(0);
  let lastTouchY = $state(0);
  let isTouchPanning = $state(false);

  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      isTouchPanning = true;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (isTouchPanning && e.touches.length === 1) {
      panX += e.touches[0].clientX - lastTouchX;
      panY += e.touches[0].clientY - lastTouchY;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
    }
  }

  function handleTouchEnd() {
    isTouchPanning = false;
  }

  // ── Stage element helpers ──
  function stageElFill(type: string): string {
    switch (type) {
      case 'stage':
      case 'rect':
        return '#a78bfa';
      case 'obstacle':
        return '#9ca3af';
      case 'entrance':
        return '#86efac';
      default:
        return '#d1d5db';
    }
  }

  function stageElStroke(type: string): string {
    switch (type) {
      case 'stage':
      case 'rect':
        return '#7c3aed';
      case 'obstacle':
        return '#6b7280';
      case 'entrance':
        return '#22c55e';
      default:
        return '#9ca3af';
    }
  }

  function getStageElDimensions(el: StageElement): { w: number; h: number } {
    return { w: el.w ?? el.width ?? 100, h: el.h ?? el.height ?? 60 };
  }

  // ── Adaptive text sizing — fits inside a box of (w, h) ──
  // Estimates text width as charCount * fontSize * 0.6
  function fitFontSize(text: string, maxW: number, maxH: number, maxFs: number): number {
    const charW = 0.6; // approximate ratio
    const byWidth = maxW / (text.length * charW || 1);
    const byHeight = maxH;
    return Math.max(6, Math.min(maxFs, byWidth, byHeight));
  }

  // ── Seat dot type ──
  type SeatDot = {
    key: string;
    cx: number;
    cy: number;
    radius: number;
    fill: string;
    opacity: number;
    seatId: number;
    status: string;
    isPickable: boolean;
    label: string;
    title: string;
  };

  function buildSeatDots(sec: SeatMapSection): SeatDot[] {
    const lc = sec.layout_config;
    const cfg = sec.seat_config;
    if (cfg.rows <= 0 || cfg.cols <= 0) return [];
    if (sec.type !== 'assigned') return [];

    const cellW = lc.width / cfg.cols;
    const cellH = lc.height / cfg.rows;
    const dotRadius = Math.min(cellW, cellH) * 0.35;

    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const seatLookup = new Map<string, SeatMapSeat>();
    for (const seat of sec.seats) {
      seatLookup.set(`${seat.row_label}-${seat.col_number}`, seat);
    }

    const dots: SeatDot[] = [];
    for (let r = 0; r < cfg.rows; r++) {
      const rowLabel =
        cfg.rowFormat === 'alphabetic'
          ? getRowLabel(cfg.startRowIndex + r - 1)
          : String(cfg.startRowIndex + r);
      for (let c = 0; c < cfg.cols; c++) {
        const colNum =
          cfg.colDirection === 'ltr'
            ? cfg.startColIndex + c
            : cfg.startColIndex + (cfg.cols - 1 - c);
        const seat = seatLookup.get(`${rowLabel}-${colNum}`);
        if (!seat || seat.status === 'disabled') continue;

        const cx = cellW * c + cellW / 2;
        const cy = cellH * r + cellH / 2;
        const isSelected = !readonly && store ? store.isSeatSelected(seat.id) : false;
        const prefix = seat.prefix ? `${seat.prefix}-` : '';
        const seatLabel = `${prefix}${seat.row_label}${seat.col_number}`;

        let fill: string;
        let opacity = 0.85;
        let statusText: string;
        if (isSelected) {
          fill = '#ca8a04';
          opacity = 1;
          statusText = 'Đang chọn';
        } else {
          switch (seat.status) {
            case 'available':
              fill = '#16a34a';
              statusText = 'Trống';
              break;
            case 'locked':
              fill = '#dc2626';
              statusText = 'Đang giữ';
              break;
            case 'sold':
              fill = '#6b7580';
              statusText = 'Đã bán';
              break;
            default:
              fill = '#6b7580';
              statusText = '';
          }
        }

        dots.push({
          key: `${sec.id}-${rowLabel}-${colNum}`,
          cx,
          cy,
          radius: dotRadius,
          fill,
          opacity,
          seatId: seat.id,
          status: seat.status,
          isPickable: !readonly && sec.type === 'assigned',
          label: seatLabel,
          title: `${seatLabel} (${statusText})`,
        });
      }
    }
    return dots;
  }

  let allSectionDots = $derived(
    sections.map((sec) => ({
      section: sec,
      dots: sec.type === 'assigned' ? buildSeatDots(sec) : [],
    })),
  );

  // ── Seat click ──
  function handleSeatClick(e: Event, sec: SeatMapSection, seatId: number, status: string) {
    if (readonly || !store) return;
    e.stopPropagation();
    if (didDrag) return;
    if (sec.type !== 'assigned') return;
    if (status !== 'available' && !store.isSeatSelected(seatId)) return;
    const seat = sec.seats.find((s) => s.id === seatId);
    if (!seat) return;
    const prefix = seat.prefix ? `${seat.prefix}-` : '';
    const label = `${prefix}${seat.row_label}${seat.col_number}`;
    store.toggleSeat(seatId, label, sec.id, sec.name, Number(sec.price));
  }

  // ── General section availability ──
  function getAvailableCount(sec: SeatMapSection): number {
    if (sec.type === 'general') {
      const sold = sec.seats.filter((s) => s.status === 'sold' || s.status === 'locked').length;
      return sec.capacity - sold;
    }
    return sec.seats.filter((s) => s.status === 'available').length;
  }

  function getTotalCount(sec: SeatMapSection): number {
    if (sec.type === 'general') return sec.capacity;
    return sec.seats.filter((s) => s.status !== 'disabled').length;
  }

  // ── Tooltip ──
  let tooltip = $state<{ visible: boolean; x: number; y: number; text: string }>({
    visible: false,
    x: 0,
    y: 0,
    text: '',
  });

  function showTooltip(e: MouseEvent, text: string) {
    const rect = containerEl?.getBoundingClientRect();
    if (!rect) return;
    tooltip = { visible: true, x: e.clientX - rect.left, y: e.clientY - rect.top - 10, text };
  }

  function hideTooltip() {
    tooltip.visible = false;
  }

  // ── Color helpers ──
  function hexToRgba(hex: string, alpha: number): string {
    try {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch {
      return `rgba(128, 128, 128, ${alpha})`;
    }
  }

  function getContrastColor(hex: string): string {
    try {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return lum > 0.5 ? '#1f2937' : '#ffffff';
    } catch {
      return '#ffffff';
    }
  }

  // Whether to show individual dots or just label for assigned sections
  // In readonly mode, hide dots when zoomed out; in interactive mode always show them
  let showDots = $derived(readonly ? zoom >= 1.0 : zoom >= 0.8);
</script>

<div class="flex flex-col gap-4 {readonly ? '' : 'lg:flex-row'}">
  <!-- Canvas column -->
  <div
    class="flex flex-1 flex-col overflow-hidden rounded-xl {readonly
      ? 'border border-border/50 bg-muted/10'
      : 'bg-surface-container-low'}"
  >
    <!-- Zoom controls -->
    <div class="flex items-center justify-between border-b border-border/30 px-3 py-2">
      <span class="text-xs font-medium text-muted-foreground">Zoom: {Math.round(zoom * 100)}%</span>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-surface-container-high text-foreground transition-colors hover:bg-surface-container-highest disabled:opacity-40"
          disabled={zoom <= MIN_ZOOM}
          onclick={zoomOut}
          title="Thu nhỏ"
        >
          <Minus class="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          class="flex h-7 cursor-pointer items-center justify-center rounded-md bg-surface-container-high px-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-container-highest"
          onclick={resetZoom}
          title="Đặt lại"
        >
          <RotateCcw class="h-3 w-3" />
        </button>
        <button
          type="button"
          class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-surface-container-high text-foreground transition-colors hover:bg-surface-container-highest disabled:opacity-40"
          disabled={zoom >= MAX_ZOOM}
          onclick={zoomIn}
          title="Phóng to"
        >
          <Plus class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <!-- SVG Canvas -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      bind:this={containerEl}
      class="relative min-h-0 flex-1 cursor-grab overflow-hidden select-none active:cursor-grabbing"
      style="min-height:500px; max-height:80vh;"
      role="application"
      aria-label="Sơ đồ chỗ ngồi"
      onwheel={handleWheel}
      onmousedown={handleMouseDown}
      onmousemove={handleMouseMove}
      onmouseup={handleMouseUp}
      onmouseleave={handleMouseUp}
      ontouchstart={handleTouchStart}
      ontouchmove={handleTouchMove}
      ontouchend={handleTouchEnd}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 {mapConfig.width} {mapConfig.height}"
        preserveAspectRatio="xMidYMid meet"
        style="transform: scale({zoom}) translate({panX / zoom}px, {panY /
          zoom}px); transform-origin: center center;"
      >
        <!-- Background -->
        <rect
          x="0"
          y="0"
          width={mapConfig.width}
          height={mapConfig.height}
          fill="#fafafa"
          stroke="#e5e7eb"
          stroke-width="1"
          rx="8"
          ry="8"
        />

        <!-- Stage elements -->
        {#each stageLayout as el (el.id)}
          {@const dim = getStageElDimensions(el)}
          {@const rot = el.rotation ?? 0}
          <g transform="translate({el.x}, {el.y}) rotate({rot}, {dim.w / 2}, {dim.h / 2})">
            <rect
              x="0"
              y="0"
              width={dim.w}
              height={dim.h}
              fill={stageElFill(el.type)}
              stroke={stageElStroke(el.type)}
              stroke-width="1.5"
              rx={el.type === 'stage' ? 8 : 4}
              ry={el.type === 'stage' ? 8 : 4}
              opacity="0.9"
            />
            <text
              x={dim.w / 2}
              y={dim.h / 2}
              text-anchor="middle"
              dominant-baseline="central"
              fill="white"
              font-size={Math.min(14, dim.w / 6)}
              font-weight="bold"
            >
              {el.label}
            </text>
          </g>
        {/each}

        <!-- Seat sections -->
        {#each allSectionDots as { section: sec, dots } (sec.id)}
          {@const lc = sec.layout_config}
          {@const color = lc.color || '#3b82f6'}
          {@const avail = getAvailableCount(sec)}
          {@const total = getTotalCount(sec)}
          {@const soldOut = avail === 0 && showAvailability}
          {@const pad = 6}
          {@const innerW = lc.width - pad * 2}
          {@const innerH = lc.height - pad * 2}

          <g
            transform="translate({lc.x}, {lc.y}){lc.rotation
              ? ` rotate(${lc.rotation}, ${lc.width / 2}, ${lc.height / 2})`
              : ''}"
          >
            <!-- Section background -->
            <rect
              x="0"
              y="0"
              width={lc.width}
              height={lc.height}
              fill={hexToRgba(color, 0.2)}
              stroke={hexToRgba(color, 0.5)}
              stroke-width="1"
              rx="6"
              ry="6"
            />

            {#if sec.type === 'assigned'}
              <!-- ═══ ASSIGNED SECTION ═══ -->

              {#if showDots && dots.length > 0}
                <!-- Section name behind dots (low opacity) -->
                <text
                  x={lc.width / 2}
                  y={lc.height / 2}
                  text-anchor="middle"
                  dominant-baseline="central"
                  fill={getContrastColor(color)}
                  font-size={fitFontSize(sec.name, innerW, innerH * 0.3, 14)}
                  font-weight="bold"
                  class="pointer-events-none"
                  opacity="0.35"
                >
                  {sec.name}
                </text>

                <!-- Seat dots -->
                {#each dots as dot (dot.key)}
                  {#if dot.isPickable && (dot.status === 'available' || (store && store.isSeatSelected(dot.seatId)))}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <circle
                      cx={dot.cx}
                      cy={dot.cy}
                      r={dot.radius}
                      fill={dot.fill}
                      opacity={dot.opacity}
                      stroke="white"
                      stroke-width="0.5"
                      class="seat-dot seat-dot--interactive"
                      onclick={(e: MouseEvent) => handleSeatClick(e, sec, dot.seatId, dot.status)}
                      onmouseenter={(e: MouseEvent) => showTooltip(e, dot.title)}
                      onmouseleave={hideTooltip}
                    >
                      <title>{dot.title}</title>
                    </circle>
                  {:else}
                    <circle
                      cx={dot.cx}
                      cy={dot.cy}
                      r={dot.radius}
                      fill={dot.fill}
                      opacity={dot.opacity}
                      stroke="white"
                      stroke-width="0.5"
                      onmouseenter={(e: MouseEvent) => showTooltip(e, dot.title)}
                      onmouseleave={hideTooltip}
                    >
                      <title>{dot.title}</title>
                    </circle>
                  {/if}
                {/each}
              {:else}
                <!-- Low zoom / no dots: show label only -->
                {@const lines = showAvailability ? 3 : 2}
                {@const slotH = innerH / lines}
                {@const nameFs = fitFontSize(sec.name, innerW, slotH * 0.8, 16)}
                {@const subFs = nameFs * 0.75}
                {@const gap = nameFs * 1.4}
                {@const blockH = gap * (lines - 1)}
                {@const baseY = lc.height / 2 - blockH / 2}

                <text
                  x={lc.width / 2}
                  y={baseY}
                  text-anchor="middle"
                  dominant-baseline="central"
                  fill={getContrastColor(color)}
                  font-size={nameFs}
                  font-weight="bold"
                  class="pointer-events-none"
                >
                  {sec.name}
                </text>
                {#if showAvailability}
                  <text
                    x={lc.width / 2}
                    y={baseY + gap}
                    text-anchor="middle"
                    dominant-baseline="central"
                    fill={getContrastColor(color)}
                    font-size={subFs}
                    opacity="0.8"
                    class="pointer-events-none"
                  >
                    {#if soldOut}Hết vé{:else}{avail}/{total} ghế trống{/if}
                  </text>
                {/if}
                <text
                  x={lc.width / 2}
                  y={baseY + gap * (showAvailability ? 2 : 1)}
                  text-anchor="middle"
                  dominant-baseline="central"
                  fill={getContrastColor(color)}
                  font-size={subFs * 0.85}
                  opacity="0.65"
                  class="pointer-events-none"
                >
                  {formatPrice(Number(sec.price))}
                </text>
              {/if}

              <!-- Sold out overlay -->
              {#if soldOut}
                <rect
                  x="0"
                  y="0"
                  width={lc.width}
                  height={lc.height}
                  fill="rgba(0,0,0,0.12)"
                  rx="6"
                  ry="6"
                />
              {/if}
            {:else}
              <!-- ═══ GENERAL SECTION ═══ -->
              {@const lines = showAvailability ? 3 : 2}
              {@const slotH = innerH / lines}
              {@const nameFs = fitFontSize(sec.name, innerW, slotH * 0.8, 18)}
              {@const subText = `Vé đứng • ${formatPrice(Number(sec.price))}`}
              {@const subFs = fitFontSize(subText, innerW, slotH * 0.7, nameFs * 0.8)}
              {@const availText = `Còn ${avail} / ${total}`}
              {@const detailFs = fitFontSize(availText, innerW, slotH * 0.6, subFs * 0.9)}
              {@const gap = Math.max(nameFs, subFs) * 1.4}
              {@const blockH = gap * (lines - 1)}
              {@const baseY = lc.height / 2 - blockH / 2}

              <text
                x={lc.width / 2}
                y={baseY}
                text-anchor="middle"
                dominant-baseline="central"
                fill={getContrastColor(color)}
                font-size={nameFs}
                font-weight="bold"
              >
                {sec.name}
              </text>
              <text
                x={lc.width / 2}
                y={baseY + gap}
                text-anchor="middle"
                dominant-baseline="central"
                fill={getContrastColor(color)}
                font-size={subFs}
                opacity="0.85"
              >
                {subText}
              </text>
              {#if showAvailability}
                <text
                  x={lc.width / 2}
                  y={baseY + gap * 2}
                  text-anchor="middle"
                  dominant-baseline="central"
                  fill={getContrastColor(color)}
                  font-size={detailFs}
                  opacity="0.7"
                >
                  {#if soldOut}Hết vé{:else}{availText}{/if}
                </text>
              {/if}

              <!-- Sold out overlay -->
              {#if soldOut}
                <rect
                  x="0"
                  y="0"
                  width={lc.width}
                  height={lc.height}
                  fill="rgba(0,0,0,0.12)"
                  rx="6"
                  ry="6"
                />
                <line
                  x1="0"
                  y1="0"
                  x2={lc.width}
                  y2={lc.height}
                  stroke="rgba(239,68,68,0.25)"
                  stroke-width="1"
                />
                <line
                  x1={lc.width}
                  y1="0"
                  x2="0"
                  y2={lc.height}
                  stroke="rgba(239,68,68,0.25)"
                  stroke-width="1"
                />
              {/if}
            {/if}
          </g>
        {/each}
      </svg>

      <!-- Tooltip overlay -->
      {#if tooltip.visible}
        <div
          class="pointer-events-none absolute z-50 rounded-lg bg-gray-900/90 px-3 py-1.5 text-white shadow-lg backdrop-blur-sm"
          style="left: {tooltip.x}px; top: {tooltip.y}px; transform: translate(-50%, -100%);"
        >
          <p class="text-[11px] font-semibold">{tooltip.text}</p>
        </div>
      {/if}
    </div>

    <!-- Status legend below canvas -->
    {#if !readonly}
      <div class="flex flex-wrap items-center gap-4 border-t border-border/30 px-4 py-2.5">
        <span class="text-[11px] font-bold tracking-wide text-foreground uppercase">
          Chú thích:
        </span>
        <div class="flex items-center gap-1.5">
          <div class="h-3 w-3 rounded-full" style="background-color:#16a34a; opacity:0.85;"></div>
          <span class="text-[11px] text-muted-foreground">Trống</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="h-3 w-3 rounded-full" style="background-color:#ca8a04;"></div>
          <span class="text-[11px] text-muted-foreground">Đang chọn</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="h-3 w-3 rounded-full" style="background-color:#dc2626; opacity:0.7;"></div>
          <span class="text-[11px] text-muted-foreground">Đang giữ</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="h-3 w-3 rounded-full" style="background-color:#6b7580; opacity:0.45;"></div>
          <span class="text-[11px] text-muted-foreground">Đã bán</span>
        </div>
      </div>
    {/if}

    <!-- Section color legend (readonly mode) -->
    {#if readonly && sections.length > 0}
      <div class="flex flex-wrap gap-x-3 gap-y-1 border-t border-border/30 px-3 py-2">
        {#each sections as sec (sec.id)}
          {@const color = sec.layout_config.color || '#3b82f6'}
          <span class="flex items-center gap-1.5">
            <span class="inline-block h-3 w-3 rounded-sm" style="background-color: {color};"></span>
            <span class="text-[11px] font-medium text-foreground">{sec.name}</span>
          </span>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Sidebar: section list (interactive mode only) -->
  {#if !readonly && store}
    <div class="w-full shrink-0 lg:w-64 xl:w-72">
      <div class="rounded-xl bg-surface-container p-4">
        <SectionLegend {sections} {store} />
      </div>
    </div>
  {/if}
</div>

<style>
  .seat-dot {
    transition: opacity 0.12s ease;
  }
  .seat-dot--interactive {
    cursor: pointer;
    transform-box: fill-box;
    transform-origin: center;
  }
  .seat-dot--interactive:hover {
    opacity: 1 !important;
    filter: brightness(1.2);
  }
</style>
