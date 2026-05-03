<script lang="ts">
  import EventTicketCard from '$lib/components/customer/order/EventTicketCard.svelte';
  import PendingOrderCard from '$lib/components/customer/order/PendingOrderCard.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Ticket } from 'lucide-svelte';

  let { data } = $props();

  const pendingOrders = $derived(data.pendingOrders || []);
  const paidEvents = $derived(data.paidEvents || []);

  // Track thời gian thực để lọc đơn hàng hết hạn
  let now = $state(new Date());
  $effect(() => {
    const interval = setInterval(() => {
      now = new Date();
    }, 1000);
    return () => clearInterval(interval);
  });

  // Chỉ giữ các đơn hàng chưa hết hạn
  const livePendingOrders = $derived(pendingOrders.filter((o) => new Date(o.expires_at) > now));

  let activeTab = $state<'all' | 'pending' | 'paid'>('all');
</script>

<svelte:head>
  <title>Lịch sử vé của tôi - Tixtac</title>
</svelte:head>

<!-- Khung xám nhạt bao bọc -->
<div class="min-h-screen bg-background px-4 py-12 pb-28 text-foreground sm:px-6 sm:pb-12 lg:px-8">
  <div class="mx-auto max-w-7xl">
    <!-- HEADER & TABS -->
    <div
      class="mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:mb-10 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h1 class="text-xl font-bold text-foreground sm:text-2xl">Lịch sử vé của tôi</h1>
        <p class="mt-1 text-xs text-muted-foreground sm:text-sm">
          Quản lý và xem lại tất cả các giao dịch vé của bạn
        </p>
      </div>

      <!-- Nút Tabs (Chỉ thu nhỏ chữ và đệm trên Mobile) -->
      <div
        class="flex w-fit items-center rounded-full border border-border bg-surface-container-low p-1"
      >
        <button
          onclick={() => (activeTab = 'all')}
          class="rounded-full px-3 py-1 text-xs font-semibold transition-all sm:px-5 sm:py-1.5 sm:text-sm {activeTab ===
          'all'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'}"
        >
          Tất cả
        </button>
        <button
          onclick={() => (activeTab = 'pending')}
          class="rounded-full px-2.5 py-1 text-xs font-semibold transition-all sm:px-4 sm:py-1.5 sm:text-sm {activeTab ===
          'pending'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'}"
        >
          Chờ thanh toán
        </button>
        <button
          onclick={() => (activeTab = 'paid')}
          class="rounded-full px-2.5 py-1 text-xs font-semibold transition-all sm:px-4 sm:py-1.5 sm:text-sm {activeTab ===
          'paid'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'}"
        >
          Đã thanh toán
        </button>
      </div>
    </div>

    <!-- KHU VỰC CHỜ THANH TOÁN -->
    {#if (activeTab === 'all' || activeTab === 'pending') && livePendingOrders.length > 0}
      <div class="mb-12">
        <div class="mb-6 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="h-6 w-1.5 rounded-full bg-primary"></div>
            <h2 class="text-xl font-bold text-foreground">Đơn hàng chờ thanh toán</h2>
          </div>
          <span class="text-xs font-semibold text-muted-foreground sm:text-sm">
            {livePendingOrders.length} Đơn hàng
          </span>
        </div>
        <div class="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
          {#each livePendingOrders as order (order.order_id)}
            <PendingOrderCard {order} />
          {/each}
        </div>
      </div>
    {/if}

    <!-- KHU VỰC VÉ CỦA TÔI -->
    {#if (activeTab === 'all' || activeTab === 'paid') && paidEvents.length > 0}
      <div>
        <div class="mb-6 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="h-6 w-1.5 rounded-full bg-primary"></div>
            <h2 class="text-xl font-bold text-foreground">Vé của tôi</h2>
          </div>
          <button class="text-sm font-bold text-primary hover:underline">Xem lịch sử ›</button>
        </div>

        {#each paidEvents as event (event.event_id)}
          <EventTicketCard eventData={event} />
        {/each}
      </div>
    {/if}

    <!-- TRỐNG: TẤT CẢ -->
    {#if activeTab === 'all' && livePendingOrders.length === 0 && paidEvents.length === 0}
      <div
        class="mt-8 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface-container-lowest px-4 py-20 text-center"
      >
        <div
          class="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-low text-muted-foreground"
        >
          <Ticket class="h-10 w-10 opacity-50" strokeWidth="1.5" />
        </div>
        <h3 class="mb-2 text-xl font-bold text-foreground">Bạn chưa có vé nào</h3>
        <p class="mb-8 max-w-sm text-sm text-muted-foreground">
          Bạn chưa thực hiện giao dịch nào. Hãy khám phá các sự kiện hấp dẫn đang diễn ra ngay hôm
          nay!
        </p>
        <Button
          href="/"
          class="rounded-full bg-primary px-8 py-6 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:scale-105 hover:bg-primary-container"
        >
          Khám phá sự kiện
        </Button>
      </div>
    {/if}

    <!-- TRỐNG: CHỜ THANH TOÁN -->
    {#if activeTab === 'pending' && livePendingOrders.length === 0}
      <div
        class="mt-8 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface-container-lowest px-4 py-16 text-center"
      >
        <p class="text-sm font-medium text-muted-foreground">
          Không có đơn hàng nào đang chờ thanh toán.
        </p>
      </div>
    {/if}

    <!-- TRỐNG: ĐÃ THANH TOÁN -->
    {#if activeTab === 'paid' && paidEvents.length === 0}
      <div
        class="mt-8 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface-container-lowest px-4 py-16 text-center"
      >
        <p class="text-sm font-medium text-muted-foreground">Bạn chưa có vé nào đã thanh toán.</p>
      </div>
    {/if}
  </div>
</div>
