<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import CheckoutTimer from '$lib/components/customer/order/CheckoutTimer.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import Button from '$lib/components/ui/button/button.svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Separator } from '$lib/components/ui/separator';
  import { toast } from '$lib/stores/toast';
  import { cn } from '$lib/utils';
  import { api } from '$lib/utils/api';
  import { formatDate, formatTime } from '$lib/utils/datetime';
  import { formatPrice } from '$lib/utils/price';
  import {
    ArrowRight,
    Calendar,
    ChevronLeft,
    CircleAlert,
    Clock,
    CreditCard,
    LoaderCircle,
    MapPin,
    Ticket,
  } from 'lucide-svelte';

  let { data } = $props();
  const order = $derived(data.order);
  const firstEventId = $derived(order.items[0]?.event.id);

  let isSubmitting = $state(false);
  let isExpired = $derived(data.isExpired);
  let showExpiredModal = $derived(data.isExpired);

  function handleExpire() {
    isExpired = true;
    showExpiredModal = true;
  }

  async function handleCheckout() {
    if (isSubmitting || isExpired) return;
    isSubmitting = true;

    const res = await api.post(`/orders/${order.id}/checkout`, {}, { silent: true });

    if (res.status === 200 || res.status === 201) {
      toast.success('Thanh toán thành công!');
      goto(resolve('/me/tickets'));
      return;
    }

    if (res.status === 410) {
      isExpired = true;
      showExpiredModal = true;
    } else if (res.status === 400 && res.error?.includes('đã được xử lý')) {
      toast.success('Đơn hàng đã được thanh toán trước đó');
      goto(resolve('/me/tickets'));
    } else if (res.status === 403) {
      toast.error('Bạn không có quyền truy cập đơn hàng này');
      goto(resolve('/'));
    } else {
      toast.error(res.error || 'Thanh toán thất bại');
    }

    isSubmitting = false;
  }

  // Group items by show
  interface OrderItem {
    id: number;
    show: { id: number; show_date: string; start_time: string };
    event: { id: number; title: string; venue: string; banner_image_url: string | null };
    section_name: string;
    seat_type: 'assigned' | 'general';
    seat_label: string | null;
    price: string;
  }

  interface ShowGroup {
    show: OrderItem['show'];
    event: OrderItem['event'];
    items: OrderItem[];
  }

  const shows = $derived(
    Object.values(
      order.items.reduce(
        (acc: Record<string, ShowGroup>, item: OrderItem) => {
          const key = item.show.id;
          if (!acc[key]) {
            acc[key] = {
              show: item.show,
              event: item.event,
              items: [],
            };
          }
          acc[key].items.push(item);
          return acc;
        },
        {} as Record<string, ShowGroup>,
      ),
    ),
  );
</script>

