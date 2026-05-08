<!-- src/routes/(customer)/events/[id]/queue/+page.svelte -->
<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { queueStore } from '$lib/stores/queue.svelte';
  import { onMount } from 'svelte';
  import { Clock, Loader2, Users } from 'lucide-svelte';

  let eventId = $derived(Number(page.params.id));

  let isConfirming = $state(false);
  let pollingError = $state(false);

  // Countdown cho grace period (chỉ dùng khi status === 'ready')
  let timeLeft = $state(0);
  $effect(() => {
    if (queueStore.status !== 'ready' || !queueStore.expiresAt) {
      timeLeft = 0;
      return;
    }
    const update = () => {
      timeLeft = Math.max(0, Math.floor((queueStore.expiresAt! - Date.now()) / 1000));
      if (timeLeft === 0) {
        queueStore.status = 'missed';
        queueStore.leave();
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  });

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // Thời gian chờ ước tính: mỗi người ~30 giây
  let estimatedWait = $derived(
    queueStore.position > 0
      ? queueStore.position <= 2
        ? 'Sắp tới lượt!'
        : `~${Math.ceil((queueStore.position * 30) / 60)} phút`
      : '',
  );

  async function pollStatus() {
    try {
      const res = await fetch(`/api/events/${eventId}/queue/status`);
      if (!res.ok) return;
      const { data } = await res.json();
      pollingError = false;

      if (data.status === 'active') {
        // Server báo tới lượt → chuyển sang grace period
        queueStore.status = 'ready';
        queueStore.expiresAt = data.expiresAt;
        // Server chỉ mint token mới khi ≤30s còn lại → không ghi đè token cũ nếu null
        if (data.token) {
          queueStore.token = data.token;
        }
      } else if (data.status === 'waiting') {
        queueStore.status = 'waiting';
        queueStore.position = data.position;
      } else if (data.status === 'none') {
        // Bị đuổi khỏi queue (timeout, worker eviction, ...)
        queueStore.clear();
        goto(`/events/${eventId}`);
      }
    } catch {
      pollingError = true;
    }
  }

  async function handleConfirm() {
    if (isConfirming) return;
    isConfirming = true;
    try {
      const res = await fetch(`/api/events/${eventId}/queue/confirm`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.message ?? 'Không thể xác nhận. Vui lòng thử lại.');
        return;
      }
      const { data } = await res.json();
      // Lưu vào pendingConfirm thay vì set 'holding' ngay — tránh flash widget cam
      // seats/+page.svelte sẽ gọi queueStore.commitHolding() khi mount
      queueStore.setPendingConfirm(data.expiresAt, data.token);

      const showId = queueStore.showId;
      if (showId) {
        goto(`/events/${eventId}/shows/${showId}/seats`);
      } else {
        goto(`/events/${eventId}`);
      }
    } catch {
      alert('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      isConfirming = false;
    }
  }

  onMount(() => {
    // Nếu store đã ready (F5 trong grace period), không cần poll lại ngay
    if (queueStore.status !== 'ready') {
      pollStatus();
    }
    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  });
</script>

<svelte:head>
  <title>Phòng chờ ảo — {queueStore.eventTitle || 'TixTac'}</title>
</svelte:head>

<div class="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-surface sm:p-4">
  <div class="w-full flex-1 sm:max-w-md sm:flex-none flex flex-col justify-between sm:justify-start">
    <!-- ═══════════════════════════════════════════ -->
    <!-- TRẠNG THÁI: WAITING                         -->
    <!-- ═══════════════════════════════════════════ -->
    {#if queueStore.status === 'waiting'}
      <div
        class="flex flex-1 flex-col sm:block sm:overflow-hidden sm:rounded-2xl sm:bg-surface-container sm:shadow-2xl sm:ring-1 sm:ring-outline-variant/20"
      >
        <!-- Top gradient accent -->
        <div class="h-1.5 bg-gradient-to-r from-primary via-primary/70 to-transparent hidden sm:block"></div>

        <div class="flex flex-1 flex-col p-6 sm:p-8">
          
          <div class="flex-1 flex flex-col items-center justify-center pt-8 sm:pt-0">
            <!-- Illustration -->
            <div class="mb-8 flex justify-center">
              <div class="relative flex h-24 w-24 items-center justify-center">
                <!-- Pulse rings -->
                <div class="absolute h-24 w-24 animate-ping rounded-full bg-primary/10"></div>
                <div
                  class="absolute h-16 w-16 animate-ping rounded-full bg-primary/15 [animation-delay:300ms]"
                ></div>
                <div
                  class="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary/20"
                >
                  <Loader2 class="h-6 w-6 animate-spin text-primary" />
                </div>
              </div>
            </div>

            <h1 class="mb-2 text-center font-heading text-2xl font-black text-foreground">
              Đang xếp hàng
            </h1>
            {#if queueStore.eventTitle}
              <p class="mb-8 text-center text-sm font-medium text-primary">{queueStore.eventTitle}</p>
            {:else}
              <p class="mb-8 text-center text-sm text-muted-foreground">
                Vui lòng không tắt trình duyệt
              </p>
            {/if}

            <!-- Position display -->
            <div
              class="mb-6 w-full rounded-2xl bg-surface-container-low sm:bg-surface p-6 text-center sm:ring-1 ring-outline-variant/30 shadow-inner sm:shadow-none"
            >
              <p class="mb-2 text-xs font-bold tracking-widest text-muted-foreground uppercase">
                Vị trí của bạn
              </p>
              <div class="font-mono text-7xl font-black text-primary px-2">
                #{queueStore.position}
              </div>
            {#if estimatedWait}
              <div
                class="mt-3 flex items-center justify-center gap-1.5 text-sm text-muted-foreground"
              >
                <Clock class="h-4 w-4" />
                <span>
                  Thời gian chờ ước tính: <strong class="text-foreground">{estimatedWait}</strong>
                </span>
              </div>
            {/if}
          </div>

          <!-- Connection error -->
          {#if pollingError}
            <p
              class="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-center text-xs text-destructive"
            >
              Mất kết nối. Đang thử lại...
            </p>
          {/if}

            <!-- Info note -->
            <div class="flex items-start gap-2 rounded-xl bg-primary/5 p-4">
              <Users class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p class="text-xs leading-relaxed text-muted-foreground">
                Hệ thống tự động thông báo khi tới lượt. Bạn có thể thu nhỏ phòng chờ và lướt web.
              </p>
            </div>
          </div>

          <!-- Bottom Actions (Sticky on Mobile) -->
          <div class="mt-8 flex flex-col gap-4 sticky bottom-0 bg-surface sm:bg-transparent pb-4 pt-2 sm:p-0">
            <button
              onclick={() => {
                queueStore.isMinimized = true;
                goto(`/events/${eventId}`);
              }}
              class="w-full rounded-full sm:rounded-xl bg-surface-container-highest sm:bg-surface-container-high px-6 py-4 font-bold text-foreground shadow-lg sm:shadow-none transition-all hover:bg-surface-container-highest active:scale-95"
            >
              Thu nhỏ & Xem thông tin sự kiện
            </button>
            <button
              onclick={() => queueStore.leave()}
              class="py-2 text-sm font-medium text-muted-foreground transition hover:text-destructive"
            >
              Hủy xếp hàng
            </button>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════ -->
      <!-- TRẠNG THÁI: READY (Grace Period 60s)        -->
      <!-- ═══════════════════════════════════════════ -->
    {:else if queueStore.status === 'ready'}
      <div
        class="flex flex-1 flex-col justify-center relative sm:overflow-hidden sm:rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 sm:from-emerald-600 sm:to-emerald-700 p-6 sm:p-8 text-white sm:shadow-2xl sm:shadow-emerald-900/40"
      >
        <!-- Background decoration -->
        <div class="absolute -top-12 -right-12 h-64 w-64 rounded-full bg-white/10 blur-2xl"></div>
        <div class="absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-white/10 blur-2xl"></div>

        <div class="relative flex flex-col flex-1 justify-between sm:justify-center">
          
          <div class="flex-1 flex flex-col justify-center">
            <!-- Checkmark icon -->
            <div class="mb-8 flex justify-center">
              <div
                class="flex h-24 w-24 items-center justify-center rounded-full bg-white/20 ring-8 ring-white/10"
              >
                <svg
                  class="h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="3"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

            <h1 class="mb-2 text-center font-heading text-4xl sm:text-3xl font-black">ĐÃ TỚI LƯỢT!</h1>
            {#if queueStore.eventTitle}
              <p class="mb-8 text-center text-base sm:text-sm font-medium opacity-90">{queueStore.eventTitle}</p>
            {:else}
              <p class="mb-8 text-center text-sm opacity-90">
                Bạn có 1 phút để vào chọn ghế trước khi hệ thống nhường chỗ.
              </p>
            {/if}

            <!-- Countdown ring -->
            <div class="mb-8 rounded-3xl bg-black/10 py-6 text-center backdrop-blur-sm sm:bg-transparent sm:py-0 sm:backdrop-blur-none">
              <p class="text-sm opacity-80 uppercase tracking-widest font-bold mb-2">Xác nhận trong vòng</p>
              <p class="font-mono text-7xl sm:text-6xl leading-none font-black tabular-nums">
                {formatTime(timeLeft)}
              </p>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="mb-6 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div
              class="h-full rounded-full bg-white transition-all duration-1000"
              style="width: {Math.min(100, (timeLeft / 60) * 100)}%"
            ></div>
          </div>

          <div class="mt-4 pb-4 sm:pb-0">
            <button
              onclick={handleConfirm}
              disabled={isConfirming}
              class="w-full animate-pulse rounded-full sm:rounded-xl bg-white px-6 py-4 text-lg font-black text-emerald-700
                     shadow-[0_8px_30px_rgb(0,0,0,0.2)] sm:shadow-xl sm:shadow-black/20 transition-all hover:animate-none hover:bg-white/90 active:scale-95
                     disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isConfirming ? 'Đang xử lý...' : 'VÀO CHỌN GHẾ NGAY →'}
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
