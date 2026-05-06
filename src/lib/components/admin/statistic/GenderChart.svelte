<script lang="ts">
  import type { DemographicsStats } from '$lib/types/stats';
  import { PieChart, Text, Tooltip } from 'layerchart';

  let {
    data = null as DemographicsStats | null,
    loading = false,
  }: { data: DemographicsStats | null; loading: boolean } = $props();

  const GENDER_LABELS: Record<string, string> = {
    male: 'Nam',
    female: 'Nữ',
    other: 'Khác',
  };

  const GENDER_COLORS: Record<string, string> = {
    male: 'var(--color-info)',
    female: 'var(--color-purple)',
    other: 'var(--color-neutral)',
  };

  const chartData = $derived(
    data
      ? Object.entries(data.gender)
          .filter(([, count]) => count > 0)
          .map(([key, count]) => ({
            key,
            label: GENDER_LABELS[key] ?? key,
            value: count,
            color: GENDER_COLORS[key] ?? 'var(--color-primary)',
          }))
      : [],
  );

  const cRange = $derived(chartData.map((d) => d.color));

  const total = $derived(data?.total ?? 0);

  // Container-aware breakpoint — not viewport-aware
  let containerWidth = $state(0);
  const isMobile = $derived(containerWidth > 0 && containerWidth < 400);
</script>

{#if loading}
  <div class="flex h-[250px] items-center justify-center">
    <div class="text-sm text-muted-foreground">Đang tải...</div>
  </div>
{:else if chartData.length === 0}
  <div class="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
    Chưa có dữ liệu
  </div>
{:else}
  <div class="w-full" bind:clientWidth={containerWidth}>
    <PieChart
      data={chartData}
      key="key"
      value="value"
      {cRange}
      innerRadius={-36}
      cornerRadius={3}
      padAngle={0.02}
      height={isMobile ? 200 : 240}
      padding={isMobile
        ? { top: 12, bottom: 12, left: 12, right: 12 }
        : { top: 28, bottom: 28, left: 90, right: 90 }}
      labels={isMobile
        ? false
        : {
            placement: 'callout',
            value: 'label',
            calloutLineLength: 14,
            calloutLabelOffset: 10,
            calloutPadding: 3,
            class: 'text-xs fill-foreground',
            line: { class: 'stroke-border' },
          }}
    >
      {#snippet aboveMarks()}
        <Text
          value={String(total)}
          textAnchor="middle"
          verticalAnchor="middle"
          class="fill-foreground text-lg font-semibold tabular-nums"
          dy={-8}
        />
        <Text
          value="người"
          textAnchor="middle"
          verticalAnchor="middle"
          class="fill-muted-foreground text-xs"
          dy={10}
        />
      {/snippet}

      {#snippet tooltip()}
        <Tooltip.Root>
          {#snippet children({ data: d })}
            <Tooltip.Header value={d?.label ?? ''} />
            <Tooltip.List>
              <Tooltip.Item label="Số lượng" value={d?.value ?? 0} />
              <Tooltip.Item
                label="Tỉ lệ"
                value={total > 0 ? (d?.value ?? 0) / total : 0}
                format={(v: number) => (v * 100).toFixed(1) + '%'}
              />
            </Tooltip.List>
          {/snippet}
        </Tooltip.Root>
      {/snippet}
    </PieChart>

    <!-- Mobile-only bottom legend -->
    {#if isMobile}
      <div class="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 px-2 pb-1">
        {#each chartData as item, i (item.key)}
          <div class="flex items-center gap-1.5">
            <span
              class="size-2 shrink-0 rounded-full"
              style="background-color: {item.color}"
            ></span>
            <span class="text-xs text-muted-foreground">{item.label}</span>
            <span class="text-xs font-semibold tabular-nums">{item.value}</span>
            <span class="text-xs text-muted-foreground">
              ({total > 0 ? ((item.value / total) * 100).toFixed(1) + '%' : '0%'})
            </span>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Desktop side legend with totals row -->
    {#if !isMobile && total > 0}
      <div class="mt-1 flex flex-col gap-1.5 px-1">
        {#each chartData as item, i (item.key)}
          <div class="flex items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-2">
              <span
                class="size-2.5 shrink-0 rounded-full"
                style="background-color: {item.color}"
              ></span>
              <span class="truncate text-sm font-medium">{item.label}</span>
            </div>
            <div class="flex shrink-0 items-center gap-2 text-sm tabular-nums">
              <span class="font-semibold">{item.value}</span>
              <span class="w-14 text-right text-muted-foreground">
                ({((item.value / total) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        {/each}
        <div class="mt-1 flex justify-between border-t border-border pt-2 text-sm">
          <span class="font-medium text-muted-foreground">Tổng</span>
          <span class="font-semibold tabular-nums">{total}</span>
        </div>
      </div>
    {/if}
  </div>
{/if}
