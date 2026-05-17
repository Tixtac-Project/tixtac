<!-- src/routes/(customer)/events/[id]/queue/+page.svelte -->
<script lang="ts">
  import { browser } from '$app/environment';
  import { goto, invalidateAll } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import { queueStore } from '$lib/stores/queue.svelte';
  import { api } from '$lib/utils/api';
  import { Bell, BellRing, Clock, Loader2, Ticket } from 'lucide-svelte';
  import { onMount } from 'svelte';

  let eventId = $derived(Number(page.params.id));
  let isConfirming = $state(false);
  let pollingError = $state(false);
  let showEjectedModal = $state(false);
  let pushSubscribed = $state(false);
  let pushPermissionDenied = $state(false);
  let isSubscribing = $state(false);

  // Countdown — used for both 'ready' (60s grace) and 'holding' (300s full)
  let timeLeft = $state(0);
  let totalSeconds = $derived(
    queueStore.status === 'ready' ? 60 : queueStore.status === 'holding' ? 300 : 0,
  );

  $effect(() => {
    const active = queueStore.status === 'ready' || queueStore.status === 'holding';
    if (!active || !queueStore.expiresAt) {
      timeLeft = 0;
      return;
    }
    const update = () => {
      timeLeft = Math.max(0, Math.floor((queueStore.expiresAt! - Date.now()) / 1000));
      if (timeLeft === 0 && (queueStore.status === 'ready' || queueStore.status === 'holding')) {
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

  let estimatedWait = $derived(
    queueStore.position > 0
      ? queueStore.position <= 2
        ? 'Sắp tới lượt!'
        : `~${Math.ceil((queueStore.position * 30) / 60)} phút`
      : '',
  );

  async function pollStatus() {
    const result = await api.get<{
      status: 'active' | 'waiting' | 'none';
      position?: number;
      expiresAt?: number;
      token?: string;
    }>(`/events/${eventId}/queue/status`, { silent: true });

    if (result.error || !result.data) {
      pollingError = true;
      return;
    }
    pollingError = false;

    const { data } = result;
    if (data.status === 'active') {
      queueStore.status = 'ready';
      queueStore.expiresAt = data.expiresAt ?? null;
      if (data.token) queueStore.token = data.token;
    } else if (data.status === 'waiting') {
      queueStore.status = 'waiting';
      queueStore.position = data.position ?? queueStore.position;
    } else {
      queueStore.clear();
      showEjectedModal = true;
    }
  }

  async function handleConfirm() {
    if (isConfirming) return;
    isConfirming = true;
    try {
      const result = await api.post<{ expiresAt: number; token: string }>(
        `/events/${eventId}/queue/confirm`,
        {},
      );
      if (result.error || !result.data) return;
      queueStore.setPendingConfirm(result.data.expiresAt, result.data.token);
      const showId = queueStore.showId;
      goto(resolve(showId ? `/events/${eventId}/shows/${showId}/seats` : `/events/${eventId}`));
    } finally {
      isConfirming = false;
    }
  }

  function syncPushState() {
    if (browser && 'Notification' in window) {
      pushSubscribed =
        sessionStorage.getItem('tixtac_push_subscribed') === 'true' &&
        Notification.permission === 'granted';
      pushPermissionDenied = Notification.permission === 'denied';
    }
  }

  onMount(() => {
    // Register Service Worker locally inside the queue page
    if (browser && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js', {
          type: 'module',
        })
        .then((reg) => {
          console.log('[SW] ServiceWorker registered locally with scope:', reg.scope);
        })
        .catch((err) => {
          console.error('[SW] ServiceWorker registration failed:', err);
        });
    }

    syncPushState();
    pollStatus(); // Initial check
    const interval = setInterval(() => {
      pollStatus();
    }, 5000);
    return () => clearInterval(interval);
  });
  async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    syncPushState();
    if (pushPermissionDenied) return;

    try {
      isSubscribing = true;
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission === 'denied') {
          syncPushState();
          return;
        }
      }

      const vapidRes = await api.get<{ publicKey: string }>('/config/vapid', { silent: true });
      if (!vapidRes.data?.publicKey) throw new Error('No VAPID key');

      const reg = await navigator.serviceWorker.ready;

      const padding = '='.repeat((4 - (vapidRes.data.publicKey.length % 4)) % 4);
      const base64 = (vapidRes.data.publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const applicationServerKey = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        applicationServerKey[i] = rawData.charCodeAt(i);
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      await api.post('/me/push-subscription', subscription, { silent: true });
      sessionStorage.setItem('tixtac_push_subscribed', 'true');
      pushSubscribed = true;
    } catch (err) {
      console.error('Push subscribe error:', err);
    } finally {
      isSubscribing = false;
      syncPushState();
    }
  }
