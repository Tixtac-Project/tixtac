<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardFooter, CardHeader } from '$lib/components/ui/card';
  import { Calendar, Clock, Ticket } from 'lucide-svelte';

  export interface PendingOrderItem {
    event_title: string;
    show_title: string | null;
    start_time: string;
    section_name: string;
    seat_type: 'assigned' | 'general';
    seat_label: string | null;
    price: string | number;
  }

  export interface PendingOrder {
    order_id: number;
    total_amount: string | number;
    status: 'pending';
    expires_at: string;
    created_at: string;
    items: PendingOrderItem[];
  }

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

  // QUY TẮC: Chỉ lấy 2 item đầu tiên để hiển thị, tính số lượng ẩn
  const displayItems = $derived(order.items.slice(0, 2));
  const hiddenItemsCount = $derived(order.items.length - 2);

  const formatCurrency = (amount: string) =>
    new Intl.NumberFormat('vi-VN').format(Number(amount)) + ' đ';

  const formatDateTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
</script>

{#if !isExpired}
  <Card
    class="flex h-full flex-col overflow-hidden rounded-2xl border-border shadow-sm transition-all hover:shadow-md"
  >
    <CardHeader class="border-b border-border bg-surface-container-lowest p-4 sm:p-5">
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

    <CardContent class="flex-1 bg-surface-container-lowest p-4 sm:p-5">
      <div class="space-y-4">
        {#each displayItems as item, i (i)}
          <!-- Luôn nằm ngang: info trái, giá phải -->
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="truncate leading-tight font-bold text-foreground">{item.event_title}</p>
              <p class="text-sm font-medium text-muted-foreground">
                {item.show_title || 'Suất diễn'}
              </p>
              <div
                class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"
              >
                <span class="flex items-center gap-1">
                  <Calendar class="h-3 w-3 shrink-0" />
                  {formatDateTime(item.start_time)}
                </span>
                <span
                  class="rounded-full bg-surface-container-high px-2 py-0.5 font-semibold text-foreground"
                >
                  {item.section_name}{#if item.seat_type !== 'general'}
                    · Ghế {item.seat_label}{/if}
                </span>
              </div>
            </div>
            <span class="shrink-0 text-sm font-bold text-foreground sm:text-base">
              {formatCurrency(item.price)}
            </span>
          </div>
        {/each}

        {#if hiddenItemsCount > 0}
          <div
            class="mt-2 rounded-lg border border-dashed border-border bg-surface-container-low py-2.5 text-center text-xs font-semibold text-muted-foreground"
          >
            + {hiddenItemsCount} vé khác đang chờ thanh toán
          </div>
        {/if}
      </div>
    </CardContent>

    <CardFooter
      class="flex flex-col gap-4 bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div class="w-full text-center sm:w-auto sm:text-left">
        <p class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Tổng thanh toán
        </p>
        <p class="mt-0.5 text-2xl font-bold text-foreground">
          {formatCurrency(order.total_amount)}
        </p>
      </div>
      <Button
        href="/checkout/{order.order_id}"
        class="w-full rounded-xl bg-primary px-8 py-6 font-bold text-primary-foreground shadow-md transition-transform hover:bg-primary-container sm:w-auto sm:py-5 sm:hover:scale-105"
      >
        Thanh toán ngay <span class="ml-2">›</span>
      </Button>
    </CardFooter>
  </Card>
{/if}
