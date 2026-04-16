<!--
  SeatmapPreview.svelte
  Pure SVG read-only seatmap previewer for event detail pages.
  Renders stage elements and seat sections from map_config, stage_layout,
  and section layout_config/seat_config data.
  Works on both admin and customer detail pages.
-->
<script lang="ts" module>
  /** Normalized section shape accepted by the preview component */
  export type PreviewSection = {
    id: number;
    name: string;
    type: 'assigned' | 'general' | string;
    price: number;
    capacity: number;
    layout_config: {
      x: number;
      y: number;
      width: number;
      height: number;
      rotation?: number;
      color?: string;
    };
    seat_config: {
      rows: number;
      cols: number;
      prefix: string | null;
      rowFormat?: 'alphabetic' | 'numeric';
      colDirection?: 'ltr' | 'rtl';
      startRowIndex?: number;
      startColIndex?: number;
    } | null;
    available_count: number;
    total_count: number;
    disabled_count: number;
  };

  /** Helper to convert admin page section format to PreviewSection */
  export function fromAdminSection(sec: {
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
    stats: { available: number; total: number; disabled: number };
  }): PreviewSection {
    return {
      id: sec.id,
      name: sec.name,
      type: sec.type,
      price: sec.price,
      capacity: sec.capacity,
      layout_config: sec.layoutConfig,
      seat_config: sec.seatConfig,
      available_count: sec.stats.available,
      total_count: sec.stats.total,
      disabled_count: sec.stats.disabled,
    };
  }

  /** Helper to convert customer EventDetailSection to PreviewSection */
  export function fromEventDetailSection(sec: {
    id: number;
    name: string;
    type: 'assigned' | 'general';
    price: number;
    capacity: number;
    layout_config: unknown;
    seat_config: unknown;
    available_count: number;
    seat_count: number;
    disabled_count: number;
  }): PreviewSection {
    const lc = sec.layout_config as PreviewSection['layout_config'] | null;
    const sc = sec.seat_config as PreviewSection['seat_config'] | null;
    const total = sec.type === 'general' ? sec.capacity : sec.seat_count - sec.disabled_count;
    const available = sec.type === 'general' ? sec.capacity : sec.available_count;
    return {
      id: sec.id,
      name: sec.name,
      type: sec.type,
      price: sec.price,
      capacity: sec.capacity,
      layout_config: lc ?? { x: 0, y: 0, width: 100, height: 100 },
      seat_config: sc,
      available_count: available,
      total_count: total,
      disabled_count: sec.disabled_count,
    };
  }
</script>

