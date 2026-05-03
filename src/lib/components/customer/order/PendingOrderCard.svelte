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

  // QUY TẮC: Chỉ lấy 3 item đầu tiên để hiển thị, tính số lượng ẩn
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
    <CardHeader class="border-b border-border p-4 sm:p-5">
      <!-- Luôn nằm ngang: title trái, timer phải -->
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="flex items-center gap-2 text-base font-bold text-foreground sm:text-lg">
            <Ticket class="h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
            <span class="truncate">Đơn hàng #{order.order_id}</span>
          </h3>
          <p class="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Vui lòng hoàn tất thanh toán để giữ chỗ
          </p>
        </div>
        <div
          class="flex shrink-0 items-center gap-1 text-base font-bold text-foreground tabular-nums sm:gap-1.5 sm:text-lg"
        >
          <Clock class="h-4 w-4 animate-pulse text-destructive sm:h-5 sm:w-5" />
          <span>{formattedTime}</span>
        </div>
      </div>
    </CardHeader>

    <CardContent class="flex-1 p-4 sm:p-5">
      <div class="mb-4 line-clamp-2">
        <h4 class="text-base font-bold text-foreground sm:text-lg">{eventTitle}</h4>
      </div>
      <div class="space-y-4">
        {#each groupedDisplayItems as group, i (i)}
          <!-- Nhóm vé cùng Suất diễn -->
          <div
            class="rounded-xl border border-border bg-surface-container-lowest p-3 shadow-sm sm:p-4"
          >
            <div class="mb-3 border-b border-dashed border-border pb-2">
              <p class="text-sm font-bold text-foreground">
                {group.show_title || 'Suất diễn'}
              </p>
              <div class="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar class="h-3 w-3 shrink-0" />
                {formatTime(group.start_time)} | {formatDate(group.start_time)}
              </div>
            </div>

            <div class="space-y-2">
              {#each group.tickets as ticket, j (j)}
                <div class="flex items-center justify-between gap-3">
                  <span
                    class="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground"
                  >
                    {ticket.section_name}{#if ticket.seat_type !== 'general'}
                      · Ghế {ticket.seat_label}{/if}
                  </span>
                  <span class="shrink-0 text-sm font-bold text-foreground">
                    {formatPrice(Number(ticket.price))}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {/each}

        {#if hiddenItemsCount > 0}
          <div
            class="mt-2 rounded-lg border border-dashed border-border bg-muted/50 py-2.5 text-center text-xs font-semibold text-muted-foreground"
          >
            + {hiddenItemsCount} vé khác đang chờ thanh toán
          </div>
        {/if}
      </div>
    </CardContent>

    <CardFooter
      class="flex flex-col gap-4 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div class="w-full text-center sm:w-auto sm:text-left">
        <p class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Tổng thanh toán
        </p>
        <p class="mt-0.5 text-2xl font-bold text-foreground">
          {formatPrice(Number(order.total_amount))}
        </p>
      </div>
      <Button
        href="/orders/{order.order_id}/checkout"
        class="w-full rounded-xl bg-primary px-8 py-6 font-bold text-primary-foreground shadow-md transition-transform hover:bg-primary-container sm:w-auto sm:py-5 sm:hover:scale-105"
      >
        Thanh toán ngay <span class="ml-2">›</span>
      </Button>
    </CardFooter>
  </Card>
{/if}
