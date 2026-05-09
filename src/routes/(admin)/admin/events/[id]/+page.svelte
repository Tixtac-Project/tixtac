<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { resolve } from '$app/paths';
  import MarkdownViewer from '$lib/components/admin/event/MarkdownViewer.svelte';
  import SectionDetail from '$lib/components/admin/event/SectionDetail.svelte';
  import SeatMap from '$lib/components/seat-map/SeatMap.svelte';
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import { toast } from '$lib/stores/toast';
  import { api } from '$lib/utils/api';
  import { formatDate, formatTime } from '$lib/utils/datetime';
  import { formatPrice } from '$lib/utils/price';
  import {
    ArrowLeft,
    Calendar,
    Clock,
    Globe,
    ListOrdered,
    Loader,
    Map,
    Pencil,
    ShieldAlert,
    Ticket,
    Users,
  } from 'lucide-svelte';

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
  const shows = $derived(data.shows);

  // ── Publish requirements ──
  const publishRequirements = $derived.by(() => {
    const issues: string[] = [];
    if (shows.length === 0) {
      issues.push('Chưa có suất diễn nào');
    }
    const hasAnySeats = shows.some(
      (s) =>
        s.stats.available > 0 ||
        s.sections.some((sec) => sec.type === 'general' && sec.capacity > 0),
    );
    if (shows.length > 0 && !hasAnySeats) {
      issues.push('Chưa có ghế/vé nào khả dụng');
    }
    return issues;
  });
  const canPublish = $derived(publishRequirements.length === 0);

  // Currently selected show index (null = overview across all shows)
  let selectedShowIndex = $state<number>(0);
  const selectedShow = $derived(
    selectedShowIndex >= 0 && selectedShowIndex < shows.length ? shows[selectedShowIndex] : null,
  );

  // Detect whether an interactive seatmap was actually configured.
  // If all sections sit at default position (0,0) with default size (100×100)
  // and there's no stage layout, the admin skipped the map builder.
  const hasInteractiveMap = $derived.by(() => {
    if (!event.mapConfig) return false;
    const hasStage = Array.isArray(event.stageLayout) && event.stageLayout.length > 0;
    if (hasStage) return true;

    // Check if any section has non-default layout (i.e. was placed on the canvas)
    for (const show of shows) {
      for (const sec of show.sections) {
        const lc = sec.layout_config;
        if (!lc) continue;
        const isDefault =
          lc.x === 0 &&
          lc.y === 0 &&
          lc.width === 100 &&
          lc.height === 100 &&
          (lc.rotation ?? 0) === 0;
        if (!isDefault) return true;
      }
    }
    return false;
  });

  // View mode within a show: 'seatmap' = visual map, null = all sections, number = specific section
  let viewMode = $state<'seatmap' | null | number>('seatmap');

  // Reset view mode when switching shows; fall back to 'all sections' if no interactive map
  $effect(() => {
    // Reference selectedShowIndex to trigger
    void selectedShowIndex;
    viewMode = hasInteractiveMap ? 'seatmap' : null;
  });

  // Overall stats across ALL shows
  const totalStats = $derived.by(() => {
    let available = 0;
    let locked = 0;
    let sold = 0;
    let disabled = 0;
    let total = 0;
    for (const show of shows) {
      available += show.stats.available;
      locked += show.stats.locked;
      sold += show.stats.sold;
      disabled += show.stats.disabled;
      total += show.stats.total;
    }
    return { available, locked, sold, disabled, total };
  });

  // Stats for currently selected show
  const showStats = $derived(
    selectedShow?.stats ?? { available: 0, locked: 0, sold: 0, disabled: 0, total: 0 },
  );
  const sections = $derived(selectedShow?.sections ?? []);

  // Filtered sections for individual view
  const visibleSections = $derived.by(() => {
    if (viewMode === 'seatmap') return [];
    if (viewMode === null) return sections;
    return sections.filter((s) => s.id === viewMode);
  });

  const selectedSection = $derived(
    typeof viewMode === 'number' ? sections.find((s) => s.id === viewMode) : null,
  );

  function showStatusBadge(status: string): { label: string; class: string } {
    switch (status) {
      case 'published':
        return { label: 'Đã xuất bản', class: 'bg-green-600 hover:bg-green-700' };
      case 'completed':
        return { label: 'Đã kết thúc', class: 'bg-gray-600 hover:bg-gray-700' };
      case 'cancelled':
        return { label: 'Đã hủy', class: 'bg-red-600 hover:bg-red-700' };
      default:
        return { label: 'Bản nháp', class: 'bg-warning text-warning-foreground' };
    }
  }
</script>

