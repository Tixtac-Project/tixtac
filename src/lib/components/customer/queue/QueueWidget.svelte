<!-- src/lib/components/customer/queue/QueueWidget.svelte -->
<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { queueStore } from '$lib/stores/queue.svelte';
  import { AlertCircle, ArrowLeft, Loader2, LogOut, Timer, X } from 'lucide-svelte';

  /** Remaining seconds, derived from `queueStore.expiresAt`. */
  let timeLeft = $state(0);
  /** Controls visibility of the "Exit session" confirmation modal. */
  let showExitConfirm = $state(false);
  /** True while the leave-queue API call is in-flight. */
  let isLeaving = $state(false);

  /**
   * Countdown effect — ticks every second while the queue is active.
   * When the timer reaches zero in `ready` or `holding` state, the session
   * is automatically marked as `missed` and the queue slot is released.
   */
  $effect(() => {
    if (queueStore.status === 'idle' || queueStore.status === 'missed') return;

    const update = () => {
      if (queueStore.expiresAt) {
        timeLeft = Math.max(0, Math.floor((queueStore.expiresAt - Date.now()) / 1000));
        // Timer expired — auto-leave to release the slot for the next user.
        if (timeLeft === 0 && (queueStore.status === 'ready' || queueStore.status === 'holding')) {
          queueStore.status = 'missed';
          queueStore.leave();
        }
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  });

  /**
   * Background polling effect — runs every 5 seconds while the user is
   * in `waiting` status. Ensures the widget updates to `ready` (green)
   * even when the user has navigated away from the /queue page.
   */
  $effect(() => {
    if (queueStore.status !== 'waiting' || !queueStore.eventId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/events/${queueStore.eventId}/queue/status`);
        if (!res.ok) return;
        const { data } = await res.json();

        if (data.status === 'active') {
          queueStore.status = 'ready';
          queueStore.expiresAt = data.expiresAt;
          if (data.token) queueStore.token = data.token;
        } else if (data.status === 'waiting') {
          queueStore.position = data.position;
        } else if (data.status === 'none') {
          queueStore.clear();
        }
      } catch (err) {
        console.error('[Widget Poll Error]', err);
      }
    };

    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  });

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * Determines whether the floating widget should be rendered.
   *
   * Hidden when:
   * - Status is `idle` or `missed` (no active queue).
   * - Status is `waiting` and the user is already on a `/queue` page (full-screen view).
   * - Status is `holding` and the user is on the `/seats` page (no need to overlay).
   * - The URL ends with `/queue` to avoid duplicate UI.
   */
  let shouldShow = $derived(
    queueStore.status !== 'idle' &&
      queueStore.status !== 'missed' &&
      !(queueStore.status === 'waiting' && page.url.pathname.includes('/queue')) &&
      !(queueStore.status === 'holding' && page.url.pathname.includes('/seats')) &&
      !page.url.pathname.endsWith('/queue'),
  );

  /** Expands the widget back to the full-screen queue page. */
  function expandQueue() {
    const eventId = queueStore.eventId;
    queueStore.isMinimized = false;
    if (eventId) goto(`/events/${eventId}/queue`);
  }

  /**
   * Navigates the user to the seat selection page.
   *
   * When the status is `ready`, this first calls the `/confirm` API to
   * extend the slot from 60s (grace period) to 5 minutes (holding session).
   * Uses `pendingConfirm` to avoid the orange widget flashing during navigation.
   */
  async function goToSeats() {
    const eventId = queueStore.eventId;
    const showId = queueStore.showId;

    if (queueStore.status === 'ready' && eventId) {
      try {
        const res = await fetch(`/api/events/${eventId}/queue/confirm`, {
          method: 'POST',
        });
        if (res.ok) {
          const { data } = await res.json();
          // Stage the confirm data; the /seats page commits it on mount to avoid the orange flash.
          queueStore.setPendingConfirm(data.expiresAt, data.token);
          if (showId) {
            goto(`/events/${eventId}/shows/${showId}/seats`);
          } else {
            goto(`/events/${eventId}`);
          }
          return;
        }
      } catch (err) {
        console.error('[Widget Confirm Error]', err);
      }
    }

    // Fallback: navigate directly if already holding.
    if (showId && eventId) {
      goto(`/events/${eventId}/shows/${showId}/seats`);
    } else if (eventId) {
      goto(`/events/${eventId}`);
    }
  }

  async function handleLeave() {
    isLeaving = true;
    showExitConfirm = false;
    await queueStore.leave();
    isLeaving = false;
  }
</script>

{#if shouldShow}
  <div
    class="fixed right-5 bottom-5 z-50 w-[320px] animate-in overflow-hidden rounded-2xl
           shadow-2xl ring-1 ring-black/10
           backdrop-blur-sm duration-300 fade-in slide-in-from-bottom-4"
  >
    <!-- ────────────────── WAITING (Thu nhỏ) ────────────────── -->
    {#if queueStore.status === 'waiting'}
      <div class="bg-surface-container-highest p-4">
        <!-- Header -->
        <div class="mb-3 flex items-center gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Loader2 class="h-5 w-5 animate-spin text-primary" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-[10px] font-bold tracking-widest text-primary uppercase">
              Đang xếp hàng
            </p>
            {#if queueStore.eventTitle}
              <p class="truncate text-xs font-semibold text-foreground">{queueStore.eventTitle}</p>
            {/if}
          </div>
        </div>

        <!-- Position badge -->
        <div
          class="mb-3 flex items-center justify-center gap-2 rounded-xl bg-surface-container p-3"
        >
          <span class="text-sm text-muted-foreground">Vị trí của bạn:</span>
          <span class="text-2xl font-black text-primary">#{queueStore.position}</span>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <button
            onclick={expandQueue}
            class="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
          >
            Phóng to phòng chờ
          </button>
          <button
            onclick={() => (showExitConfirm = true)}
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            title="Hủy xếp hàng"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- ────────────────── READY (Grace Period 60s) ────────────────── -->
    {:else if queueStore.status === 'ready'}
      <div class="bg-emerald-600 p-4 text-white">
        <!-- Pulse ring decoration -->
        <div class="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>

        <div class="relative">
          <div class="mb-3 flex items-center gap-3">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <AlertCircle class="h-5 w-5" />
            </div>
            <div>
              <p class="text-[10px] font-bold tracking-widest uppercase opacity-80">Đã tới lượt!</p>
              {#if queueStore.eventTitle}
                <p class="max-w-[180px] truncate text-xs font-semibold">{queueStore.eventTitle}</p>
              {/if}
            </div>
          </div>

          <!-- Countdown -->
          <div class="mb-3 text-center">
            <p class="text-xs opacity-80">Xác nhận trong vòng</p>
            <p class="font-mono text-4xl font-black tabular-nums">
              {formatTime(timeLeft)}
            </p>
          </div>

          <button
            onclick={goToSeats}
            class="w-full animate-pulse rounded-xl bg-white py-3 text-sm font-bold text-emerald-700
                   shadow-lg shadow-black/20 transition-all hover:animate-none hover:bg-white/90 active:scale-95"
          >
            VÀO CHỌN GHẾ NGAY →
          </button>
        </div>
      </div>

      <!-- ────────────────── HOLDING (Bảo vệ phiên 5 phút) ────────────────── -->
    {:else if queueStore.status === 'holding'}
      <div class="bg-orange-500 p-4 text-white">
        <!-- Decoration -->
        <div class="absolute -top-6 -left-6 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>

        <div class="relative">
          <div class="mb-3 flex items-center gap-3">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <Timer class="h-5 w-5" />
            </div>
            <div>
              <p class="text-[10px] font-bold tracking-widest uppercase opacity-80">
                Phiên chọn ghế
              </p>
              {#if queueStore.eventTitle}
                <p class="max-w-[180px] truncate text-xs font-semibold">{queueStore.eventTitle}</p>
              {/if}
            </div>
          </div>

          <!-- Countdown -->
          <div class="mb-3 flex items-center justify-between rounded-xl bg-black/20 px-4 py-2.5">
            <span class="text-xs opacity-80">Hết hạn sau:</span>
            <span class="font-mono text-2xl font-black tabular-nums">{formatTime(timeLeft)}</span>
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <button
              onclick={goToSeats}
              class="flex-1 rounded-xl bg-white py-2.5 text-xs font-bold text-orange-600 transition-all hover:bg-white/90 active:scale-95"
            >
              <ArrowLeft class="mr-1 inline-block h-3.5 w-3.5 -rotate-180" />
              Quay lại chọn ghế
            </button>
            <button
              onclick={() => (showExitConfirm = true)}
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/20 text-white transition hover:bg-black/30"
              title="Thoát phiên chọn ghế"
            >
              <LogOut class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}

<!-- ────────────────── EXIT CONFIRM MODAL ────────────────── -->
{#if showExitConfirm}
  <div class="fixed inset-0 z-[70] flex items-center justify-center p-4">
    <!-- Backdrop -->
    <button
      class="absolute inset-0 bg-black/50 backdrop-blur-sm"
      onclick={() => (showExitConfirm = false)}
      aria-label="Đóng"
    ></button>

    <div
      class="relative z-10 w-full max-w-sm animate-in overflow-hidden rounded-2xl bg-surface shadow-2xl duration-200 zoom-in-95"
    >
      <div class="p-6">
        <h3 class="mb-2 font-heading text-lg font-bold text-foreground">
          {queueStore.status === 'holding' ? 'Thoát phiên chọn ghế?' : 'Hủy xếp hàng?'}
        </h3>
        <p class="text-sm text-muted-foreground">
          {#if queueStore.status === 'holding'}
            Bạn sẽ mất quyền giữ slot và phải xếp hàng lại từ đầu nếu muốn mua vé.
          {:else}
            Bạn sẽ mất vị trí #{queueStore.position} trong hàng chờ. Hành động này không thể hoàn tác.
          {/if}
        </p>
      </div>
      <div class="flex gap-3 border-t border-outline-variant/20 px-6 py-4">
        <button
          onclick={() => (showExitConfirm = false)}
          class="flex-1 rounded-xl bg-surface-container-highest px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface-container-high active:scale-95"
        >
          Ở lại
        </button>
        <button
          onclick={handleLeave}
          disabled={isLeaving}
          class="flex-1 rounded-xl bg-destructive px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 active:scale-95 disabled:opacity-50"
        >
          {isLeaving ? 'Đang xử lý...' : 'Xác nhận thoát'}
        </button>
      </div>
    </div>
  </div>
{/if}
