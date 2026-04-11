<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { resolve } from '$app/paths';
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import { toast } from '$lib/stores/toast';
  import { api } from '$lib/utils/api';
  import { getRowLabel } from '$lib/utils/seat-label';
  import { ArrowLeft, Globe, Loader } from 'lucide-svelte';
  import { SvelteMap } from 'svelte/reactivity';
  let { data } = $props();

  let publishing = $state(false);

  async function handlePublish() {
    publishing = true;
    const { error } = await api.patch(`/events/${event.id}/publish`, {});
    publishing = false;

    if (error) {
      toast.error(error);
      return;
    }

    toast.success('Sự kiện đã được xuất bản thành công!');
    await invalidateAll();
  }

  const event = $derived(data.event);
  const sections = $derived(data.sections);

  // View mode: 'overview' = combined map, null = all sections separately, number = specific section
  let viewMode = $state<'overview' | null | number>('overview');

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // Overall stats
  const totalStats = $derived.by(() => {
    let available = 0;
    let locked = 0;
    let sold = 0;
    let disabled = 0;
    let total = 0;
    for (const s of sections) {
      available += s.stats.available;
      locked += s.stats.locked;
      sold += s.stats.sold;
      disabled += s.stats.disabled;
      total += s.stats.total + s.stats.disabled;
    }
    return { available, locked, sold, disabled, total };
  });

  // Build combined grid for "Tổng quan" view using CSS Grid positioning
  // Each section reserves extra rows: 1 for section name label, 1 for column numbers, then seat rows
  type CombinedCell = { status: string; label: string; sectionName: string };

  type OverviewData = {
    cells: Map<string, CombinedCell>; // key: "gridRow,gridCol"
    totalGridRows: number;
    totalGridCols: number; // +1 for row label column
    sectionHeaders: { name: string; gridRow: number; gridColStart: number; gridColEnd: number }[];
    colHeaders: { num: number; gridRow: number; gridCol: number }[];
    rowHeaders: { coordY: number; gridRow: number }[]; // numeric grid coordinate
  };

  const overview = $derived.by((): OverviewData => {
    const cells = new SvelteMap<string, CombinedCell>();
    const sectionHeaders: OverviewData['sectionHeaders'] = [];
    const colHeaders: OverviewData['colHeaders'] = [];
    const rowHeaders: OverviewData['rowHeaders'] = [];
    let maxGridCol = 1; // col 0 is for row labels

    // Sort sections by layoutY then layoutX for deterministic ordering
    const sorted = [...sections].sort((a, b) => a.layoutY - b.layoutY || a.layoutX - b.layoutX);

    // Group sections by layoutY to find unique "bands"
    const bandMap = new SvelteMap<number, typeof sorted>();
    for (const sec of sorted) {
      const band = bandMap.get(sec.layoutY) ?? [];
      band.push(sec);
      bandMap.set(sec.layoutY, band);
    }
    const bandKeys = [...bandMap.keys()].sort((a, b) => a - b);

    let gridRow = 0;
    for (const bandY of bandKeys) {
      const bandSections = bandMap.get(bandY)!;
      const sectionLabelRow = gridRow;
      gridRow++;
      const colHeaderRow = gridRow;
      gridRow++;
      const dataStartRow = gridRow;

      // Find max rows in this band
      let maxRows = 0;
      for (const sec of bandSections) {
        if (sec.rows > maxRows) maxRows = sec.rows;

        // gridCol offset: col 0 = row labels, so section starts at layoutX + 1
        const gcStart = sec.layoutX + 1;
        const gcEnd = gcStart + sec.cols;

        // Section header
        sectionHeaders.push({
          name: sec.name,
          gridRow: sectionLabelRow,
          gridColStart: gcStart,
          gridColEnd: gcEnd,
        });

        // Column number headers (show grid X coordinate, not startColIndex)
        for (let c = 0; c < sec.cols; c++) {
          colHeaders.push({
            num: sec.layoutX + c,
            gridRow: colHeaderRow,
            gridCol: gcStart + c,
          });
        }

        // Seat cells
        for (let r = 0; r < sec.rows; r++) {
          const rowLabel = getRowLabel(sec.startRowIndex + r);
          const seatRow = dataStartRow + r;

          for (let c = 0; c < sec.cols; c++) {
            const colNum = sec.startColIndex + c;
            const seatInfo = sec.seatGrid[rowLabel]?.[colNum];
            if (seatInfo) {
              cells.set(`${seatRow},${gcStart + c}`, {
                status: seatInfo.status,
                label: seatInfo.label,
                sectionName: sec.name,
              });
            }
          }
        }

        if (gcEnd > maxGridCol) maxGridCol = gcEnd;
      }

      // Row labels — use numeric grid Y coordinate instead of letters
      for (let r = 0; r < maxRows; r++) {
        rowHeaders.push({ coordY: bandY + r, gridRow: dataStartRow + r });
      }

      gridRow += maxRows;
    }

    return {
      cells,
      totalGridRows: gridRow,
      totalGridCols: maxGridCol,
      sectionHeaders,
      colHeaders,
      rowHeaders,
    };
  });

  // Filtered sections for individual view
  const visibleSections = $derived.by(() => {
    if (viewMode === 'overview') return [];
    if (viewMode === null) return sections;
    return sections.filter((s) => s.id === viewMode);
  });

  // Stats for currently visible section
  const selectedSection = $derived(
    typeof viewMode === 'number' ? sections.find((s) => s.id === viewMode) : null,
  );

  function seatColor(status: string): string {
    switch (status) {
      case 'available':
        return 'bg-green-500 hover:bg-green-600 text-white';
      case 'locked':
        return 'bg-red-500 hover:bg-red-600 text-white';
      case 'sold':
        return 'bg-gray-800 hover:bg-gray-900 dark:bg-gray-600 dark:hover:bg-gray-500 text-white';
      case 'disabled':
        return 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600';
      default:
        return 'bg-gray-300 text-gray-500';
    }
  }

  function statusLabelVi(status: string): string {
    switch (status) {
      case 'available':
        return 'Còn trống';
      case 'locked':
        return 'Đang giữ';
      case 'sold':
        return 'Đã bán';
      case 'disabled':
        return 'Vô hiệu';
      default:
        return status;
    }
  }
