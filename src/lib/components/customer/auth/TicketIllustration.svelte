<script lang="ts">
  let { class: cls = '' } = $props<{ class?: string }>();
  const uid = crypto.randomUUID().slice(0, 8);
  const titleId = `ticket-title-${uid}`;
  const descId = `ticket-desc-${uid}`;
</script>

<!--
  Reusable Ticket Shape Snippet
  Drawn as a single continuous path so the side notches are actual transparent cutouts!
-->
{#snippet ticketOutline(className: string)}
  <path
    d="M34 10 H158 A16 16 0 0 1 174 26 V42 A9 9 0 0 0 174 60 V76 A16 16 0 0 1 158 92 H34 A16 16 0 0 1 18 76 V60 A9 9 0 0 0 18 42 V26 A16 16 0 0 1 34 10 Z"
    class={className}
  />
{/snippet}

<svg
  class="h-auto w-full {cls}"
  viewBox="0 0 200 110"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  aria-labelledby="{titleId} {descId}"
  role="img"
>
  <title id={titleId}>Vé điện tử</title>
  <desc id={descId}>Minh họa vé điện tử với thông tin chỗ ngồi, mã QR và chi tiết sự kiện.</desc>

  <!-- Realistic Soft Shadows (Stacked Effect) -->
  <g transform="rotate(-3, 96, 51) translate(-1, 4)">
    {@render ticketOutline('fill-black/5')}
  </g>
  <g transform="rotate(-1, 96, 51) translate(-0.5, 2)">
    {@render ticketOutline('fill-black/5')}
  </g>

  <!-- Main Ticket Body -->
  {@render ticketOutline('fill-white stroke-slate-200 stroke-[1.5]')}

  <!-- Vertical perforated tear line -->
  <path
    d="M56 16 V86"
    class="stroke-slate-200"
    stroke-width="1.5"
    stroke-dasharray="4 5"
    stroke-linecap="round"
  />

  <!-- ==========================================
       LEFT SECTION: SEAT INFO
       ========================================== -->

  <!-- 2D Seat Icon (Matches seating chart style) -->
  <g transform="translate(33, 24)">
    <rect
      x="0"
      y="4"
      width="14"
      height="10"
      rx="3"
      class="fill-blue-50 stroke-blue-200"
      stroke-width="1.5"
    />
    <rect x="2" y="0" width="10" height="6" rx="2" class="fill-blue-500" />
  </g>

  <!-- Seat Number -->
  <text
    x="39"
    y="58"
    text-anchor="middle"
    class="fill-slate-800"
    font-size="15"
    font-weight="700"
    letter-spacing="-0.5"
  >
    B4
  </text>

  <!-- ==========================================
       RIGHT SECTION: EVENT DETAILS
       ========================================== -->

  <!-- Event Info Skeletons -->
  <!-- Event Title -->
  <rect x="70" y="24" width="50" height="7" rx="3.5" class="fill-slate-800" />
  <!-- Date / Time -->
  <rect x="70" y="36" width="38" height="4" rx="2" class="fill-slate-400" />
  <!-- Location / Venue -->
  <rect x="70" y="44" width="46" height="4" rx="2" class="fill-slate-300" />
  <rect x="70" y="52" width="32" height="4" rx="2" class="fill-slate-200" />

  <!-- VIP Badge -->
  <rect x="70" y="66" width="22" height="10" rx="3" class="fill-amber-100" />
  <text
    x="81"
    y="73.5"
    text-anchor="middle"
    class="fill-amber-600"
    font-size="5"
    font-weight="800"
    letter-spacing="0.5"
  >
    VIP
  </text>

  <!-- Abstract Barcode -->
  <path
    d="M100 66 v10 m3 -10 v10 m2 -10 v10 m4 -10 v10 m3 -10 v10 m2 -10 v10 m5 -10 v10 m2 -10 v10"
    class="stroke-slate-300"
    stroke-width="1.2"
    stroke-linecap="round"
  />

  <!-- QR Code Section -->
  <rect
    x="134"
    y="24"
    width="28"
    height="28"
    rx="4"
    class="fill-white stroke-slate-200"
    stroke-width="1.5"
  />

  <!-- QR Corner Finder Patterns -->
  <g class="fill-none stroke-slate-400" stroke-width="1.5">
    <!-- Top Left -->
    <rect x="137" y="27" width="7" height="7" rx="1.5" />
    <rect x="139" y="29" width="3" height="3" rx="0.5" class="fill-slate-400 stroke-none" />
    <!-- Top Right -->
    <rect x="151" y="27" width="7" height="7" rx="1.5" />
    <rect x="153" y="29" width="3" height="3" rx="0.5" class="fill-slate-400 stroke-none" />
    <!-- Bottom Left -->
    <rect x="137" y="41" width="7" height="7" rx="1.5" />
    <rect x="139" y="43" width="3" height="3" rx="0.5" class="fill-slate-400 stroke-none" />
  </g>

  <!-- QR Inner Abstract Blocks -->
  <rect x="146" y="36" width="4" height="4" rx="1" class="fill-slate-300" />
  <rect x="151" y="41" width="7" height="3" rx="1" class="fill-slate-300" />
  <rect x="155" y="45" width="3" height="3" rx="1" class="fill-slate-300" />
  <rect x="146" y="42" width="3" height="6" rx="1" class="fill-slate-300" />
</svg>
