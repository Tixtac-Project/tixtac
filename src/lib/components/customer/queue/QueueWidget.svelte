<!-- src/lib/components/customer/queue/QueueWidget.svelte -->
<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { queueStore } from '$lib/stores/queue.svelte';
  import { fly } from 'svelte/transition';
  import { tick } from 'svelte';
  import QueueWaiting from './QueueWaiting.svelte';
  import QueueReady from './QueueReady.svelte';
  import QueueHolding from './QueueHolding.svelte';

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
          queueStore.leave({ navigate: false });
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
    if (eventId) goto(resolve(`/events/${eventId}/queue`));
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
          // Stage the confirm data
          queueStore.setPendingConfirm(data.expiresAt, data.token);

          if (showId) {
            goto(resolve(`/events/${eventId}/shows/${showId}/seats`));
          } else {
            goto(resolve(`/events/${eventId}`));
          }
          return;
        } else {
          console.error('[Widget] Confirm failed: Server rejected');
          alert(
            'Không thể xác nhận slot. Có thể phiên của bạn đã hết hạn. Vui lòng tải lại trang!',
          );
          return;
        }
      } catch (err) {
        console.error('[Widget] Confirm Error:', err);
        alert('Lỗi kết nối mạng. Vui lòng thử lại!');
        return;
      }
    }

    if (queueStore.status === 'holding') {
      if (showId && eventId) {
        goto(resolve(`/events/${eventId}/shows/${showId}/seats`));
      } else if (eventId) {
        goto(resolve(`/events/${eventId}`));
      }
    }
  }

  async function handleLeave() {
    if (isLeaving) return;
    isLeaving = true;
    try {
      await queueStore.leave();
      showExitConfirm = false;
    } finally {
      isLeaving = false;
    }
  }

  // --- Drag and Drop State ---
  let isDragging = $state(false);
  let hasMoved = $state(false);
  let dragOffset = $state({ x: 0, y: 0 });
  let startPointer = { x: 0, y: 0 };
  let startOffset = { x: 0, y: 0 };
  let widgetEl: HTMLElement | undefined = $state();

  // --- Docking State ---
  let isDocked = $state(false);
  let anchorSide = $state<'left' | 'right'>('right');
  let disableTransition = $state(false);

  // Auto-undock when status changes
  let prevStatus = $state(queueStore.status);
  $effect(() => {
    if (queueStore.status !== prevStatus) {
      if (queueStore.status !== 'idle' && queueStore.status !== 'missed') {
        isDocked = false; // Auto pop-out on status change
      }
      prevStatus = queueStore.status;
    }
  });

  function handleUndock() {
    isDocked = false;
  }

  function handlePointerDown(e: PointerEvent) {
    // Only allow left click dragging and ignore clicks on buttons
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('.action-btn')) return;

    isDragging = true;
    hasMoved = false;
    startPointer = { x: e.clientX, y: e.clientY };
    startOffset = { ...dragOffset };

    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging || !widgetEl) return;

    const dx = e.clientX - startPointer.x;
    const dy = e.clientY - startPointer.y;

    if (!hasMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      hasMoved = true;
    }

    if (!hasMoved) return;

    e.preventDefault(); // Prevent text selection/scrolling while dragging

    let newX = startOffset.x + dx;
    let newY = startOffset.y + dy;

    // Boundary constraints based on responsive padding
    const isMobile = window.innerWidth < 640;
    const paddingX = isMobile ? 16 : 20; // right-4 vs right-5
    const paddingBottom = isMobile ? 96 : 20; // bottom-24 (96px) vs bottom-5 (20px) to avoid mobile bottom navigation
    const paddingTop = isMobile ? 60 : 80;
    const widgetWidth = widgetEl.offsetWidth;

    const baseLeft = window.innerWidth - paddingX * 2 - widgetWidth;
    const baseTop = window.innerHeight - paddingBottom - widgetEl.offsetHeight;

    let minX, maxX;
    if (anchorSide === 'right') {
      minX = -baseLeft; // touches left padding limit
      maxX = 0; // touches right padding limit
    } else {
      minX = 0; // touches left padding limit
      maxX = baseLeft; // touches right padding limit
    }

    // Ensure top padding to avoid header
    const minY = -(baseTop - paddingTop);
    const maxY = 0; // touches bottom padding limit

    const safeMinX = Math.min(minX, maxX);
    const safeMaxX = Math.max(minX, maxX);
    const safeMinY = Math.min(minY, maxY);
    const safeMaxY = Math.max(minY, maxY);

    newX = Math.max(safeMinX, Math.min(newX, safeMaxX));
    newY = Math.max(safeMinY, Math.min(newY, safeMaxY));

    dragOffset = { x: newX, y: newY };
  }

  function handlePointerUp(e: PointerEvent) {
    if (!isDragging) return;
    isDragging = false;
    const el = e.currentTarget as HTMLElement;
    el.releasePointerCapture(e.pointerId);

    if (!widgetEl) return;

    if (!hasMoved) {
      // It was just a tap, do not execute docking logic
      return;
    }

    // iPhone AssistiveTouch Snapping Logic
    // Snap to the nearest vertical edge (Left or Right)
    const isMobile = window.innerWidth < 640;
    const paddingX = isMobile ? 16 : 20;
    const widgetWidth = widgetEl.offsetWidth;

    const baseLeft = window.innerWidth - paddingX * 2 - widgetWidth;
    let minX, maxX;
    if (anchorSide === 'right') {
      minX = -baseLeft;
      maxX = 0;
    } else {
      minX = 0;
      maxX = baseLeft;
    }

    const safeMinX = Math.min(minX, maxX);
    const safeMaxX = Math.max(minX, maxX);

    const midX = (safeMinX + safeMaxX) / 2;
    const targetX = dragOffset.x > midX ? safeMaxX : safeMinX;

    dragOffset = {
      x: targetX,
      y: dragOffset.y, // keep current Y
    };

    if (isMobile) {
      if (anchorSide === 'right' && targetX === safeMinX) {
        // Snapped to left edge
        setTimeout(async () => {
          disableTransition = true;
          anchorSide = 'left';
          dragOffset.x = 0;
          await tick(); // Wait for Svelte to apply state to DOM
          void widgetEl?.offsetHeight; // Force browser reflow to apply styles synchronously
          disableTransition = false;
          isDocked = true;
        }, 500); // Wait for transform animation
      } else if (anchorSide === 'left' && targetX === safeMaxX) {
        // Snapped to right edge
        setTimeout(async () => {
          disableTransition = true;
          anchorSide = 'right';
          dragOffset.x = 0;
          await tick();
          void widgetEl?.offsetHeight;
          disableTransition = false;
          isDocked = true;
        }, 500);
      } else {
        // Snapped back to current edge
        setTimeout(() => {
          isDocked = true;
        }, 500);
      }
    }
  }
