<script lang="ts">
  import EventTicketCard from '$lib/components/customer/event/EventTicketCard.svelte';
  import PendingOrderCard from '$lib/components/customer/event/PendingOrderCard.svelte';

  let { data } = $props();

  const pendingOrders = $derived(data.pendingOrders || []);
  const paidEvents = $derived(data.paidEvents || []);

  // Trạng thái của thanh Tabs
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
    {#if (activeTab === 'all' || activeTab === 'pending') && pendingOrders.length > 0}
      <div class="mb-12">
        <!-- Tiêu đề Khu vực (Chỉ thu nhỏ chữ trên Mobile) -->
        <div
          class="mb-4 flex items-center justify-between rounded-lg bg-surface-container-low px-3 py-2 sm:px-4"
        >
          <h2 class="text-sm font-bold text-foreground sm:text-lg">Đơn hàng chờ thanh toán</h2>
          <span class="text-xs font-semibold text-muted-foreground sm:text-sm">
            {pendingOrders.length} Đơn hàng
          </span>
        </div>

        {#each pendingOrders as order (order.order_id)}
          <PendingOrderCard {order} />
        {/each}
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

    <!-- TRỐNG -->
    {#if pendingOrders.length === 0 && paidEvents.length === 0}
      <div class="py-20 text-center text-muted-foreground">Bạn chưa có giao dịch nào.</div>
    {/if}
  </div>
</div>