<div class="space-y-6">
  <!-- Back + Header -->
  <div class="space-y-4">
    <Button variant="ghost" size="sm" href={resolve('/admin/events')} class="gap-2">
      <ArrowLeft class="h-4 w-4" />
      Quay lại danh sách
    </Button>

    <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <h1 class="text-xl font-bold tracking-tight md:text-2xl">{event.title}</h1>
          <Badge variant="default" class={showStatusBadge(event.status).class}>
            {showStatusBadge(event.status).label}
          </Badge>
        </div>
        <p class="text-sm text-muted-foreground">📍 {event.venue}</p>
        {#if event.minAge > 0}
          <p class="text-sm text-muted-foreground">
            <ShieldAlert class="mr-1 inline h-3.5 w-3.5" />
            Từ {event.minAge} tuổi trở lên
          </p>
        {/if}
        {#if event.maxTicketsPerUser > 0}
          <p class="text-sm text-muted-foreground">
            <Ticket class="mr-1 inline h-3.5 w-3.5" />
            Tối đa {event.maxTicketsPerUser} vé/tài khoản
          </p>
        {/if}
        {#if event.description}
          <div class="mt-2 max-w-2xl text-sm text-muted-foreground">
            <MarkdownViewer content={event.description} />
          </div>
        {/if}
        {#if event.termsAndConditions}
          <details class="mt-3 max-w-2xl">
            <summary
              class="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              📜 Điều khoản & Điều kiện
            </summary>
            <div
              class="mt-2 rounded-xl border border-border/50 bg-muted/20 p-4 text-sm text-muted-foreground"
            >
              <MarkdownViewer content={event.termsAndConditions} />
            </div>
          </details>
        {/if}
      </div>

      {#if event.status === 'draft'}
        <div class="flex shrink-0 gap-2">
          <Button
            variant="outline"
            class="gap-2 border-2 border-warning text-warning hover:bg-warning/10 hover:text-warning"
            href={resolve(`/admin/events/create?event=${event.id}`)}
          >
            <Pencil class="h-4 w-4" />
            Chỉnh sửa
          </Button>
          {#if canPublish}
            <AlertDialog.Root>
              <AlertDialog.Trigger>
                {#snippet child({ props })}
                  <Button {...props} class="gap-2" disabled={publishing}>
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
          {:else}
            <Tooltip.Root>
              <Tooltip.Trigger>
                {#snippet child({ props })}
                  <span {...props} class="inline-flex">
                    <Button class="gap-2" disabled>
                      <Globe class="h-4 w-4" />
                      Xuất bản sự kiện
                    </Button>
                  </span>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content side="bottom" class="max-w-xs">
                <p class="mb-1 text-xs font-semibold">Chưa thể xuất bản:</p>
                <ul class="list-inside list-disc space-y-0.5 text-xs">
                  {#each publishRequirements as issue, i (`publish-issue-${i}`)}
                    <li>{issue}</li>
                  {/each}
                </ul>
              </Tooltip.Content>
            </Tooltip.Root>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Overall stats across all shows — Bento grid -->
  <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
    <!-- Hero tile: Tổng ghế — spans 2 cols on all, + 2 rows on md -->
    <div
      class="relative col-span-2 overflow-hidden rounded-3xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md md:row-span-2 md:p-8"
    >
      <div class="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-blue-500/8 blur-md"></div>
      <div class="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-blue-400/6 blur-lg"></div>

      <div class="relative flex h-full flex-col justify-between">
        <div>
          <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1">
            <div class="h-2 w-2 rounded-full bg-blue-500"></div>
            <span
              class="text-xs font-semibold tracking-wide text-blue-600 uppercase dark:text-blue-400"
            >
              Tổng ghế ({shows.length} suất)
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

  <!-- ═══ SHOW SELECTOR TABS ═══ -->
  {#if shows.length > 0}
    <div class="bento-card">
      <div class="mb-3 flex items-center gap-2">
        <Calendar class="h-4 w-4 text-info" />
        <span class="text-sm font-semibold text-foreground">Suất diễn ({shows.length})</span>
      </div>

      <div class="flex flex-wrap gap-2">
        {#each shows as show, i (show.id)}
          {@const isActive = selectedShowIndex === i}
          <button
            type="button"
            class="flex flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition-all
              {isActive
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-border/50 bg-background hover:border-primary/30 hover:bg-muted/30'}"
            onclick={() => (selectedShowIndex = i)}
          >
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold {isActive ? 'text-primary' : 'text-foreground'}">
                {show.title || `Suất #${i + 1}`}
              </span>
            </div>
            <div class="flex items-center gap-3 text-xs text-muted-foreground">
              <span class="flex items-center gap-1">
                <Calendar class="h-3 w-3" />
                {formatDate(show.showDate)}
              </span>
              <span class="flex items-center gap-1">
                <Clock class="h-3 w-3" />
                {formatTime(show.startTime)}
                {#if show.endTime}
                  – {formatTime(show.endTime)}
                {/if}
              </span>
            </div>
            <div class="text-xs text-muted-foreground">
              <Users class="mr-1 inline h-3 w-3" />
              {show.stats.available}/{show.stats.total} trống
            </div>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- ═══ SELECTED SHOW DETAIL ═══ -->
  {#if selectedShow}
    <!-- Show info card -->
    <div class="bento-card space-y-4">
      <div class="flex items-start justify-between">
        <div>
          <h2 class="text-lg font-bold text-foreground">
            {selectedShow.title || `Suất #${selectedShowIndex + 1}`}
          </h2>
          <div class="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <span class="flex items-center gap-1.5">
              <Calendar class="h-3.5 w-3.5" />
              {formatDate(selectedShow.showDate)}
            </span>
            <span class="flex items-center gap-1.5">
              <Clock class="h-3.5 w-3.5" />
              {formatTime(selectedShow.startTime)}
              {#if selectedShow.endTime}
                – {formatTime(selectedShow.endTime)}
              {/if}
            </span>
          </div>
        </div>

        <Badge variant="default" class={showStatusBadge(selectedShow.status).class}>
          {showStatusBadge(selectedShow.status).label}
        </Badge>
      </div>

      <!-- Show-level stats row -->
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div class="rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
          <p class="text-lg font-bold text-green-600">{showStats.available}</p>
          <p class="text-[11px] text-muted-foreground">Còn trống</p>
        </div>
        <div class="rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
          <p class="text-lg font-bold text-red-600">{showStats.locked}</p>
          <p class="text-[11px] text-muted-foreground">Đang giữ</p>
        </div>
        <div class="rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
          <p class="text-lg font-bold text-gray-700 dark:text-gray-400">{showStats.sold}</p>
          <p class="text-[11px] text-muted-foreground">Đã bán</p>
        </div>
        <div class="rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
          <p class="text-lg font-bold text-gray-400 dark:text-gray-600">{showStats.disabled}</p>
          <p class="text-[11px] text-muted-foreground">Vô hiệu</p>
        </div>
      </div>

      <!-- Itinerary -->
      {#if selectedShow.itinerary && selectedShow.itinerary.length > 0}
        <div class="rounded-2xl border border-border/50 bg-muted/20 p-4">
          <div class="mb-2 flex items-center gap-2">
            <ListOrdered class="h-4 w-4 text-purple-500" />
            <span class="text-sm font-semibold text-foreground">Lịch trình</span>
          </div>
          <div class="space-y-1.5">
            {#each selectedShow.itinerary as item, i (i)}
              <div class="flex items-start gap-3 text-sm">
                <span class="shrink-0 font-mono text-xs font-semibold text-primary">
                  {item.time}
                </span>
                <div>
                  <span class="font-medium text-foreground">{item.activity}</span>
                  {#if item.description}
                    <span class="text-muted-foreground">— {item.description}</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
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
        {#if hasInteractiveMap}
          <Button
            size="sm"
            variant={viewMode === 'seatmap' ? 'default' : 'outline'}
            onclick={() => (viewMode = 'seatmap')}
            class="gap-1.5"
          >
            <Map class="h-3.5 w-3.5" />
            Sơ đồ
          </Button>
        {/if}
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
          — Giá: {formatPrice(Number(selectedSection.price))}
          — {selectedSection.stats.available} còn trống, {selectedSection.stats.locked} đang giữ, {selectedSection
            .stats.sold} đã bán, {selectedSection.stats.disabled} vô hiệu (Tổng: {selectedSection
            .stats.total + selectedSection.stats.disabled})
        </span>
      </div>
    {/if}

    <!-- ═══ SEATMAP: Visual SVG preview ═══ -->
    {#if viewMode === 'seatmap' && sections.length > 0}
      {#if event.mapConfig}
        <div class="bento-card space-y-3">
          <h2 class="text-base font-semibold">Sơ đồ chỗ ngồi</h2>
          <SeatMap
            mapConfig={event.mapConfig}
            stageLayout={Array.isArray(event.stageLayout) ? event.stageLayout : []}
            {sections}
            readonly={true}
            showAvailability={true}
          />
        </div>
      {:else}
        <div class="rounded-lg border bg-card p-8 text-center md:p-12">
          <p class="text-muted-foreground">
            Chưa có cấu hình sơ đồ. Vui lòng chỉnh sửa sự kiện để thiết lập sơ đồ chỗ ngồi.
          </p>
        </div>
      {/if}
    {/if}

    <!-- ═══ INDIVIDUAL SECTION VIEWS ═══ -->
    {#if viewMode !== 'seatmap'}
      {#each visibleSections as section (section.id)}
        <SectionDetail {section} />
      {/each}
    {/if}

    {#if sections.length === 0}
      <div class="rounded-lg border bg-card p-8 text-center md:p-12">
        <p class="text-muted-foreground">Suất diễn này chưa có khu vực ghế nào.</p>
      </div>
    {/if}
  {/if}

  {#if shows.length === 0}
    <div class="rounded-lg border bg-card p-8 text-center md:p-12">
      <p class="text-muted-foreground">Sự kiện chưa có suất diễn nào.</p>
    </div>
  {/if}
</div>