</script>

<div class="space-y-6 md:space-y-8">
  <!-- Back + Header -->
  <div class="space-y-4">
    <Button variant="ghost" size="sm" href={resolve('/admin/events')}>
      <ArrowLeft class="mr-2 h-4 w-4" />
      Quay lại danh sách
    </Button>

    <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <h1 class="text-xl font-bold tracking-tight md:text-2xl">{event.title}</h1>
          {#if event.status === 'published'}
            <Badge variant="default" class="bg-green-600 hover:bg-green-700">Đã xuất bản</Badge>
          {:else}
            <Badge variant="secondary" class="bg-warning text-warning-foreground">Bản nháp</Badge>
          {/if}
        </div>
        <p class="text-sm text-muted-foreground">📍 {event.venue}</p>
        <p class="text-sm text-muted-foreground">📅 {formatDate(event.eventDate)}</p>
        {#if event.description}
          <p class="mt-2 max-w-2xl text-sm text-muted-foreground">{event.description}</p>
        {/if}
      </div>

      {#if event.status !== 'published'}
        <div class="shrink-0">
          <AlertDialog.Root>
            <AlertDialog.Trigger>
              {#snippet child({ props })}
                <Button {...props} class="gap-2 " disabled={publishing}>
                  {#if publishing}
                    <Loader class="h-4 w-4 animate-spin" />
                  {:else}
                    <Globe class="h-4 w-4" />
                  {/if}
                  Xuất bản sự kiện
                </Button>
              {/snippet}
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Header>
                <AlertDialog.Title>Xuất bản sự kiện?</AlertDialog.Title>
                <AlertDialog.Description>
                  Sau khi xuất bản, sự kiện sẽ hiển thị công khai và khách hàng có thể đặt vé. Bạn
                  sẽ không thể thay đổi sơ đồ ghế nữa.
                </AlertDialog.Description>
              </AlertDialog.Header>
              <AlertDialog.Footer>
                <AlertDialog.Cancel>Huỷ bỏ</AlertDialog.Cancel>
                <AlertDialog.Action onclick={handlePublish}>Xuất bản</AlertDialog.Action>
              </AlertDialog.Footer>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </div>
      {/if}
    </div>
  </div>

  <!-- Overall stats — Bento grid -->
  <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
    <!-- Hero tile: Tổng ghế — spans 2 cols on all, + 2 rows on md -->
    <div
      class="relative col-span-2 overflow-hidden rounded-3xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md md:row-span-2 md:p-8"
    >
      <!-- Decorative blobs -->
      <div class="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-blue-500/8 blur-md"></div>
      <div class="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-blue-400/6 blur-lg"></div>

      <div class="relative flex h-full flex-col justify-between">
        <div>
          <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1">
            <div class="h-2 w-2 rounded-full bg-blue-500"></div>
            <span
              class="text-xs font-semibold tracking-wide text-blue-600 uppercase dark:text-blue-400"
            >
              Tổng ghế
            </span>
          </div>
          <p
            class="text-5xl font-extrabold tracking-tighter text-blue-600 md:text-6xl dark:text-blue-400"
          >
            {totalStats.total.toLocaleString('vi-VN')}
          </p>
        </div>
        <p class="mt-4 text-sm text-muted-foreground">
          {totalStats.available} trống · {totalStats.locked} giữ · {totalStats.sold} bán · {totalStats.disabled}
          vô hiệu
        </p>
      </div>
    </div>

    <!-- Available -->
    <div
      class="relative overflow-hidden rounded-3xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div class="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-green-500/10 blur-sm"></div>
      <div class="relative">
        <div class="mb-2 h-1.5 w-6 rounded-full bg-green-500"></div>
        <p class="text-2xl font-bold tracking-tight text-green-600">{totalStats.available}</p>
        <p class="mt-0.5 text-xs font-medium text-muted-foreground">Còn trống</p>
      </div>
    </div>

    <!-- Locked -->
    <div
      class="relative overflow-hidden rounded-3xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div class="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-red-500/10 blur-sm"></div>
      <div class="relative">
        <div class="mb-2 h-1.5 w-6 rounded-full bg-red-500"></div>
        <p class="text-2xl font-bold tracking-tight text-red-600">{totalStats.locked}</p>
        <p class="mt-0.5 text-xs font-medium text-muted-foreground">Đang giữ</p>
      </div>
    </div>

    <!-- Sold -->
    <div
      class="relative overflow-hidden rounded-3xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div class="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-gray-500/10 blur-sm"></div>
      <div class="relative">
        <div class="mb-2 h-1.5 w-6 rounded-full bg-gray-800/80 dark:bg-gray-500"></div>
        <p class="text-2xl font-bold tracking-tight text-gray-700 dark:text-gray-400">
          {totalStats.sold}
        </p>
        <p class="mt-0.5 text-xs font-medium text-muted-foreground">Đã bán</p>
      </div>
    </div>

    <!-- Disabled -->
    <div
      class="relative overflow-hidden rounded-3xl border border-dashed bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div
        class="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-gray-300/10 blur-sm dark:bg-gray-700/10"
      ></div>
      <div class="relative">
        <div class="mb-2 h-1.5 w-6 rounded-full bg-gray-300 dark:bg-gray-700"></div>
        <p class="text-2xl font-bold tracking-tight text-gray-400 dark:text-gray-600">
          {totalStats.disabled}
        </p>
        <p class="mt-0.5 text-xs font-medium text-muted-foreground">Vô hiệu</p>
      </div>
    </div>
  </div>

  <!-- Legend -->
  <div class="flex flex-wrap items-center gap-4 text-sm">
    <span class="font-medium">Chú thích:</span>
    <span class="flex items-center gap-1.5">
      <span class="inline-block h-4 w-4 rounded bg-green-500"></span>
      Còn trống
    </span>
    <span class="flex items-center gap-1.5">
      <span class="inline-block h-4 w-4 rounded bg-red-500"></span>
      Đang giữ
    </span>
    <span class="flex items-center gap-1.5">
      <span class="inline-block h-4 w-4 rounded bg-gray-800 dark:bg-gray-600"></span>
      Đã bán
    </span>
    <span class="flex items-center gap-1.5">
      <span
        class="inline-block h-4 w-4 rounded border border-dashed border-gray-400 bg-gray-200 dark:bg-gray-800"
      ></span>
      Vô hiệu
    </span>
  </div>

  <!-- View mode selector -->
  {#if sections.length > 0}
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-sm font-medium">Xem:</span>
      <Button
        size="sm"
        variant={viewMode === 'overview' ? 'default' : 'outline'}
        onclick={() => (viewMode = 'overview')}
      >
        Tổng quan
      </Button>
      <Button
        size="sm"
        variant={viewMode === null ? 'default' : 'outline'}
        onclick={() => (viewMode = null)}
      >
        Tất cả khu vực
      </Button>
      {#each sections as section (section.id)}
        <Button
          size="sm"
          variant={viewMode === section.id ? 'default' : 'outline'}
          onclick={() => (viewMode = section.id)}
        >
          {section.name}
        </Button>
      {/each}
    </div>
  {/if}

  <!-- Selected section info -->
  {#if selectedSection}
    <div class="rounded-lg border bg-muted/30 p-3 text-sm">
      <span class="font-semibold">{selectedSection.name}</span>
      <span class="ml-2 text-muted-foreground">
        — Giá: {formatPrice(selectedSection.price)}
        — {selectedSection.stats.available} còn trống, {selectedSection.stats.locked} đang giữ, {selectedSection
          .stats.sold} đã bán, {selectedSection.stats.disabled} vô hiệu (Tổng: {selectedSection
          .stats.total + selectedSection.stats.disabled})
      </span>
    </div>
  {/if}

  <!-- ═══ OVERVIEW: Combined seat map ═══ -->
  {#if viewMode === 'overview' && sections.length > 0}
    <div class="rounded-lg border bg-card p-4 shadow-sm md:p-6">
      <h2 class="mb-4 text-base font-semibold">Sơ đồ tổng quan</h2>

      <div class="overflow-x-auto">
        <div
          class="inline-grid gap-1"
          style="grid-template-columns: 2rem repeat({overview.totalGridCols -
            1}, 1.75rem); grid-template-rows: repeat({overview.totalGridRows}, auto);"
        >
          <!-- Section name headers -->
          {#each overview.sectionHeaders as sh (sh.name + sh.gridRow)}
            <div
              class="flex items-end pb-0.5 text-xs font-semibold text-primary"
              style="grid-row: {sh.gridRow + 1}; grid-column: {sh.gridColStart +
                1} / {sh.gridColEnd + 1};"
            >
              ▸ {sh.name}
            </div>
          {/each}

          <!-- Column number headers -->
          {#each overview.colHeaders as ch (`ch-${ch.gridRow}-${ch.gridCol}`)}
            <div
              class="flex h-5 items-center justify-center text-[10px] font-medium text-muted-foreground"
              style="grid-row: {ch.gridRow + 1}; grid-column: {ch.gridCol + 1};"
            >
              {ch.num}
            </div>
          {/each}

          <!-- Row labels -->
          {#each overview.rowHeaders as rh (`rh-${rh.gridRow}`)}
            <div
              class="flex h-7 items-center justify-center text-xs font-semibold text-muted-foreground"
              style="grid-row: {rh.gridRow + 1}; grid-column: 1;"
            >
              {rh.coordY}
            </div>
          {/each}

          <!-- Seat cells -->
          {#each [...overview.cells.entries()] as [key, cell] (key)}
            {@const [r, c] = key.split(',').map(Number)}
            <div style="grid-row: {r + 1}; grid-column: {c + 1};">
              <Tooltip.Root>
                <Tooltip.Trigger aria-label="{cell.label} — {statusLabelVi(cell.status)}">
                  {#if cell.status === 'disabled'}
                    <div
                      class="flex h-7 w-7 cursor-default items-center justify-center rounded border border-dashed border-gray-300 text-[9px] dark:border-gray-700 {seatColor(
                        cell.status,
                      )}"
                    >
                      ✕
                    </div>
                  {:else}
                    <div
                      class="flex h-7 w-7 cursor-default items-center justify-center rounded text-[10px] font-medium transition-colors {seatColor(
                        cell.status,
                      )}"
                    ></div>
                  {/if}
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <p class="font-medium">{cell.label}</p>
                  <p class="text-xs opacity-80">
                    {cell.sectionName} — {statusLabelVi(cell.status)}
                  </p>
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- ═══ INDIVIDUAL SECTION VIEWS ═══ -->
  {#if viewMode !== 'overview'}
    {#each visibleSections as section (section.id)}
      <div class="rounded-lg border bg-card p-4 shadow-sm md:p-6">
        <div class="mb-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-base font-semibold">
              {section.name}
              <span class="ml-2 text-sm font-normal text-muted-foreground">
                ({section.stats.total + section.stats.disabled} ghế — {section.stats.total} ghế bán được)
              </span>
            </h2>
            <p class="text-xs text-muted-foreground">
              Giá: {formatPrice(section.price)}
              — {section.stats.available} còn trống, {section.stats.locked} đang giữ, {section.stats
                .sold} đã bán, {section.stats.disabled} vô hiệu
            </p>
          </div>
        </div>

        <!-- Seat grid -->
        <div class="overflow-x-auto">
          <div class="inline-block min-w-fit">
            <!-- Column headers -->
            <div class="mb-1 flex items-center gap-1">
              <div class="w-8 shrink-0"></div>
              {#each Array.from({ length: section.cols }, (_, i) => section.startColIndex + i) as col (col)}
                <div
                  class="flex h-6 w-8 shrink-0 items-center justify-center text-xs font-medium text-muted-foreground"
                >
                  {col}
                </div>
              {/each}
            </div>

            <!-- Rows -->
            {#each Array.from({ length: section.rows }, (_, i) => i) as rowIdx (rowIdx)}
              {@const rowLabel = getRowLabel(section.startRowIndex + rowIdx)}
              <div class="mb-1 flex items-center gap-1">
                <!-- Row label -->
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center text-xs font-semibold text-muted-foreground"
                >
                  {rowLabel}
                </div>

                <!-- Seats -->
                {#each Array.from({ length: section.cols }, (_, i) => section.startColIndex + i) as col (col)}
                  {@const seatInfo = section.seatGrid[rowLabel]?.[col]}
                  {#if seatInfo}
                    <Tooltip.Root>
                      <Tooltip.Trigger
                        aria-label="{seatInfo.label} — {statusLabelVi(seatInfo.status)}"
                      >
                        {#if seatInfo.status === 'disabled'}
                          <div
                            class="flex h-8 w-8 shrink-0 cursor-default items-center justify-center rounded border border-dashed border-gray-300 dark:border-gray-700 {seatColor(
                              seatInfo.status,
                            )} text-[10px]"
                          >
                            ✕
                          </div>
                        {:else}
                          <div
                            class="flex h-8 w-8 shrink-0 cursor-default items-center justify-center rounded text-xs font-medium transition-colors {seatColor(
                              seatInfo.status,
                            )}"
                          >
                            {col}
                          </div>
                        {/if}
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        <p>{seatInfo.label} — {statusLabelVi(seatInfo.status)}</p>
                      </Tooltip.Content>
                    </Tooltip.Root>
                  {:else}
                    <!-- No seat in this position -->
                    <div class="h-8 w-8 shrink-0"></div>
                  {/if}
                {/each}
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/each}
  {/if}

  {#if sections.length === 0}
    <div class="rounded-lg border bg-card p-8 text-center md:p-12">
      <p class="text-muted-foreground">Sự kiện chưa có khu vực ghế nào.</p>
    </div>
  {/if}
</div>
