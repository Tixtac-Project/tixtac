<script lang="ts">
  import type { SeatLayoutConfig } from '$lib/types/seat-map';
  import { formatPrice } from '$lib/utils/price';

  interface StageElement {
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
  }

  interface MapConfig {
    width: number;
    height: number;
  }

  interface PreviewSection {
    id: number;
    name: string;
    type: 'assigned' | 'general';
    price: number;
    available_count: number;
    capacity: number;
    layout_config: SeatLayoutConfig;
  }

  interface Props {
    mapConfig: MapConfig;
    stageLayout: StageElement[];
    sections: PreviewSection[];
  }

  let { mapConfig, stageLayout, sections }: Props = $props();

  function getStageFill(type: string): string {
    switch (type) {
      case 'stage':
        return '#e2e8f0';
      case 'obstacle':
        return '#cbd5e1';
      case 'entrance':
        return '#bbf7d0';
      default:
        return '#e5e7eb';
    }
  }

  function getStageStroke(type: string): string {
    switch (type) {
      case 'stage':
        return '#94a3b8';
      case 'obstacle':
        return '#94a3b8';
      case 'entrance':
        return '#4ade80';
      default:
        return '#cbd5e1';
    }
  }

  function hexToRgba(hex: string, alpha: number): string {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
      return `rgba(128, 128, 128, ${alpha})`;
    }
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return `rgba(128, 128, 128, ${alpha})`;
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function getContrastColor(hex: string): string {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
      return '#1f2937';
    }
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return '#1f2937';
    }
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.55 ? '#1f2937' : '#ffffff';
  }

  function getElDim(el: StageElement): { w: number; h: number } {
    return { w: el.w ?? el.width ?? 100, h: el.h ?? el.height ?? 60 };
  }

  // Adaptive text sizing
  function fitFontSize(text: string, maxW: number, maxH: number, maxFs: number): number {
    const charW = 0.55;
    const byWidth = maxW / (text.length * charW || 1);
    const byHeight = maxH;
    return Math.max(7, Math.min(maxFs, byWidth, byHeight));
  }
</script>

<div class="overflow-hidden rounded-xl border border-border/40 bg-surface-container-lowest">
  <!-- Header -->
  <div class="flex items-center justify-between border-b border-border/30 px-4 py-3">
    <span class="text-xs font-bold tracking-widest text-muted-foreground uppercase">
      Sơ đồ chỗ ngồi
    </span>
    <span class="text-[10px] font-medium text-muted-foreground">
      Xem trước &bull; {sections.length} khu vực
    </span>
  </div>

  <!-- SVG -->
  <div class="p-3">
    <svg
      width="100%"
      viewBox="0 0 {mapConfig.width} {mapConfig.height}"
      preserveAspectRatio="xMidYMid meet"
      class="h-auto w-full"
    >
      <!-- Background -->
      <rect
        x="0"
        y="0"
        width={mapConfig.width}
        height={mapConfig.height}
        fill="#f8f9fb"
        stroke="#e5e7eb"
        stroke-width="1"
        rx="4"
        ry="4"
      />

      <!-- Stage elements -->
      {#each stageLayout as el (el.id)}
        {@const dim = getElDim(el)}
        {@const rot = el.rotation ?? 0}
        <g transform="translate({el.x}, {el.y}) rotate({rot}, {dim.w / 2}, {dim.h / 2})">
          <rect
            x="0"
            y="0"
            width={dim.w}
            height={dim.h}
            fill={getStageFill(el.type)}
            stroke={getStageStroke(el.type)}
            stroke-width="1.5"
            rx={el.type === 'stage' ? 6 : 3}
            opacity="0.85"
          />
          <text
            x={dim.w / 2}
            y={dim.h / 2}
            text-anchor="middle"
            dominant-baseline="central"
            fill="#64748b"
            font-size={Math.min(12, dim.w / 6)}
            font-weight="600"
          >
            {el.label}
          </text>
        </g>
      {/each}

      <!-- Area-only sections -->
      {#each sections as sec (sec.id)}
        {@const lc = sec.layout_config}
        {@const color = lc.color || '#3b82f6'}
        {@const avail = sec.available_count}
        {@const total = sec.capacity}
        {@const soldOut = avail === 0 || total === 0}
        {@const pad = 8}
        {@const innerW = lc.width - pad * 2}
        {@const innerH = lc.height - pad * 2}

        <g
          transform="translate({lc.x}, {lc.y}){lc.rotation
            ? ` rotate(${lc.rotation}, ${lc.width / 2}, ${lc.height / 2})`
            : ''}"
        >
          <!-- Section rectangle -->
          <rect
            x="0"
            y="0"
            width={lc.width}
            height={lc.height}
            fill={hexToRgba(color, soldOut ? 0.08 : 0.18)}
            stroke={hexToRgba(color, soldOut ? 0.2 : 0.45)}
            stroke-width="1.5"
            rx="4"
            ry="4"
            class="transition-colors duration-200"
          />

          <!-- Section name -->
          <text
            x={lc.width / 2}
            y={lc.height / 2 - 4}
            text-anchor="middle"
            dominant-baseline="middle"
            fill={soldOut ? '#94a3b8' : getContrastColor(color)}
            font-size={fitFontSize(sec.name, innerW, innerH * 0.35, 13)}
            font-weight="700"
            opacity={soldOut ? 0.5 : 0.9}
          >
            {sec.name}
          </text>

          <!-- Type + Price -->
          <text
            x={lc.width / 2}
            y={lc.height / 2 + 10}
            text-anchor="middle"
            dominant-baseline="middle"
            fill={soldOut ? '#94a3b8' : getContrastColor(color)}
            font-size={fitFontSize(formatPrice(sec.price), innerW, innerH * 0.3, 11)}
            opacity={soldOut ? 0.4 : 0.7}
          >
            {formatPrice(sec.price)}
          </text>

          <!-- Availability bar at bottom -->
          {#if !soldOut}
            {@const ratio = Math.max(0, Math.min(1, avail / total))}
            <rect
              x={pad}
              y={lc.height - pad - 3}
              width={innerW}
              height="3"
              fill="rgba(0,0,0,0.08)"
              rx="1.5"
            />
            <rect
              x={pad}
              y={lc.height - pad - 3}
              width={innerW * ratio}
              height="3"
              fill={hexToRgba(color, 0.55)}
              rx="1.5"
            />
          {/if}

          <!-- Sold-out diagonal cross -->
          {#if soldOut}
            <line
              x1={pad}
              y1={pad}
              x2={lc.width - pad}
              y2={lc.height - pad}
              stroke="rgba(148,163,184,0.3)"
              stroke-width="1"
            />
            <line
              x1={lc.width - pad}
              y1={pad}
              x2={pad}
              y2={lc.height - pad}
              stroke="rgba(148,163,184,0.3)"
              stroke-width="1"
            />
          {/if}
        </g>
      {/each}
    </svg>
  </div>

  <!-- Legend -->
  <div class="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border/30 px-4 py-2.5">
    {#each sections as sec (sec.id)}
      {@const color = sec.layout_config.color || '#3b82f6'}
      <span class="inline-flex items-center gap-1.5 text-[11px] text-foreground">
        <span
          class="inline-block size-2.5 flex-shrink-0 rounded-sm"
          style="background-color: {color};"
        ></span>
        <span class="font-medium">{sec.name}</span>
        <span class="text-muted-foreground">&bull; {formatPrice(Number(sec.price))}</span>
      </span>
    {/each}
  </div>
</div>