<script lang="ts">
  import { formatPrice } from '$lib/utils/price';

  // ── Props ──
  type StageLayoutItem = {
    id: string;
    type: string;
    label: string;
    x: number;
    y: number;
    w?: number;
    h?: number;
    width?: number;
    height?: number;
    rotation?: number;
    radius?: number;
    points?: { x: number; y: number }[];
  };

  type MapConfig = {
    width: number;
    height: number;
    gridSize?: number;
    snapToGrid?: boolean;
  };

  let {
    mapConfig,
    stageLayout = [],
    sections = [],
    showAvailability = true,
    interactive = true,
  }: {
    mapConfig: MapConfig | null | undefined;
    stageLayout: StageLayoutItem[] | unknown[] | null | undefined;
    sections: PreviewSection[];
    showAvailability?: boolean;
    interactive?: boolean;
  } = $props();

  // ── Defaults ──
  const config = $derived(mapConfig ?? { width: 1200, height: 800 });
  const stageItems = $derived((stageLayout ?? []) as StageLayoutItem[]);

  // ── Zoom / Pan state ──
  let containerEl = $state<HTMLDivElement>();
  let zoom = $state(1);
  let panX = $state(0);
  let panY = $state(0);
  let isPanning = $state(false);
  let panStartX = $state(0);
  let panStartY = $state(0);

  // ── Tooltip ──
  let tooltip = $state<{
    visible: boolean;
    x: number;
    y: number;
    text: string;
    subtext: string;
  }>({ visible: false, x: 0, y: 0, text: '', subtext: '' });

  // ── Container sizing ──
  let containerWidth = $state(800);
  let containerHeight = $state(500);

  $effect(() => {
    if (!containerEl) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      containerWidth = entry.contentRect.width;
      containerHeight = entry.contentRect.height;
    });
    ro.observe(containerEl);
    return () => ro.disconnect();
  });

  // ── Hovered section ──
  let hoveredSectionId = $state<number | null>(null);

  // ── Section colors (matching admin builder) ──
  const SECTION_COLORS = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#ef4444',
    '#06b6d4',
    '#ec4899',
    '#84cc16',
  ];

  function getSectionColor(section: PreviewSection, index: number): string {
    return section.layout_config?.color || SECTION_COLORS[index % SECTION_COLORS.length];
  }

  // ── Stage element rendering helpers ──
  function stageElFill(type: string): string {
    switch (type) {
      case 'stage':
        return '#a78bfa';
      case 'obstacle':
        return '#9ca3af';
      case 'entrance':
        return '#86efac';
      case 'rect':
        return '#a78bfa';
      default:
        return '#d1d5db';
    }
  }

  function stageElStroke(type: string): string {
    switch (type) {
      case 'stage':
        return '#7c3aed';
      case 'obstacle':
        return '#6b7280';
      case 'entrance':
        return '#22c55e';
      case 'rect':
        return '#7c3aed';
      default:
        return '#9ca3af';
    }
  }

  function getStageElDimensions(el: StageLayoutItem): { w: number; h: number } {
    return {
      w: el.w ?? el.width ?? 100,
      h: el.h ?? el.height ?? 60,
    };
  }

  // ── Seat dot builder ──
  type SeatDot = {
    key: string;
    cx: number;
    cy: number;
    radius: number;
    fill: string;
    opacity: number;
  };

  function buildSeatDots(section: PreviewSection, index: number): SeatDot[] {
    const lc = section.layout_config;
    const sc = section.seat_config;
    if (!lc || !sc || sc.rows <= 0 || sc.cols <= 0) return [];
    if (section.type === 'general') return [];

    const color = lc.color || SECTION_COLORS[index % SECTION_COLORS.length];
    const cellW = lc.width / sc.cols;
    const cellH = lc.height / sc.rows;
    const dotRadius = Math.min(cellW, cellH) * 0.35;

    const dots: SeatDot[] = [];
    for (let r = 0; r < sc.rows; r++) {
      for (let c = 0; c < sc.cols; c++) {
        dots.push({
          key: `${index}-${r}-${c}`,
          cx: cellW * c + cellW / 2,
          cy: cellH * r + cellH / 2,
          radius: dotRadius,
          fill: color,
          opacity: 0.7,
        });
      }
    }
    return dots;
  }

  // ── Mouse handlers ──
  function handleWheel(e: WheelEvent) {
    if (!interactive) return;
    e.preventDefault();
    const direction = e.deltaY > 0 ? -1 : 1;
    const factor = 1.1;
    const newZoom = direction > 0 ? zoom * factor : zoom / factor;
    zoom = Math.max(0.3, Math.min(5, newZoom));
  }

  function handleMouseDown(e: MouseEvent) {
    if (!interactive) return;
    isPanning = true;
    panStartX = e.clientX - panX;
    panStartY = e.clientY - panY;
  }

  function handleMouseMove(e: MouseEvent) {
    if (isPanning) {
      panX = e.clientX - panStartX;
      panY = e.clientY - panStartY;
    }
  }

  function handleMouseUp() {
    isPanning = false;
  }

  function handleSectionHover(section: PreviewSection, e: MouseEvent) {
    if (!interactive) return;
    hoveredSectionId = section.id;
    const rect = containerEl?.getBoundingClientRect();
    if (!rect) return;
    tooltip = {
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 10,
      text: `${section.name} — ${formatPrice(section.price)}`,
      subtext: showAvailability
        ? `${section.available_count}/${section.total_count} ${section.type === 'general' ? 'vé' : 'ghế'} còn trống`
        : `${section.total_count} ${section.type === 'general' ? 'vé' : 'ghế'}`,
    };
  }

  function handleSectionLeave() {
    hoveredSectionId = null;
    tooltip.visible = false;
  }

  function handleZoomIn() {
    zoom = Math.min(5, zoom * 1.3);
  }

  function handleZoomOut() {
    zoom = Math.max(0.3, zoom / 1.3);
  }

  function handleReset() {
    zoom = 1;
    panX = 0;
    panY = 0;
  }

  // ── Text contrast ──
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
</script>

