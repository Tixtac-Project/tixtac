<script lang="ts">
  let { class: cls = '' } = $props<{ class?: string }>();
</script>

<!--
  Reusable Svelte 5 Snippet for a Seat
  This creates a 2D top-down theater seat with a backrest and cushion.
-->
{#snippet seat(x: number, y: number, state: 'available' | 'selected' | 'sold')}
  {@const colors = {
    available: 'fill-emerald-100/80 stroke-emerald-400/60',
    availableBack: 'fill-emerald-400/70',
    selected: 'fill-blue-100/90 stroke-blue-500/70', // Replace 'blue' with 'primary' if configured
    selectedBack: 'fill-blue-500/80',
    sold: 'fill-slate-100 stroke-slate-300/80',
    soldBack: 'fill-slate-300',
  }[state]}

  <g transform="translate({x}, {y})">
    <!-- Seat Cushion (Base) -->
    <rect
      x="0.5"
      y="2"
      width="10"
      height="8"
      rx="2.5"
      class="{colors.split(' ')[0]} {colors.split(' ')[1]}"
      stroke-width="1.2"
    />
    <!-- Seat Backrest -->
    <rect
      x="1.5"
      y="0"
      width="8"
      height="4"
      rx="1.5"
      class={colors.split(' ')[2] ||
        {
          available: 'fill-emerald-400/70',
          selected: 'fill-blue-500/80',
          sold: 'fill-slate-300',
        }[state]}
    />
  </g>
{/snippet}

<svg
  class="h-auto w-full {cls}"
  viewBox="0 0 200 125"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  aria-labelledby="seating-chart-title seating-chart-desc"
  role="img"
>
  <!-- Accessibility tags -->
  <title id="seating-chart-title">Sơ đồ ghế ngồi</title>
  <desc id="seating-chart-desc">
    Minh họa sơ đồ ghế ngồi với các trạng thái: còn trống, đang chọn, và đã bán.
  </desc>

  <!-- Floor / Background Surface -->
  <rect
    x="8"
    y="45"
    width="184"
    height="60"
    rx="16"
    class="fill-slate-50/80 stroke-slate-200/50"
    stroke-width="1"
  />

  <!-- Stage Area -->
  <g transform="translate(0, 5)">
    <!-- Stage Curve Front -->
    <path
      d="M35 25 Q100 8 165 25"
      fill="none"
      class="stroke-emerald-400/40"
      stroke-width="3"
      stroke-linecap="round"
    />
    <!-- Stage Curve Back / Platform -->
    <path d="M40 20 Q100 0 160 20 L155 12 Q100 -5 45 12 Z" class="fill-emerald-500/10" />

    <rect
      x="65"
      y="4"
      width="70"
      height="14"
      rx="7"
      class="fill-emerald-500/15 stroke-emerald-500/20"
      stroke-width="1"
    />
    <text
      x="100"
      y="14"
      text-anchor="middle"
      class="fill-emerald-700/80"
      font-size="7"
      font-weight="800"
      letter-spacing="1.5"
    >
      SÂN KHẤU
    </text>
  </g>

  <!-- Row A (9 seats) -->
  {#each Array.from({ length: 9 }, (_, i) => i) as i (i)}
    {@const x = 38 + i * 14}
    <!-- Curve logic: edges push down relative to the center -->
    {@const y = 42 + Math.abs(i - 4) * 1.5}
    {@render seat(x, y, i === 4 ? 'selected' : 'available')}
  {/each}

  <!-- Row B (10 seats) -->
  {#each Array.from(Array(10).keys()) as i (i)}
    {@const x = 31 + i * 14}
    {@const y = 55 + Math.abs(i - 4.5) * 1.5}
    {@render seat(x, y, i === 3 || i === 7 ? 'selected' : 'available')}
  {/each}

  <!-- Row C (10 seats) -->
  {#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as i (i)}
    {@const x = 31 + i * 14}
    {@const y = 68 + Math.abs(i - 4.5) * 1.5}
    {@render seat(x, y, 'available')}
  {/each}

  <!-- Row D (9 seats) -->
  {#each Array.from({ length: 9 }, (_, i) => i) as i (i)}
    {@const x = 38 + i * 14}
    {@const y = 81 + Math.abs(i - 4) * 1.5}
    {@render seat(x, y, i === 2 || i === 6 ? 'sold' : 'available')}
  {/each}

  <!-- Row labels (Aligned to the center Y-axis of each curved row) -->
  <g class="fill-slate-400" font-size="7" font-weight="700" text-anchor="middle">
    <text x="18" y="52">A</text>
    <text x="18" y="65">B</text>
    <text x="18" y="78">C</text>
    <text x="18" y="91">D</text>
  </g>

  <!-- Legend Section -->
  <line
    x1="20"
    y1="108"
    x2="180"
    y2="108"
    class="stroke-slate-200"
    stroke-width="1"
    stroke-dasharray="2 4"
  />

  <g transform="translate(0, 112)">
    <!-- Còn trống -->
    {@render seat(35, 0, 'available')}
    <text x="50" y="8" class="fill-slate-500" font-size="6" font-weight="500">Còn trống</text>

    <!-- Đang chọn -->
    {@render seat(85, 0, 'selected')}
    <text x="100" y="8" class="fill-slate-500" font-size="6" font-weight="500">Đang chọn</text>

    <!-- Đã bán -->
    {@render seat(135, 0, 'sold')}
    <text x="150" y="8" class="fill-slate-500" font-size="6" font-weight="500">Đã bán</text>
  </g>
</svg>
