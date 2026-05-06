<script lang="ts">
  import AgeChart from '$lib/components/admin/statistic/AgeChart.svelte';
  import GenderChart from '$lib/components/admin/statistic/GenderChart.svelte';
  import SalesVelocityChart from '$lib/components/admin/statistic/SalesVelocityChart.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Select from '$lib/components/ui/select';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import type { DemographicsStats, OverviewStats, SalesVelocityPoint } from '$lib/types/stats';
  import {
    ChartColumn,
    DollarSign,
    Percent,
    RotateCcw,
    Ticket,
    TrendingUp,
    Users,
  } from 'lucide-svelte';

  type EventOption = { id: number; title: string };

  // ═══════════════════════════════════════════════════
  // FILTER STATE
  // ═══════════════════════════════════════════════════
  let events = $state<EventOption[]>([]);
  let selectedEventId = $state<string>(''); // '' = all events
  let startDate = $state('');
  let endDate = $state('');
  let eventsLoading = $state(true);

  // ═══════════════════════════════════════════════════
  // STATS STATE
  // ═══════════════════════════════════════════════════
  let overview = $state<OverviewStats | null>(null);
  let velocity = $state<SalesVelocityPoint[]>([]);
  let demographics = $state<DemographicsStats | null>(null);
  let statsLoading = $state(false);
  let statsError = $state<string | null>(null);

  // ═══════════════════════════════════════════════════
  // INITIALIZATION══════
  // ═════════════════════════════════════════════
  function setDefaultDates() {
    const now = new Date();
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const thirtyDaysAgo = new Date(now.getTime());
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    startDate = thirtyDaysAgo.toISOString().slice(0, 10);
    endDate = now.toISOString().slice(0, 10);
  }

  $effect(() => {
    setDefaultDates();
    loadEvents();
  });

  async function loadEvents() {
    eventsLoading = true;
    try {
      const res = await fetch('/api/events?limit=100');
      if (!res.ok) throw new Error('Failed to fetch events');
      const json = await res.json();
      const raw = json.data?.events ?? [];
      events = raw.map((e: { id: number; title: string }) => ({
        id: e.id,
        title: e.title,
      }));
      // Leave selectedEventId as '' (all events) by default
    } catch {
      events = [];
    } finally {
      eventsLoading = false;
    }
  }

  // STATS FETCHING (reacts to filter changes)
  $effect(() => {
    if (startDate && endDate) {
      loadStats(selectedEventId ? Number(selectedEventId) : null, startDate, endDate);
    }
  });

  async function loadStats(eventId: number | null, sd: string, ed: string) {
    statsLoading = true;
    statsError = null;

    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const params = new URLSearchParams({
      startDate: new Date(sd).toISOString(),
      endDate: new Date(ed + 'T23:59:59.999').toISOString(),
    });
    if (eventId !== null) {
      params.set('eventId', String(eventId));
    }

    try {
      const [ovRes, velRes, demoRes] = await Promise.all([
        fetch(`/api/stats/overview?${params}`),
        fetch(`/api/stats/sales-velocity?${params}&interval=day`),
        fetch(`/api/stats/demographics?${params}`),
      ]);

      const [ovJson, velJson, demoJson] = await Promise.all([
        ovRes.json(),
        velRes.json(),
        demoRes.json(),
      ]);

      if (ovJson.error) throw new Error(ovJson.error.message);
      if (velJson.error) throw new Error(velJson.error.message);
      if (demoJson.error) throw new Error(demoJson.error.message);

      overview = ovJson.data;
      velocity = velJson.data;
      demographics = demoJson.data;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Không thể tải dữ liệu thống kê';
      statsError = msg;
      overview = null;
      velocity = [];
      demographics = null;
    } finally {
      statsLoading = false;
    }
  }

  // FORMATTING HELPERS
  function formatVND(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatNumber(n: number): string {
    return new Intl.NumberFormat('vi-VN').format(n);
  }

  function formatPercent(rate: number): string {
    return (rate * 100).toFixed(1) + '%';
  }
</script>

<div class="space-y-4 md:space-y-6">
  <!-- PAGE HEADER -->
  <div class="flex flex-col gap-0.5">
    <h1 class="text-xl font-bold tracking-tight md:text-2xl">Tổng quan</h1>
    <p class="text-sm text-muted-foreground">Theo dõi hiệu suất bán vé và xu hướng khách hàng</p>
  </div>

  <!-- FILTERS BAR -->
<div class="rounded-xl bg-surface-container-lowest p-3 md:p-5">
  <div class="flex flex-col gap-2.5">
    <!-- Event Select -->
    <div class="flex flex-col gap-1.5">
      <Label class="text-xs font-medium">Sự kiện</Label>
      {#if eventsLoading}
        <Skeleton class="h-10 w-full rounded-lg" />
      {:else if events.length === 0}
        <p class="py-2 text-sm text-muted-foreground">Không có sự kiện nào</p>
      {:else}
        <Select.Root type="single" bind:value={selectedEventId}>
          <Select.Trigger class="w-full overflow-hidden">
            <span class="block truncate">
              {selectedEventId
                ? (events.find((e) => String(e.id) === selectedEventId)?.title ?? 'Chọn sự kiện...')
                : 'Tất cả sự kiện'}
            </span>
          </Select.Trigger>
          <Select.Content class="max-w-[calc(100vw-2rem)]">
            <Select.Group>
              <Select.Label>Sự kiện</Select.Label>
              <Select.Item value="" label="Tất cả sự kiện">Tất cả sự kiện</Select.Item>
              {#each events as event (event.id)}
                <Select.Item value={String(event.id)} label={event.title}>
                  <span class="truncate">{event.title}</span>
                </Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      {/if}
    </div>

    <!-- Mobile: dates stacked 2-col, reset full-width below -->
    <!-- Desktop (md+): all three in one row -->
    <div class="flex flex-col gap-2 md:flex-row md:items-end">
      <div class="grid grid-cols-2 gap-2 md:contents">
        <div class="flex flex-col gap-1.5">
          <Label for="stats-start-date" class="text-xs font-medium">Từ ngày</Label>
          <Input id="stats-start-date" type="date" bind:value={startDate} class="w-full" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="stats-end-date" class="text-xs font-medium">Đến ngày</Label>
          <Input id="stats-end-date" type="date" bind:value={endDate} class="w-full" />
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        class="w-full gap-2 md:w-auto md:shrink-0"
        onclick={setDefaultDates}
      >
        <RotateCcw class="size-3.5" />
        Đặt lại ngày theo mặc định
      </Button>
    </div>
  </div>
</div>

  <!-- OVERVIEW CARDS -->
  <div class="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
    <!-- Revenue -->
    <div class="arch-card arch-enter flex items-start gap-3">
      <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cta-muted">
        <DollarSign class="size-5 text-cta-muted-foreground" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-sm text-muted-foreground">Tổng doanh thu</p>
        {#if statsLoading}
          <Skeleton class="mt-1.5 h-7 w-36 rounded-md" />
          <Skeleton class="mt-1 h-3.5 w-24 rounded-md" />
        {:else if overview}
          <p class="mt-0.5 truncate text-2xl font-bold tracking-tight tabular-nums">
            {formatVND(overview.totalRevenue)}
          </p>
          <p class="mt-0.5 text-xs text-muted-foreground">
            {formatNumber(overview.paidOrders)} đơn thành công
          </p>
        {:else}
          <p class="mt-1 text-xl font-medium text-muted-foreground">—</p>
        {/if}
      </div>
    </div>

    <!-- Tickets -->
    <div class="arch-card arch-enter flex items-start gap-3">
      <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-info-muted">
        <Ticket class="size-5 text-info-muted-foreground" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-sm text-muted-foreground">Tổng vé bán</p>
        {#if statsLoading}
          <Skeleton class="mt-1.5 h-7 w-24 rounded-md" />
          <Skeleton class="mt-1 h-3.5 w-20 rounded-md" />
        {:else if overview}
          <p class="mt-0.5 text-2xl font-bold tracking-tight tabular-nums">
            {formatNumber(overview.totalTicketsSold)}
          </p>
          <p class="mt-0.5 text-xs text-muted-foreground">vé đã thanh toán</p>
        {:else}
          <p class="mt-1 text-xl font-medium text-muted-foreground">—</p>
        {/if}
      </div>
    </div>

    <!-- Drop-off Rate -->
    <div class="arch-card arch-enter flex items-start gap-3">
      <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning-muted">
        <Percent class="size-5 text-warning-muted-foreground" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1.5">
          <p class="text-sm text-muted-foreground">Tỉ lệ rớt giỏ hàng</p>
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger
                class="inline-flex size-4 cursor-help items-center justify-center rounded-full bg-muted text-[10px] leading-none text-muted-foreground"
              >
                ?
              </Tooltip.Trigger>
              <Tooltip.Content>Tỉ lệ đơn hàng bị hủy do hết hạn thanh toán</Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
        {#if statsLoading}
          <Skeleton class="mt-1.5 h-7 w-20 rounded-md" />
          <Skeleton class="mt-1 h-3.5 w-28 rounded-md" />
        {:else if overview}
          <p class="mt-0.5 text-2xl font-bold tracking-tight tabular-nums">
            {formatPercent(overview.dropOffRate)}
          </p>
          <p class="mt-0.5 text-xs text-muted-foreground">
            {overview.cancelledOrders} huỷ / {overview.paidOrders + overview.cancelledOrders} tổng
          </p>
        {:else}
          <p class="mt-1 text-xl font-medium text-muted-foreground">—</p>
        {/if}
      </div>
    </div>
  </div>

  <!-- CHARTS -->
  {#if statsError}
    <div
      class="flex flex-col items-center justify-center gap-3 rounded-xl bg-surface-container-lowest p-12 text-center"
    >
      <div class="flex size-12 items-center justify-center rounded-full bg-danger-muted">
        <ChartColumn class="size-6 text-danger-muted-foreground" />
      </div>
      <p class="text-sm font-medium text-muted-foreground">{statsError}</p>
    </div>
  {:else if !statsLoading && !overview && velocity.length === 0 && !demographics}
    <div
      class="flex flex-col items-center justify-center gap-3 rounded-xl bg-surface-container-lowest p-12 text-center"
    >
      <div class="flex size-12 items-center justify-center rounded-full bg-muted">
        <TrendingUp class="size-6 text-muted-foreground" />
      </div>
      <p class="text-sm font-medium">Chưa có dữ liệu giao dịch</p>
      <p class="text-xs text-muted-foreground">
        Hệ thống chưa ghi nhận đơn hàng nào trong khoảng thời gian này
      </p>
    </div>
  {:else}
    <!-- Sales Velocity -->
    <div class="rounded-xl bg-surface-container-lowest p-3 md:p-6">
      <div class="mb-3 flex items-center gap-2.5">
        <div class="flex size-7 items-center justify-center rounded-lg bg-primary-light">
          <TrendingUp class="size-3.5 text-primary" />
        </div>
        <h2 class="text-sm font-semibold md:text-base">Tốc độ bán vé</h2>
      </div>
      {#if statsLoading}
        <Skeleton class="h-[300px] w-full rounded-lg" />
      {:else}
        <SalesVelocityChart data={velocity} loading={false} />
      {/if}
    </div>

    <!-- Demographics -->
    <div class="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-5">
      <div class="rounded-xl bg-surface-container-lowest p-3 md:p-6">
        <div class="mb-3 flex items-center gap-2.5">
          <div class="flex size-7 items-center justify-center rounded-lg bg-info-muted">
            <Users class="size-3.5 text-info-muted-foreground" />
          </div>
          <h2 class="text-sm font-semibold md:text-base">Giới tính</h2>
        </div>
        {#if statsLoading}
          <Skeleton class="h-[280px] w-full rounded-lg" />
        {:else}
          <GenderChart data={demographics} loading={false} />
        {/if}
      </div>

      <!-- Age Bar Chart card -->
      <div class="flex flex-col rounded-xl bg-surface-container-lowest p-3 md:p-6">
        <div class="mb-3 flex items-center gap-2.5">
          <div class="flex size-7 items-center justify-center rounded-lg bg-purple-muted">
            <ChartColumn class="size-3.5 text-purple-muted-foreground" />
          </div>
          <h2 class="text-sm font-semibold md:text-base">Độ tuổi</h2>
        </div>

        <!-- flex-1 + flex centering fills the remaining card height -->
        <div class="flex flex-1 items-center">
          {#if statsLoading}
            <Skeleton class="h-[220px] w-full rounded-lg" />
          {:else}
            <AgeChart data={demographics} loading={false} />
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>