</script>

{#if shouldShow}
  <div
    transition:fly={{ y: 20, duration: 300 }}
    class="fixed bottom-24 z-50 w-max sm:!right-5 sm:bottom-5 sm:!left-auto sm:w-[320px]"
    style={anchorSide === 'left' ? 'left: 16px; right: auto;' : 'right: 16px; left: auto;'}
  >
    <div
      bind:this={widgetEl}
      role="none"
      class="w-full overflow-hidden rounded-full ring-1 ring-black/10 backdrop-blur-sm sm:rounded-2xl
             {isDragging ? 'cursor-grabbing shadow-2xl ring-black/20' : 'cursor-grab shadow-xl'}"
      style="
        transform: translate({dragOffset.x}px, {dragOffset.y}px) scale({isDragging ? 1.02 : 1});
        touch-action: none;
        transition: {isDragging || disableTransition
        ? 'none'
        : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease'};
      "
      onpointerdown={handlePointerDown}
      onpointermove={handlePointerMove}
      onpointerup={handlePointerUp}
      onpointercancel={handlePointerUp}
    >
      {#if queueStore.status === 'waiting'}
        <QueueWaiting
          {isDocked}
          onUndock={handleUndock}
          onExpand={expandQueue}
          onExitClick={() => (showExitConfirm = true)}
        />
      {:else if queueStore.status === 'ready'}
        <QueueReady
          {isDocked}
          onUndock={handleUndock}
          formattedTime={formatTime(timeLeft)}
          onGoToSeats={goToSeats}
        />
      {:else if queueStore.status === 'holding'}
        <QueueHolding
          {isDocked}
          onUndock={handleUndock}
          formattedTime={formatTime(timeLeft)}
          onGoToSeats={goToSeats}
          onExitClick={() => (showExitConfirm = true)}
        />
      {/if}
    </div>
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