<div class="container mx-auto max-w-5xl px-4 py-6 md:py-10">
  <!-- Back Navigation -->
  <button
    class="arch-enter mb-6 flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    onclick={() => history.back()}
  >
    <ChevronLeft class="mr-1 h-4 w-4" />
    Quay lại
  </button>

  <!-- Timer Block -->
  <CheckoutTimer expiresAt={order.expires_at} onExpire={handleExpire} />

  <h1 class="arch-enter mb-4 font-heading text-2xl font-bold tracking-tight">Chi tiết đơn hàng</h1>
  <div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-14">
    <!-- Left Column: Order Details -->
    <div
      class={cn(
        'space-y-6 lg:col-span-9',
        isExpired && 'pointer-events-none opacity-60 grayscale-[0.5]',
      )}
    >
      {#each shows as { show, event, items }, i (show.id)}
        <div class="arch-card arch-enter" style="animation-delay: {100 + i * 50}ms">
          <div class="flex flex-col gap-5 sm:flex-row">
            {#if event.banner_image_url}
              <img
                src={event.banner_image_url}
                alt={event.title}
                class="h-48 w-full shrink-0 rounded-2xl object-cover sm:h-28 sm:w-28"
              />
            {/if}
            <div class="flex-1 space-y-3">
              <h3 class="font-heading text-xl font-bold">{event.title}</h3>
              <div class="flex flex-col gap-2 text-sm text-muted-foreground">
                <div class="flex items-center gap-2">
                  <MapPin class="h-4 w-4 text-primary" />
                  <span>{event.venue}</span>
                </div>
                <div class="flex items-center gap-4">
                  <div class="flex items-center gap-2">
                    <Calendar class="h-4 w-4 text-primary" />
                    <span>{formatDate(show.show_date)}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <Clock class="h-4 w-4 text-primary" />
                    <span>{formatTime(show.start_time)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator class="my-6 bg-border" />

          <div class="space-y-4">
            <h4 class="label-overline">Vé đã chọn</h4>
            <div class="space-y-3">
              {#each items as item (item.id)}
                <div
                  class="flex items-center justify-between rounded-xl bg-surface-container p-3 transition-colors hover:bg-surface-container-high"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-lowest"
                    >
                      <Ticket class="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div class="flex flex-col">
                      <span class="font-semibold text-foreground">{item.section_name}</span>
                      <span class="text-xs text-muted-foreground">
                        {#if item.seat_type === 'assigned'}
                          Ghế: <span class="font-medium text-foreground">{item.seat_label}</span>
                        {:else}
                          Vé đứng (GA)
                        {/if}
                      </span>
                    </div>
                  </div>
                  <span class="font-heading font-bold text-foreground">
                    {formatPrice(Number(item.price))}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/each}

      <div class="arch-card arch-enter" style="animation-delay: 300ms">
        <h3 class="mb-4 flex items-center gap-2 font-heading text-lg font-bold">
          <CreditCard class="h-5 w-5 text-primary" />
          Phương thức thanh toán
        </h3>
        <div
          class="flex items-center justify-between rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 transition-all hover:border-primary/40"
        >
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <CreditCard class="h-6 w-6 text-primary" />
            </div>
            <div>
              <p class="font-bold text-foreground">Số dư Tixtac</p>
              <p class="text-sm text-muted-foreground">Thanh toán nhanh chóng từ ví của bạn</p>
            </div>
          </div>
          <Badge variant="outline" class="border-primary text-primary">Mặc định</Badge>
        </div>
        <p class="mt-4 text-[13px] text-muted-foreground">
          * Hiện tại chúng tôi chỉ hỗ trợ thanh toán qua số dư tài khoản. Vui lòng đảm bảo bạn có đủ
          số dư trước khi thanh toán.
        </p>
      </div>
    </div>

    <!-- Right Column: Summary & CTA -->
    <div class={cn('space-y-6 lg:col-span-5', isExpired && 'pointer-events-none opacity-60')}>
      <div class="arch-card arch-enter sticky top-6" style="animation-delay: 200ms">
        <h3 class="mb-6 font-heading text-xl font-bold">Tổng kết đơn hàng</h3>

        <div class="space-y-4">
          <div class="flex justify-between text-sm">
            <span class="text-muted-foreground">Số lượng vé</span>
            <span class="font-medium">{order.items.length} vé</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-muted-foreground">Tạm tính</span>
            <span class="font-medium">{formatPrice(Number(order.total_amount))}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-muted-foreground">Phí dịch vụ</span>
            <span class="font-medium text-success">Miễn phí</span>
          </div>

          <Separator class="my-4 bg-border" />

          <div class="flex items-end justify-between">
            <span class="font-heading text-lg font-bold">Tổng cộng</span>
            <span class="font-heading text-xl font-black text-primary tabular-nums">
              {formatPrice(Number(order.total_amount))}
            </span>
          </div>
        </div>

        <div class="mt-8 flex flex-col gap-3">
          <Button
            class={cn(
              'flex h-14 w-full rounded-xl font-heading text-lg font-bold',
              isExpired
                ? 'cursor-not-allowed bg-muted text-muted-foreground'
                : 'bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]',
            )}
            onclick={handleCheckout}
            disabled={isSubmitting || isExpired}
          >
            {#if isSubmitting}
              <LoaderCircle class="mr-2 h-5 w-5 animate-spin" />
              Đang xử lý...
            {:else if isExpired}
              Đã hết hạn
            {:else}
              Thanh toán ngay
            {/if}
          </Button>
          <p class="text-center text-xs text-muted-foreground">
            Bằng việc nhấn "Thanh toán", bạn đồng ý với
            <a
              href={resolve('/terms')}
              class="font-medium text-primary underline-offset-4 hover:underline"
            >
              Điều khoản & Điều kiện
            </a>
            của Tixtac.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Expired Modal -->
<Dialog.Root
  open={showExpiredModal}
  onOpenChange={(val) => {
    if (!val) goto(resolve(`/events/${firstEventId}`));
  }}
>
  <Dialog.Content class="border-none shadow-2xl sm:max-w-md">
    <Dialog.Header class="items-center text-center">
      <div
        class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive"
      >
        <CircleAlert class="h-10 w-10" />
      </div>
      <Dialog.Title class="font-heading text-2xl font-bold">Hết thời gian giữ vé</Dialog.Title>
      <Dialog.Description class="pt-2 text-base">
        Rất tiếc, thời gian giữ vé cho đơn hàng này đã kết thúc. Vé đã được giải phóng để những
        người khác có thể đặt mua.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer class="mt-6 sm:justify-center">
      <Button class="h-12 w-full" onclick={() => goto(resolve(`/events/${firstEventId}`))}>
        Quay lại sự kiện
        <ArrowRight class="h-4 w-4" />
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<style>
  .btn-primary-gradient {
    background: linear-gradient(135deg, hsl(var(--primary)) 0%, #ff80ab 100%);
  }
</style>
