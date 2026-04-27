<script lang="ts">
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import { Button } from '$lib/components/ui/button';
  import type { PendingOrderItem } from '$lib/types/purchase';
  import { formatDate, formatTime } from '$lib/utils/datetime';
  import { formatPrice } from '$lib/utils/price';
  import { TriangleAlert } from 'lucide-svelte';

  interface Props {
    open: boolean;
    orderId: number;
    totalAmount: string;
    expiresAt: string;
    items: PendingOrderItem[];
    isLoading: boolean;
    onConfirmNew: () => void;
    onPayOld: () => void;
    onClose: () => void;
  }

  let {
    open,
    orderId,
    totalAmount,
    expiresAt,
    items,
    isLoading = false,
    onConfirmNew,
    onPayOld,
    onClose,
  }: Props = $props();
</script>

<AlertDialog.Root {open} onOpenChange={(v) => !v && onClose()}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <div class="mb-2 flex items-center gap-2 text-warning">
        <TriangleAlert class="h-5 w-5" />
        <AlertDialog.Title>Bạn có đơn hàng đang chờ thanh toán</AlertDialog.Title>
      </div>
      <AlertDialog.Description>
        Bạn đang có một đơn hàng đang chờ thanh toán cho sự kiện này (Đơn #{orderId}). Nếu muốn tiếp
        tục đặt đơn mới, đơn cũ
        <b class="text-danger">sẽ bị hủy</b>
        và các ghế đang giữ sẽ được nhả ra.
      </AlertDialog.Description>
    </AlertDialog.Header>

    <div class="my-4 overflow-y-auto rounded-lg border border-border bg-muted/50 p-3">
      <p class="mb-2 text-xs font-semibold text-foreground">
        Đơn hàng đang chờ thanh toán #{orderId} — Tổng: {formatPrice(Number(totalAmount))}
      </p>
      <ul class="space-y-1.5">
        {#each items as item, i (`${item.show_date}-${item.section_name}-${item.seat_label ?? ''}-${i}`)}
          <li class="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span class="inline-block h-1.5 w-1.5 rounded-full text-warning"></span>
            <span class="font-medium text-foreground">
              {item.seat_label ?? `${item.section_name} x1`}
            </span>
            <span class="text-[10px]">
              ({item.section_name} — {formatPrice(Number(item.price))})
            </span>
          </li>
        {/each}
      </ul>
      <p class="mt-2 text-[10px] text-muted-foreground">
        Hết hạn: {formatDate(new Date(expiresAt))}
        {formatTime(expiresAt)}
      </p>
    </div>

    <AlertDialog.Footer class="flex-col gap-2 sm:flex-row">
      <Button variant="ghost" onclick={onClose} class="w-full sm:w-auto">Hủy</Button>
      <Button variant="outline" onclick={onPayOld} disabled={isLoading} class="w-full sm:w-auto">
        Thanh toán đơn cũ (#{orderId})
      </Button>
      <Button
        variant="default"
        onclick={onConfirmNew}
        disabled={isLoading}
        class="w-full sm:w-auto"
      >
        Tiếp tục với đơn mới
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
