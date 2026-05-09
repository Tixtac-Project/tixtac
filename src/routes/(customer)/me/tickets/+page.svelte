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
<div
  class="min-h-screen bg-background px-3 py-8 pb-[7rem] text-foreground md:px-6 md:py-12 md:pb-12 lg:px-8"
>
  <div class="mx-auto max-w-7xl">
    <!-- HEADER & TABS -->
    <div
      class="mb-6 flex flex-col gap-3 border-b border-border pb-4 md:mb-10 md:flex-row md:items-center md:justify-between md:pb-6"
    >
      <div>
        <h1 class="text-lg font-bold text-foreground md:text-2xl">Lịch sử vé của tôi</h1>
        <p class="mt-1 text-xs text-muted-foreground md:text-sm">
          Quản lý và xem lại tất cả các giao dịch vé của bạn
        </p>
      </div>

      <div
        class="flex w-fit items-center rounded-full border border-border bg-surface-container-low p-1"
      >
        <button
          onclick={() => (activeTab = 'all')}
          class="rounded-full px-3 py-1 text-xs font-semibold transition-all md:px-5 md:py-1.5 md:text-sm {activeTab ===
          'all'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'}"
        >
          Tất cả
        </button>
        <button
          onclick={() => (activeTab = 'pending')}
          class="rounded-full px-2.5 py-1 text-xs font-semibold transition-all md:px-4 md:py-1.5 md:text-sm {activeTab ===
          'pending'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'}"
        >
          Chờ thanh toán
        </button>
        <button
          onclick={() => (activeTab = 'paid')}
          class="rounded-full px-2.5 py-1 text-xs font-semibold transition-all md:px-4 md:py-1.5 md:text-sm {activeTab ===
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
      <div class="mb-10 md:mb-12">
        <div class="mb-4 flex items-center justify-between md:mb-6">
          <div class="flex items-center gap-2">
            <div class="h-5 w-1.5 rounded-full bg-primary md:h-6"></div>
            <h2 class="text-base font-bold text-foreground md:text-xl">Đơn hàng chờ thanh toán</h2>
          </div>
          <span class="text-xs font-semibold text-muted-foreground md:text-sm">
            {livePendingOrders.length} Đơn hàng
          </span>
        </div>
        <div class="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          {#each livePendingOrders as order (order.order_id)}
            <PendingOrderCard {order} />
          {/each}
        </div>
      </div>
    {/if}

    <!-- KHU VỰC VÉ CỦA TÔI -->
    {#if (activeTab === 'all' || activeTab === 'paid') && paidEvents.length > 0}
      <div>
        <div class="mb-4 flex items-center justify-between md:mb-6">
          <div class="flex items-center gap-2">
            <div class="h-5 w-1.5 rounded-full bg-primary md:h-6"></div>
            <h2 class="text-base font-bold text-foreground md:text-xl">Vé của tôi</h2>
          </div>
        </div>

        {#each paidEvents as event (event.event_id)}
          <EventTicketCard eventData={event} />
        {/each}
      </div>
    {/if}

    <!-- TRỐNG: TẤT CẢ -->
    {#if activeTab === 'all' && livePendingOrders.length === 0 && paidEvents.length === 0}
      <div
        class="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-container-lowest px-4 py-14 text-center md:mt-8 md:rounded-3xl md:py-20"
      >
        <div
          class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-low text-muted-foreground md:mb-5 md:h-20 md:w-20"
        >
          <Ticket class="h-8 w-8 opacity-50 md:h-10 md:w-10" strokeWidth="1.5" />
        </div>
        <h3 class="mb-2 text-lg font-bold text-foreground md:text-xl">Bạn chưa có vé nào</h3>
        <p class="mb-6 max-w-sm text-sm text-muted-foreground md:mb-8">
          Bạn chưa thực hiện giao dịch nào. Hãy khám phá các sự kiện hấp dẫn đang diễn ra ngay hôm
          nay!
        </p>
        <Button
          href="/"
          class="rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:scale-105 hover:bg-primary-container md:px-8 md:py-6 md:text-sm"
        >
          Khám phá sự kiện
        </Button>
      </div>
    {/if}

    <!-- TRỐNG: CHỜ THANH TOÁN -->
    {#if activeTab === 'pending' && livePendingOrders.length === 0}
      <div
        class="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-container-lowest px-4 py-12 text-center md:mt-8 md:rounded-3xl md:py-16"
      >
        <p class="text-sm font-medium text-muted-foreground">
          Không có đơn hàng nào đang chờ thanh toán.
        </p>
      </div>
    {/if}

    <!-- TRỐNG: ĐÃ THANH TOÁN -->
    {#if activeTab === 'paid' && paidEvents.length === 0}
      <div
        class="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-container-lowest px-4 py-12 text-center md:mt-8 md:rounded-3xl md:py-16"
      >
        <p class="text-sm font-medium text-muted-foreground">Bạn chưa có vé nào đã thanh toán.</p>
      </div>
    {/if}
  </div>
</div>
