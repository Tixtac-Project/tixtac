<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardFooter, CardHeader } from '$lib/components/ui/card';
  import type { PendingOrder, PendingOrderItem } from '$lib/types/purchase';
  import { formatDate, formatTime } from '$lib/utils/datetime';
  import { formatPrice } from '$lib/utils/price';
  import { Calendar, Clock, Ticket } from 'lucide-svelte';

  interface Props {
    order: PendingOrder;
  }
  let { order }: Props = $props();

  let timeLeft = $state(0);
  let isExpired = $state(false);

  $effect(() => {
    const targetTime = new Date(order.expires_at).getTime();
    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = targetTime - now;
      if (diff <= 0) {
        isExpired = true;
        timeLeft = 0;
      } else {
        isExpired = false;
        timeLeft = Math.floor(diff / 1000);
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  });

  const formattedTime = $derived.by(() => {
    const m = Math.floor(timeLeft / 60)
      .toString()
      .padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  });

  const displayItems = $derived(order.items.slice(0, 3));
  const hiddenItemsCount = $derived(order.items.length - 3);

  const eventTitle = $derived(order.items[0]?.event_title || 'Sự kiện');

  const groupedDisplayItems = $derived.by(() => {
    const groups: Record<
      string,
      {
        show_title: string | null;
        start_time: string;
        tickets: PendingOrderItem[];
      }
    > = {};

    for (const item of displayItems) {
      const key = item.start_time;
      if (!groups[key]) {
        groups[key] = {
          show_title: item.show_title,
          start_time: item.start_time,
          tickets: [],
        };
      }
      groups[key].tickets.push(item);
    }
    return Object.values(groups);
  });
</script>

{#if !isExpired}
  <Card
    class="flex h-full flex-col overflow-hidden border-border bg-card shadow-sm transition-all hover:shadow-md"
  >
    <CardHeader class="border-b border-border md:!px-6">
      <div class="flex items-start justify-between gap-2 md:gap-3">
        <div class="min-w-0">
          <h3 class="flex items-center gap-1.5 text-sm font-bold text-foreground md:text-lg">
            <Ticket class="h-3.5 w-3.5 shrink-0 text-muted-foreground md:h-5 md:w-5" />
            <span class="truncate">Đơn hàng #{order.order_id}</span>
          </h3>
          <p class="text-[11px] text-muted-foreground md:text-sm">
            Vui lòng hoàn tất thanh toán để giữ chỗ
          </p>
        </div>
        <div
          class="flex shrink-0 items-center gap-1 text-sm font-bold text-foreground tabular-nums md:text-lg"
        >
          <Clock class="h-3.5 w-3.5 animate-pulse text-destructive md:h-5 md:w-5" />
          <span>{formattedTime}</span>
        </div>
      </div>
    </CardHeader>

    <CardContent class="flex-1 md:!px-6">
      <h4 class="mb-3 line-clamp-2 text-sm font-bold text-foreground md:mb-4 md:text-lg">
        {eventTitle}
      </h4>
      <div class="space-y-2.5 md:space-y-4">
        {#each groupedDisplayItems as group, i (i)}
          <div
            class="rounded-xl border border-border bg-surface-container-lowest p-2.5 shadow-sm md:p-4"
          >
            <div class="mb-2 border-b border-dashed border-border pb-2 md:mb-3">
              <p class="text-xs font-bold text-foreground md:text-sm">
                {group.show_title || 'Suất diễn'}
              </p>
              <div
                class="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground md:text-xs"
              >
                <Calendar class="h-2.5 w-2.5 shrink-0 md:h-3 md:w-3" />
                {formatTime(group.start_time)} | {formatDate(group.start_time)}
              </div>
            </div>

            <div class="space-y-1.5 md:space-y-2">
              {#each group.tickets as ticket, j (j)}
                <div class="flex items-center justify-between gap-2 md:gap-3">
                  <span
                    class="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground md:text-xs"
                  >
                    {ticket.section_name}{#if ticket.seat_type !== 'general'}
                      · Ghế {ticket.seat_label}{/if}
                  </span>
                  <span class="shrink-0 text-xs font-bold text-foreground md:text-sm">
                    {formatPrice(Number(ticket.price))}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {/each}

        {#if hiddenItemsCount > 0}
          <div
            class="rounded-lg border border-dashed border-border bg-muted/50 py-2 text-center text-[11px] font-semibold text-muted-foreground md:py-2.5 md:text-xs"
          >
            + {hiddenItemsCount} vé khác đang chờ thanh toán
          </div>
        {/if}
      </div>
    </CardContent>

    <CardFooter class="flex-col gap-3 md:flex-row md:items-center md:justify-between md:!px-6">
      <div class="w-full text-center md:w-auto md:text-left">
        <p
          class="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase md:text-xs"
        >
          Tổng thanh toán
        </p>
        <p class="text-lg font-bold text-foreground md:text-2xl">
          {formatPrice(Number(order.total_amount))}
        </p>
      </div>
      <Button
        href="/orders/{order.order_id}/checkout"
        class="w-full rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-md transition-transform hover:bg-primary-container md:w-auto md:px-8 md:py-5 md:hover:scale-105"
      >
        Thanh toán ngay <span class="ml-1">›</span>
      </Button>
    </CardFooter>
  </Card>
{/if}
