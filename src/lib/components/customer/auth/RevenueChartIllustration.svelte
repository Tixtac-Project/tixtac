<script lang="ts">
  let { class: cls = '' } = $props<{ class?: string }>();

  // 1. Define the data points (Y is inverted in SVG, so lower Y = higher revenue)
  const points = $state([
    { x: 26, y: 70, label: 'T2' },
    { x: 56, y: 55, label: 'T3' },
    { x: 86, y: 62, label: 'T4' },
    { x: 116, y: 35, label: 'T5' },
    { x: 146, y: 15, label: 'T6', isPeak: true, value: '₫65.2M' },
    { x: 176, y: 28, label: 'T7' },
  ]);

  // 2. Define Y-axis grid levels
  const yAxis = [
    { y: 80, label: '0' },
    { y: 60, label: '20' },
    { y: 40, label: '40' },
    { y: 20, label: '60' },
  ];

  // 3. Auto-calculate perfectly smooth cubic bezier paths
  const linePath = $derived.by(() => {
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      // Control points to create smooth horizontal curves
      const cp1x = prev.x + 15;
      const cp2x = curr.x - 15;
      path += ` C ${cp1x} ${prev.y}, ${cp2x} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return path;
  });

  // 4. Create the filled area path by extending the line down to the baseline
  const baseline = 80;
  const areaPath = $derived(
    `${linePath} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`,
  );
</script>

<svg
  class="h-auto w-full {cls}"
  viewBox="0 0 190 100"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  aria-labelledby="chart-title chart-desc"
  role="img"
>
  <title id="chart-title">Biểu đồ doanh thu</title>
  <desc id="chart-desc">Biểu đồ đường hiển thị xu hướng doanh thu từ Thứ 2 đến Thứ 7.</desc>

  <defs>
    <!-- Modern Gradient for the area under the curve -->
    <linearGradient id="revenue-gradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="currentColor" class="text-blue-500" stop-opacity="0.25" />
      <stop offset="100%" stop-color="currentColor" class="text-blue-500" stop-opacity="0" />
    </linearGradient>
  </defs>

  <!-- Y-Axis Lines & Labels -->
  {#each yAxis as { y, label } (label)}
    <!-- Grid line -->
    <line
      x1="26"
      y1={y}
      x2="180"
      y2={y}
      class={y === baseline ? 'stroke-slate-300' : 'stroke-slate-200/60'}
      stroke-width="0.75"
      stroke-dasharray={y === baseline ? 'none' : '3 3'}
    />
    <!-- Label -->
    <text x="18" y={y + 2} text-anchor="end" class="fill-slate-400" font-size="5" font-weight="600">
      {label}
    </text>
  {/each}

  <!-- Filled Area Under Curve -->
  <path d={areaPath} fill="url(#revenue-gradient)" />

  <!-- Smooth Trend Line -->
  <path
    d={linePath}
    class="stroke-blue-500"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    fill="none"
  />

  <!-- X-Axis Labels & Data Points -->
  {#each points as pt (pt.label)}
    <!-- X-Axis Label -->
    <text
      x={pt.x}
      y="92"
      text-anchor="middle"
      class="fill-slate-400"
      font-size="6"
      font-weight="600"
    >
      {pt.label}
    </text>

    <!-- Peak Highlights -->
    {#if pt.isPeak}
      <!-- Vertical Drop Line to Baseline -->
      <line
        x1={pt.x}
        y1={pt.y}
        x2={pt.x}
        y2={baseline}
        class="stroke-blue-400/50"
        stroke-width="1"
        stroke-dasharray="2 2"
      />

      <!-- Glowing Halo behind peak dot -->
      <circle cx={pt.x} cy={pt.y} r="7" class="fill-blue-500/20" />

      <!-- Peak Value Tooltip -->
      <rect x={pt.x - 16} y={pt.y - 13} width="32" height="10" rx="3" class="fill-slate-800" />
      <text
        x={pt.x}
        y={pt.y - 6.5}
        text-anchor="middle"
        class="fill-white"
        font-size="5"
        font-weight="700"
        letter-spacing="0.5"
      >
        {pt.value}
      </text>
    {/if}

    <!-- Standard Data Point Dot -->
    <circle
      cx={pt.x}
      cy={pt.y}
      r={pt.isPeak ? 3.5 : 2.5}
      class="fill-white stroke-blue-500"
      stroke-width={pt.isPeak ? 2 : 1.5}
    />
  {/each}
</svg>