</script>

<svelte:head>
  <title>Phòng chờ ảo — {queueStore.eventTitle || 'TixTac'}</title>
</svelte:head>

<!-- Noise texture filter (invisible, referenced via CSS) -->
<svg class="pointer-events-none absolute size-0" aria-hidden="true">
  <defs>
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
      <feBlend in="SourceGraphic" mode="overlay" result="blend" />
      <feComposite in="blend" in2="SourceGraphic" operator="in" />
    </filter>
  </defs>
</svg>

<div
  class="flex min-h-dvh flex-col bg-zinc-950 md:items-center md:justify-center md:bg-surface md:p-4"
>
  <div class="flex w-full flex-1 flex-col md:max-w-md md:flex-none">
    <!-- ══════════════════════════════════════ -->
    <!-- WAITING                                -->
    <!-- ══════════════════════════════════════ -->
    {#if queueStore.status === 'waiting'}
      <div
        class="flex flex-1 flex-col md:overflow-hidden md:rounded-2xl md:bg-zinc-900 md:shadow-2xl md:ring-1 md:ring-white/10"
      >
        <!-- Hero band -->
        <div class="relative overflow-hidden bg-zinc-900 px-5 pt-14 pb-8 md:pt-10">
          <!-- Radial glow behind icon -->
          <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div class="size-64 rounded-full bg-primary/20 blur-3xl"></div>
          </div>

          <div class="relative flex flex-col items-center">
            <div class="relative mb-5 flex size-20 items-center justify-center">
              <div class="absolute size-20 animate-ping rounded-full bg-primary/20"></div>
              <div
                class="absolute size-14 animate-ping rounded-full bg-primary/25 [animation-delay:400ms]"
              ></div>
              <div
                class="relative flex size-12 items-center justify-center rounded-full bg-primary/30 ring-1 ring-primary/40"
              >
                <Loader2 class="size-6 animate-spin text-primary" />
              </div>
            </div>

            <h1 class="mb-1 text-center font-heading text-2xl font-black text-white">
              Đang xếp hàng
            </h1>
            {#if queueStore.eventTitle}
              <p class="line-clamp-1 text-center text-sm font-medium text-primary">
                {queueStore.eventTitle}
              </p>
            {:else}
              <p class="text-center text-sm text-zinc-400">Vui lòng không tắt trình duyệt</p>
            {/if}
          </div>
        </div>

        <!-- Position display — main focus -->
        <div class="flex flex-1 flex-col px-5 pb-4">
          <div class="my-auto py-6 text-center">
            <p class="mb-3 text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">
              Vị trí của bạn
            </p>
            <!-- Giant position number -->
            <div class="font-mono text-[7rem] leading-none font-black text-white tabular-nums">
              #{queueStore.position}
            </div>
            {#if estimatedWait}
              <div
                class="mt-4 inline-flex items-center gap-2 rounded-full bg-zinc-800 px-4 py-2 text-sm text-zinc-300"
              >
                <Clock class="size-3.5 text-primary" />
                <span>
                  Chờ ước tính: <strong class="text-white">{estimatedWait}</strong>
                </span>
              </div>
            {/if}
          </div>

          {#if pollingError}
            <p class="mb-3 rounded-xl bg-danger/15 px-4 py-2.5 text-center text-xs text-danger">
              Mất kết nối. Đang thử lại...
            </p>
          {/if}

          <!-- Notification Widget (Vibrant & Premium) -->
          <div
            class="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/90 via-indigo-950/20 to-zinc-900/80 p-4.5 shadow-xl ring-1 ring-white/10"
          >
            <div class="flex items-start gap-3.5">
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 shadow-inner ring-1 ring-indigo-500/20"
              >
                <Bell class="size-4.5" />
              </div>
              <div class="flex-1 space-y-3">
                <div>
                  <h3 class="text-xs font-black tracking-wide text-white uppercase">
                    Nhận thông báo xếp hàng
                  </h3>
                  <p class="mt-1 text-[11px] leading-relaxed text-zinc-400">
                    Hệ thống sẽ đẩy tin nhắn trực tiếp lên thiết bị khi tới lượt. Bạn có thể thu nhỏ
                    tab này và làm việc khác thoải mái.
                  </p>
                </div>

                {#if pushSubscribed}
                  <div
                    class="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-950/40 px-3.5 py-2 text-[11px] font-bold text-emerald-400 shadow-sm"
                  >
                    <span class="relative flex h-2 w-2">
                      <span
                        class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
                      ></span>
                      <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                    </span>
                    <span>Đã bật thông báo thành công</span>
                  </div>
                {:else if !pushPermissionDenied}
                  <button
                    onclick={subscribeToPush}
                    disabled={isSubscribing}
                    class="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-[11px] font-black text-white
                           shadow-lg ring-1 shadow-indigo-950/50 ring-indigo-400/30 transition-all duration-300
                           hover:scale-[1.02] hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-900/50 active:scale-[0.98] disabled:opacity-50"
                  >
                    {#if isSubscribing}
                      <Loader2 class="size-3.5 animate-spin" /> Đang kích hoạt...
                    {:else}
                      <BellRing class="size-3.5 animate-pulse" /> Bật thông báo ngay
                    {/if}
                  </button>
                {/if}
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom action sheet -->
        <div class="pb-safe border-t border-white/5 bg-zinc-900/80 px-5 pt-4 pb-6 backdrop-blur-sm">
          <button
            onclick={() => {
              queueStore.isMinimized = true;
              goto(resolve(`/events/${eventId}`));
            }}
            class="mb-3 w-full rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-zinc-900
                   shadow-sm transition-all active:scale-[0.98] md:hover:bg-zinc-100"
          >
            Thu nhỏ & Xem sự kiện
          </button>
          <button
            onclick={() => queueStore.leave()}
            class="w-full py-2.5 text-sm font-medium text-zinc-500 transition hover:text-red-400"
          >
            Hủy xếp hàng
          </button>
        </div>
      </div>

      <!-- ══════════════════════════════════════ -->
      <!-- READY — Grace period 60s              -->
      <!-- ══════════════════════════════════════ -->
    {:else if queueStore.status === 'ready'}
      <div
        class="relative flex flex-1 flex-col overflow-hidden bg-emerald-950 text-white md:rounded-2xl md:shadow-2xl"
      >
        <!-- Noise overlay -->
        <div
          class="pointer-events-none absolute inset-0 opacity-[0.035]"
          style="background: url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/></filter><rect width=%22200%22 height=%22200%22 filter=%22url(%23n)%22 opacity=%221%22/></svg>'); background-size: 200px;"
        ></div>

        <!-- Glow blobs -->
        <div
          class="pointer-events-none absolute top-0 left-1/2 size-72 -translate-x-1/2 rounded-full bg-emerald-400/25 blur-3xl"
        ></div>
        <div
          class="pointer-events-none absolute bottom-0 left-0 size-48 rounded-full bg-teal-500/20 blur-3xl"
        ></div>

        <!-- Top section -->
        <div class="relative flex flex-col items-center px-5 pt-14 md:pt-10">
          <div
            class="mb-5 flex size-20 items-center justify-center rounded-full bg-white/15 shadow-lg ring-1 shadow-emerald-900/50 ring-white/30"
          >
            <svg
              class="size-10 drop-shadow"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 class="mb-1 text-center font-heading text-3xl font-black tracking-tight">
            ĐÃ TỚI LƯỢT!
          </h1>
          <p class="text-center text-sm text-emerald-200/80">
            {queueStore.eventTitle || 'Bạn có 1 phút để xác nhận.'}
          </p>
        </div>

        <!-- Main countdown — visual anchor -->
        <div class="relative flex flex-1 flex-col items-center justify-center px-5 py-8">
          <div class="mb-6 text-center">
            <p class="mb-2 text-[10px] font-bold tracking-[0.2em] text-emerald-300/60 uppercase">
              Xác nhận trong vòng
            </p>
            <p
              class=" text-[6rem] leading-none font-black tabular-nums drop-shadow-lg
                      {timeLeft <= 15 ? 'text-yellow-300' : 'text-white'}"
            >
              {formatTime(timeLeft)}
            </p>
          </div>

          <!-- Segmented progress ring feel — horizontal bar with glow -->
          <div class="w-full max-w-xs">
            <div class="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                class="h-full rounded-full shadow-[0_0_8px_currentColor] transition-all duration-1000
                       {timeLeft <= 15
                  ? 'bg-yellow-300 text-yellow-300'
                  : 'bg-emerald-300 text-emerald-300'}"
                style="width: {totalSeconds > 0 ? (timeLeft / totalSeconds) * 100 : 0}%"
              ></div>
            </div>
          </div>
        </div>

        <!-- Bottom action sheet -->
        <div
          class="pb-safe relative border-t border-white/10 bg-black/20 px-5 pt-4 pb-6 backdrop-blur-md"
        >
          <button
            onclick={handleConfirm}
            disabled={isConfirming}
            class="w-full rounded-xl bg-emerald-400 px-5 py-4 text-base font-black text-emerald-950
                   shadow-lg shadow-emerald-900/50 transition-all
                   hover:bg-emerald-300 focus-visible:ring-2
                   focus-visible:ring-white focus-visible:ring-offset-2
                   focus-visible:ring-offset-emerald-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isConfirming ? 'Đang xử lý...' : 'Vào chọn ghế ngay →'}
          </button>
        </div>
      </div>

      <!-- ══════════════════════════════════════ -->
      <!-- HOLDING — Đang chọn ghế (300s)        -->
      <!-- ══════════════════════════════════════ -->
    {:else if queueStore.status === 'holding'}
      <div
        class="relative flex flex-1 flex-col overflow-hidden bg-blue-950 text-white md:rounded-2xl md:shadow-2xl"
      >
        <!-- Noise overlay -->
        <div
          class="pointer-events-none absolute inset-0 opacity-[0.035]"
          style="background: url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/></filter><rect width=%22200%22 height=%22200%22 filter=%22url(%23n)%22 opacity=%221%22/></svg>'); background-size: 200px;"
        ></div>

        <!-- Glow blobs -->
        <div
          class="pointer-events-none absolute top-0 left-1/2 size-72 -translate-x-1/2 rounded-full bg-blue-400/20 blur-3xl"
        ></div>
        <div
          class="pointer-events-none absolute right-0 bottom-0 size-48 rounded-full bg-indigo-500/20 blur-3xl"
        ></div>

        <!-- Top section -->
        <div class="relative flex flex-col items-center px-5 pt-14 md:pt-10">
          <div
            class="mb-5 flex size-20 items-center justify-center rounded-full bg-white/15 shadow-lg ring-1 shadow-blue-900/50 ring-white/30"
          >
            <Ticket class="size-10 drop-shadow" aria-hidden="true" />
          </div>
          <h1 class="mb-1 text-center font-heading text-3xl font-black tracking-tight">
            ĐANG GIỮ CHỖ
          </h1>
          <p class="text-center text-sm text-blue-200/80">
            {queueStore.eventTitle || 'Hoàn tất đặt ghế trước khi hết giờ.'}
          </p>
        </div>

        <!-- Main countdown -->
        <div class="relative flex flex-1 flex-col items-center justify-center px-5 py-8">
          <div class="mb-6 text-center">
            <p class="mb-2 text-[10px] font-bold tracking-[0.2em] text-blue-300/60 uppercase">
              Thời gian giữ chỗ còn lại
            </p>
            <p
              class="font-mono text-[6rem] leading-none font-black tabular-nums drop-shadow-lg transition-colors duration-500
                      {timeLeft <= 60 ? 'text-yellow-300' : 'text-white'}"
            >
              {formatTime(timeLeft)}
            </p>
            {#if timeLeft <= 60}
              <p class="mt-2 text-xs font-semibold text-yellow-300/90">
                ⚠ Sắp hết hạn — đặt ghế ngay!
              </p>
            {/if}
          </div>

          <div class="w-full max-w-xs">
            <div class="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                class="h-full rounded-full shadow-[0_0_8px_currentColor] transition-all duration-1000
                       {timeLeft <= 60
                  ? 'bg-yellow-300 text-yellow-300'
                  : 'bg-blue-300 text-blue-300'}"
                style="width: {totalSeconds > 0 ? (timeLeft / totalSeconds) * 100 : 0}%"
              ></div>
            </div>
          </div>
        </div>

        <!-- Bottom action sheet -->
        <div
          class="pb-safe relative border-t border-white/10 bg-black/20 px-5 pt-4 pb-6 backdrop-blur-md"
        >
          <button
            onclick={() =>
              goto(
                resolve(
                  queueStore.showId
                    ? `/events/${eventId}/shows/${queueStore.showId}/seats`
                    : `/events/${eventId}`,
                ),
              )}
            class="mb-3 w-full rounded-xl bg-blue-400 px-5 py-4 text-base font-black text-blue-950
                   shadow-lg shadow-blue-900/50 transition-all
                   hover:bg-blue-300 focus-visible:ring-2
                   focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-800 active:scale-[0.98]"
          >
            Tiếp tục chọn ghế →
          </button>
          <button
            onclick={() => queueStore.leave()}
            class="w-full py-2.5 text-sm font-medium text-white/40 transition hover:text-white/70"
          >
            Hủy & nhường chỗ
          </button>
        </div>
      </div>

      <!-- ══════════════════════════════════════ -->
      <!-- MISSED                                -->
      <!-- ══════════════════════════════════════ -->
    {:else if queueStore.status === 'missed'}
      <div class="flex flex-1 flex-col bg-zinc-950 md:rounded-2xl md:shadow-2xl">
        <div class="flex flex-1 flex-col items-center justify-center px-5">
          <div
            class="mb-6 flex size-20 items-center justify-center rounded-full bg-red-500/15 ring-1 ring-red-500/30"
          >
            <Clock class="size-10 text-red-400" aria-hidden="true" />
          </div>
          <h1 class="mb-2 text-center font-heading text-2xl font-black text-white">
            Đã hết thời gian
          </h1>
          <p class="text-center text-sm text-zinc-400">
            Slot đã được nhường cho người tiếp theo. Bạn sẽ phải xếp hàng lại.
          </p>
        </div>
        <div class="pb-safe border-t border-white/5 bg-zinc-900/80 px-5 pt-4 pb-6">
          <button
            onclick={() => goto(resolve(`/events/${eventId}`))}
            class="w-full rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-zinc-900
                   transition-all hover:bg-zinc-100 active:scale-[0.98]"
          >
            Quay lại sự kiện
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Ejected Modal -->
<AlertDialog.Root
  open={showEjectedModal}
  onOpenChange={(open) => {
    if (!open) {
      invalidateAll().then(() => {
        goto(resolve(`/events/${eventId}`));
      });
    }
  }}
>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Hết vé hoặc Phiên kết thúc</AlertDialog.Title>
      <AlertDialog.Description>
        Rất tiếc, sự kiện hiện đã hết vé hoặc phiên xếp hàng của bạn đã kết thúc. Hệ thống đã tự
        động hủy lượt xếp hàng của bạn.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Action
        onclick={async () => {
          await invalidateAll();
          goto(resolve(`/events/${eventId}`));
        }}
      >
        Quay lại trang sự kiện
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
