<script lang="ts">
  import type { SalesVelocityPoint } from '$lib/types/stats';
  import { formatPeriodFull, formatPeriodShort } from '$lib/utils/datetime';
  import { formatFullVND } from '$lib/utils/price';
  import { scaleBand, scaleLinear } from 'd3-scale';
  import { Area, Axis, Bars, Chart, Highlight, Layer, Tooltip } from 'layerchart';

  let {
    data = [] as SalesVelocityPoint[],
    loading = false,
  }: { data: SalesVelocityPoint[]; loading: boolean } = $props();

  const chartData = $derived(
    data.map((d) => ({
      period: new Date(d.period),
      revenue: d.revenue,
      tickets: d.tickets,
    })),
  );

  // Shorten large VND values for axis: 1.2tr, 500tr, 1.2tỷ
  function formatAxisVND(value: number): string {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}tỷ`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}tr`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
    return String(value);
  }
</script>

{#if loading}
  <div class="flex h-[300px] items-center justify-center">
    <div class="text-sm text-muted-foreground">Đang tải...</div>
  </div>
{:else if chartData.length === 0}
  <div class="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
    Chưa có dữ liệu
  </div>
{:else}
  <Chart
    data={chartData}
    x="period"
    xScale={scaleBand().padding(0.3)}
    y="revenue"
    yDomain={[0, null]}
    yNice
    y1="tickets"
    y1Range={({ yScale }) => yScale.domain()}
    padding={{ right: 16, left: 40, top: 5, bottom: 44 }}
    height={300}
    tooltipContext={{ mode: 'bisect-x' }}
  >
    {#snippet children({ context })}
      <Layer>
        <Axis placement="left" grid rule format={(v) => formatAxisVND(v)} tickSpacing={40} />
        <Axis
          placement="right"
          scale={scaleLinear(context.y1Scale?.domain() ?? [], [context.height, 0])}
          ticks={context.y1Scale?.ticks?.()}
          rule
          tickSpacing={40}
        />
        <Axis
          placement="bottom"
          rule
          tickSpacing={60}
          format={(v: Date) => formatPeriodShort(v)}
          tickLabelProps={{ rotate: 315, textAnchor: 'end' }}
        />

        <!-- Ticket bars rendered first (behind), using CSS var directly -->
        <Bars
          y={(d) => context.y1Scale?.(d.tickets)}
          style="fill: color-mix(in oklab, var(--color-info) 50%, transparent)"
        />

        <!-- Revenue area on top -->
        <Area
          line={{ style: 'stroke: var(--color-cta); stroke-width: 2' }}
          style="fill: color-mix(in oklab, var(--color-cta) 20%, transparent)"
        />

        <Highlight lines points />
      </Layer>

      <Tooltip.Root {context}>
        {#snippet children({ data: d })}
          <Tooltip.Header value={d?.period} format={(v: Date) => formatPeriodFull(v)} />
          <Tooltip.List>
            <Tooltip.Item
              label="Doanh thu"
              value={d?.revenue ?? 0}
              format={(v: number) => formatFullVND(v)}
              color="var(--color-cta)"
            />
            <Tooltip.Item label="Số vé" value={d?.tickets ?? 0} color="var(--color-info)" />
          </Tooltip.List>
        {/snippet}
      </Tooltip.Root>
    {/snippet}
  </Chart>
{/if}
