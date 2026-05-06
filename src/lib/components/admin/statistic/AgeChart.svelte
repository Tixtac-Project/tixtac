<script lang="ts">
  import type { DemographicsStats } from '$lib/types/stats';
  import { scaleBand } from 'd3-scale';
  import { Axis, Bars, Chart, Highlight, Labels, Layer, Tooltip } from 'layerchart';

  let {
    data = null as DemographicsStats | null,
    loading = false,
  }: { data: DemographicsStats | null; loading: boolean } = $props();

  const chartData = $derived(
    data
      ? Object.entries(data.ageGroups)
          .filter(([, count]) => count > 0)
          .map(([key, count]) => ({ key, count }))
      : [],
  );

  const total = $derived(data?.total ?? 0);

  function pct(v: number): string {
    return total > 0 ? ((v / total) * 100).toFixed(1) + '%' : '0%';
  }

  const BAR_HEIGHT = 36;
  const BAR_PADDING = 0.35;

  const chartHeight = $derived(
    Math.max(80, Math.ceil((BAR_HEIGHT + BAR_HEIGHT * BAR_PADDING) * chartData.length + 20)),
  );

  // Container width drives adaptive padding
  let containerWidth = $state(0);

  const leftPad = $derived(
    chartData.length > 0
      ? Math.max(32, Math.max(...chartData.map((d) => d.key.length)) * 7 + 8)
      : 32,
  );

  // On narrow containers, drop the outside label — show count only inside or skip
  const isNarrow = $derived(containerWidth > 0 && containerWidth < 360);

  // Right pad: enough for "999  99.9%" (~88px) on wide, minimal on narrow
  const rightPad = $derived(isNarrow ? 8 : 96);
</script>

{#if loading}
  <div class="flex h-[200px] items-center justify-center">
    <div class="text-sm text-muted-foreground">Đang tải...</div>
  </div>
{:else if chartData.length === 0}
  <div class="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
    Chưa có dữ liệu
  </div>
{:else}
  <div bind:clientWidth={containerWidth} class="flex w-full items-center justify-center">
    <Chart
      data={chartData}
      x="count"
      xDomain={[0, null]}
      xNice
      y="key"
      yScale={scaleBand().padding(BAR_PADDING)}
      padding={{ left: leftPad, right: rightPad, top: 8, bottom: 8 }}
      height={chartHeight}
      tooltipContext={{ mode: 'band' }}
      class="group"
    >
      <Layer>
        <Axis placement="left" rule tickLength={0} />
        <Axis
          placement="top"
          grid
          ticks={isNarrow ? 3 : 4}
          tickLength={0}
          format={(v) => (total > 0 ? Math.round((v / total) * 100) + '%' : '0%')}
          classes={{ tickLabel: 'text-xs fill-muted-foreground' }}
        />

        <Bars
          rx={3}
          style="fill: var(--color-primary)"
          class="opacity-85 transition-opacity group-hover:opacity-40"
        />

        <Highlight area bar={{ rx: 3, style: 'fill: var(--color-primary)', class: 'opacity-85' }} />

        {#if !isNarrow}
          <!-- Outside labels only when there's room -->
          <Labels
            format={(d) => {
              const count = (d as { count: number }).count;
              return count != null ? `${count}  ${pct(count)}` : '';
            }}
            placement="outside"
            offset={10}
            class="fill-muted-foreground text-xs tabular-nums"
          />
        {:else}
          <!-- On narrow: count inside the bar end -->
          <Labels
            format={(d) => {
              const count = (d as { count: number }).count;
              return count != null ? String(count) : '';
            }}
            placement="inside"
            offset={6}
            class="text-xs tabular-nums"
            style="fill: var(--color-primary-foreground)"
          />
        {/if}
      </Layer>

      <Tooltip.Root>
        {#snippet children({ data: d })}
          <Tooltip.Header value={d?.key ?? ''} />
          <Tooltip.List>
            <Tooltip.Item label="Số lượng" value={d?.count ?? 0} />
            <Tooltip.Item
              label="Tỉ lệ"
              value={total > 0 ? (d?.count ?? 0) / total : 0}
              format={(v: number) => (v * 100).toFixed(1) + '%'}
            />
          </Tooltip.List>
        {/snippet}
      </Tooltip.Root>
    </Chart>
  </div>
{/if}
