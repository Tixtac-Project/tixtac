<script lang="ts">
  import { cn } from '$lib/utils';
  import { Hourglass } from 'lucide-svelte';
  import { onDestroy, onMount } from 'svelte';

  let { expiresAt, onExpire } = $props<{
    expiresAt: string | Date;
    onExpire?: () => void;
  }>();

  let timeLeft = $state('00:00');
  let isExpired = $state(false);
  let timerInterval: NodeJS.Timeout | undefined;

  function updateTimer() {
    const expiresAtTime = new Date(expiresAt).getTime();
    const now = new Date().getTime();
    const diff = expiresAtTime - now;

    if (diff <= 0) {
      timeLeft = '00:00';
      if (!isExpired) {
        isExpired = true;
        onExpire?.();
      }
      if (timerInterval) clearInterval(timerInterval);
      return;
    }

    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    timeLeft = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  onMount(() => {
    const expiresAtTime = new Date(expiresAt).getTime();
    const now = new Date().getTime();
    if (expiresAtTime <= now) {
      isExpired = true;
      timeLeft = '00:00';
      onExpire?.();
    } else {
      updateTimer();
      timerInterval = setInterval(updateTimer, 1000);
    }
  });

  onDestroy(() => {
    if (timerInterval) clearInterval(timerInterval);
  });
</script>

<div
  class={cn(
    'arch-card arch-enter mb-8 flex flex-col items-center justify-between gap-6 border-2 p-5 transition-colors sm:flex-row sm:p-6 sm:px-8',
    isExpired ? 'border-destructive bg-destructive/5' : 'border-transparent',
  )}
>
  <div class="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
    <div
      class={cn(
        'flex size-12 shrink-0 items-center justify-center rounded-full md:size-14',
        isExpired ? 'bg-destructive/10 text-destructive' : 'bg-info-muted text-primary',
      )}
    >
      <Hourglass class={cn('size-4 md:size-6', isExpired && 'animate-pulse')} />
    </div>
    <div>
      <h2 class="font-heading text-base font-bold text-foreground md:text-xl">
        {isExpired ? 'Hết thời gian giữ vé' : 'Đang giữ chỗ cho bạn'}
      </h2>
      <p class="mt-1 text-xs text-muted-foreground md:text-sm">
        {isExpired
          ? 'Đơn hàng đã hết hạn. Vé đã được giải phóng cho người khác.'
          : 'Vui lòng hoàn tất thanh toán trước khi thời gian kết thúc.'}
      </p>
    </div>
  </div>
  <div class="flex shrink-0 flex-col items-center sm:items-end">
    <span
      class={cn(
        'font-heading text-2xl leading-none font-black tracking-tight tabular-nums md:text-3xl',
        isExpired ? 'text-destructive' : 'text-primary',
      )}
    >
      {timeLeft}
    </span>
    <span class="label-overline mt-2">Còn lại</span>
  </div>
</div>