<div
  bind:this={containerEl}
  class="relative overflow-hidden rounded-xl border border-border/50 bg-muted/10"
  style="min-height: 300px; max-height: 600px; aspect-ratio: {config.width}/{config.height};"
  role="img"
  aria-label="Sơ đồ chỗ ngồi"
>
  <!-- SVG Canvas -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 {config.width} {config.height}"
    preserveAspectRatio="xMidYMid meet"
    class="cursor-grab select-none active:cursor-grabbing"
    style="transform: scale({zoom}) translate({panX / zoom}px, {panY /
      zoom}px); transform-origin: center center;"
    onwheel={handleWheel}
    onmousedown={handleMouseDown}
    onmousemove={handleMouseMove}
    onmouseup={handleMouseUp}
    onmouseleave={handleMouseUp}
  >
    <!-- Background -->
    <rect
      x="0"
      y="0"
      width={config.width}
      height={config.height}
      fill="#fafafa"
      stroke="#e5e7eb"
      stroke-width="1"
    />

    <!-- Stage elements -->
    {#each stageItems as el (el.id)}
      {@const dim = getStageElDimensions(el)}
      {@const rot = el.rotation ?? 0}
      <g transform="translate({el.x}, {el.y}) rotate({rot}, {dim.w / 2}, {dim.h / 2})">
        {#if el.type === 'circle' && el.radius}
          <circle
            cx={el.radius}
            cy={el.radius}
            r={el.radius}
            fill={stageElFill(el.type)}
            stroke={stageElStroke(el.type)}
            stroke-width="1.5"
            opacity="0.9"
          />
          <text
            x={el.radius}
            y={el.radius}
            text-anchor="middle"
            dominant-baseline="central"
            fill="white"
            font-size="12"
            font-weight="bold"
          >
            {el.label}
          </text>
        {:else if el.type === 'polygon' && el.points}
          <polygon
            points={el.points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill={stageElFill(el.type)}
            stroke={stageElStroke(el.type)}
            stroke-width="1.5"
            opacity="0.9"
          />
          <text
            x={dim.w / 2}
            y={dim.h / 2}
            text-anchor="middle"
            dominant-baseline="central"
            fill="white"
            font-size="12"
            font-weight="bold"
          >
            {el.label}
          </text>
        {:else}
          <!-- rect / stage / obstacle / entrance -->
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
        {/if}
      </g>
    {/each}

    <!-- Seat sections -->
    {#each sections as section, idx (section.id)}
      {@const lc = section.layout_config}
      {@const sc = section.seat_config}
      {@const color = getSectionColor(section, idx)}
      {@const isHovered = hoveredSectionId === section.id}
      {@const soldOut = section.available_count === 0 && showAvailability}

      {#if lc}
        <g
          transform="translate({lc.x}, {lc.y}){lc.rotation
            ? ` rotate(${lc.rotation}, ${lc.width / 2}, ${lc.height / 2})`
            : ''}"
          class="cursor-pointer"
          onmouseenter={(e) => handleSectionHover(section, e)}
          onmousemove={(e) => handleSectionHover(section, e)}
          onmouseleave={handleSectionLeave}
          role="button"
          tabindex="0"
          aria-label="{section.name}: {section.available_count}/{section.total_count} còn trống"
        >
          <!-- Section background -->
          <rect
            x="0"
            y="0"
            width={lc.width}
            height={lc.height}
            fill={hexToRgba(color, isHovered ? 0.45 : 0.3)}
            stroke={isHovered ? color : hexToRgba(color, 0.6)}
            stroke-width={isHovered ? 2.5 : 1}
            rx="6"
            ry="6"
            class="transition-all duration-150"
          />

          {#if zoom >= 1.8 && section.type === 'assigned' && sc && sc.rows > 0 && sc.cols > 0}
            <!-- LOD: Individual seat dots when zoomed in -->
            {#each buildSeatDots(section, idx) as dot (dot.key)}
              <circle
                cx={dot.cx}
                cy={dot.cy}
                r={dot.radius}
                fill={dot.fill}
                opacity={dot.opacity}
                stroke="white"
                stroke-width="0.5"
              />
            {/each}
          {:else}
            <!-- LOD: Section label when zoomed out -->
            <text
              x={lc.width / 2}
              y={lc.height / 2 - (showAvailability ? 8 : 0)}
              text-anchor="middle"
              dominant-baseline="central"
              fill={getContrastColor(color)}
              font-size={Math.min(14, lc.width / 7)}
              font-weight="bold"
            >
              {section.name}
            </text>
            {#if showAvailability}
              <text
                x={lc.width / 2}
                y={lc.height / 2 + 10}
                text-anchor="middle"
                dominant-baseline="central"
                fill={getContrastColor(color)}
                font-size={Math.min(11, lc.width / 9)}
                opacity="0.8"
              >
                {#if soldOut}
                  Hết vé
                {:else}
                  {section.available_count}/{section.total_count} trống
                {/if}
              </text>
            {/if}

            <!-- Price tag -->
            <text
              x={lc.width / 2}
              y={lc.height / 2 + (showAvailability ? 24 : 14)}
              text-anchor="middle"
              dominant-baseline="central"
              fill={getContrastColor(color)}
              font-size={Math.min(10, lc.width / 10)}
              opacity="0.7"
            >
              {formatPrice(section.price)}
            </text>
          {/if}

          <!-- Sold out overlay -->
          {#if soldOut}
            <rect
              x="0"
              y="0"
              width={lc.width}
              height={lc.height}
              fill="rgba(0,0,0,0.15)"
              rx="6"
              ry="6"
            />
            <line
              x1="0"
              y1="0"
              x2={lc.width}
              y2={lc.height}
              stroke="rgba(239,68,68,0.3)"
              stroke-width="1"
            />
            <line
              x1={lc.width}
              y1="0"
              x2="0"
              y2={lc.height}
              stroke="rgba(239,68,68,0.3)"
              stroke-width="1"
            />
          {/if}
        </g>
      {/if}
    {/each}
  </svg>

  <!-- Tooltip overlay -->
  {#if tooltip.visible}
    <div
      class="pointer-events-none absolute z-50 rounded-lg bg-gray-900/90 px-3 py-2 text-white shadow-lg backdrop-blur-sm"
      style="left: {tooltip.x}px; top: {tooltip.y}px; transform: translate(-50%, -100%);"
    >
      <p class="text-xs font-semibold">{tooltip.text}</p>
      <p class="text-[11px] opacity-80">{tooltip.subtext}</p>
    </div>
  {/if}

  <!-- Zoom controls -->
  {#if interactive}
    <div
      class="absolute right-3 bottom-3 flex items-center gap-1 rounded-lg border border-border/30 bg-background/80 p-1 shadow-md backdrop-blur-sm"
    >
      <button
        onclick={handleZoomOut}
        class="flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold text-foreground transition-colors hover:bg-muted"
        aria-label="Thu nhỏ"
      >
        −
      </button>
      <button
        onclick={handleReset}
        class="flex h-7 items-center justify-center rounded-md px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted"
        aria-label="Đặt lại zoom"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        onclick={handleZoomIn}
        class="flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold text-foreground transition-colors hover:bg-muted"
        aria-label="Phóng to"
      >
        +
      </button>
    </div>
  {/if}

  <!-- Legend -->
  {#if sections.length > 0}
    <div
      class="absolute bottom-3 left-3 flex max-w-[60%] flex-wrap gap-x-3 gap-y-1 rounded-lg border border-border/30 bg-background/80 px-3 py-2 shadow-md backdrop-blur-sm"
    >
      {#each sections as section, idx (section.id)}
        {@const color = getSectionColor(section, idx)}
        <span class="flex items-center gap-1.5">
          <span class="inline-block h-3 w-3 rounded-sm" style="background-color: {color};"></span>
          <span class="text-[11px] font-medium text-foreground">{section.name}</span>
        </span>
      {/each}
    </div>
  {/if}
</div>
