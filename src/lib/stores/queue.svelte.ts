// src/lib/stores/queue.svelte.ts
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
/** Represents the possible lifecycle states of a virtual queue session. */
export type QueueStatus = 'idle' | 'waiting' | 'ready' | 'holding' | 'missed';

class QueueStore {
  eventId = $state<number | null>(null);
  eventTitle = $state<string>('');
  showId = $state<number | null>(null);
  status = $state<QueueStatus>('idle');
  position = $state<number>(0);
  /** Unix timestamp (ms) — deadline for the grace period or holding session. */
  expiresAt = $state<number | null>(null);
  isMinimized = $state<boolean>(false);
  token = $state<string | null>(null);
  /**
   * Staged confirm payload — prevents the orange widget from flashing during
   * navigation to the seats page. The seats page commits this on mount.
   */
  pendingConfirm = $state<{ expiresAt: number; token?: string } | null>(null);

  private initialized = false;

  init() {
    if (!browser || this.initialized) return;
    this.initialized = true;

    const saved = localStorage.getItem('tixtac_queue');
    const savedToken = sessionStorage.getItem('tixtac_queue_token');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.eventId = data.eventId ?? null;
        this.eventTitle = data.eventTitle ?? '';
        this.showId = data.showId ?? null;
        this.status = data.status ?? 'idle';
        this.position = data.position ?? 0;
        this.expiresAt = data.expiresAt ?? null;
        this.isMinimized = data.isMinimized ?? false;
        this.token = savedToken ?? null;

        // If the session expired while the page was closed, reset to idle on restore.
        if (
          this.expiresAt &&
          Date.now() > this.expiresAt &&
          (this.status === 'ready' || this.status === 'holding')
        ) {
          this.clear();
        }
      } catch (e) {
        console.error('Lỗi parse queue state:', e);
        localStorage.removeItem('tixtac_queue');
      }
    }

    $effect.root(() => {
      /** Sync reactive state to localStorage on every change. */
      $effect(() => {
        localStorage.setItem(
          'tixtac_queue',
          JSON.stringify({
            eventId: this.eventId,
            eventTitle: this.eventTitle,
            showId: this.showId,
            status: this.status,
            position: this.position,
            expiresAt: this.expiresAt,
            isMinimized: this.isMinimized,
            // Exclude token from localStorage to mitigate XSS exposure
          }),
        );
        if (this.token) {
          sessionStorage.setItem('tixtac_queue_token', this.token);
          if (browser) {
            const expires = this.expiresAt ? new Date(this.expiresAt).toUTCString() : '';
            const secure = location.protocol === 'https:' ? '; Secure' : '';
            document.cookie = `tixtac_queue_token=${this.token}; ${expires ? `expires=${expires}; ` : ''}path=/; SameSite=Lax${secure}`;
          }
        } else {
          sessionStorage.removeItem('tixtac_queue_token');
          if (browser) {
            const secure = location.protocol === 'https:' ? '; Secure' : '';
            document.cookie = `tixtac_queue_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax${secure}`;
          }
        }
      });
    });
  }

  clear() {
    this.eventId = null;
    this.eventTitle = '';
    this.showId = null;
    this.status = 'idle';
    this.position = 0;
    this.expiresAt = null;
    this.token = null;
    this.isMinimized = false;
    this.pendingConfirm = null;
    if (browser) {
      localStorage.removeItem('tixtac_queue');
      sessionStorage.removeItem('tixtac_queue_token');
      const secure = location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `tixtac_queue_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax${secure}`;
    }
  }

  /**
   * Stages confirm data after a successful `/confirm` API call.
   * Does NOT immediately set `status` to `'holding'` to avoid the orange
   * widget flash during navigation. The seats page commits this on mount.
   *
   * @param expiresAt - Unix timestamp (ms) when the holding session expires.
   * @param token     - Signed seat-access token for the holding session.
   */
  setPendingConfirm(expiresAt: number, token?: string) {
    this.pendingConfirm = { expiresAt, token };
  }

  /**
   * Commits the staged confirm data and transitions status to `'holding'`.
   * Called from `seats/+page.svelte` on component mount.
   */
  commitHolding() {
    if (this.pendingConfirm) {
      this.status = 'holding';
      this.expiresAt = this.pendingConfirm.expiresAt;
      this.token = this.pendingConfirm.token ?? null;
      this.pendingConfirm = null;
    }
  }

  /**
   * Leaves the queue: calls the DELETE API, clears local state, then optionally
   * navigates back to the event page (or home if eventId is unavailable).
   */
  async leave(options?: { navigate?: boolean }) {
    const shouldNavigate = options?.navigate ?? true;
    const eventId = this.eventId;

    if (browser && eventId) {
      // Must await the DELETE request before clearing state or navigating,
      // otherwise the browser may cancel the pending fetch during page transition.
      await fetch(`/api/events/${eventId}/queue`, { method: 'DELETE' }).catch((err) => {
        console.error('Failed to leave queue on server:', err);
      });
    }

    this.clear();

    if (browser && shouldNavigate) {
      if (eventId) {
        goto(resolve(`/events/${eventId}`));
      } else {
        goto(resolve('/'));
      }
    }
  }

  /**
   * Checks whether the user is currently queued for a *different* event.
   *
   * @param targetEventId - The event the user is attempting to join.
   * @returns `true` if a cross-queue conflict exists and the confirmation modal should be shown.
   */
  hasConflict(targetEventId: number): boolean {
    return (
      this.eventId !== null &&
      this.eventId !== targetEventId &&
      this.status !== 'idle' &&
      this.status !== 'missed'
    );
  }

  /**
   * Leaves the current queue without navigating, freeing the slot so the
   * user can immediately join a different event's queue.
   */
  async leaveForNewEvent() {
    const oldEventId = this.eventId;
    if (browser && oldEventId) {
      // Await server-side cleanup before clearing local state
      await fetch(`/api/events/${oldEventId}/queue`, { method: 'DELETE' }).catch(() => {});
    }
    this.clear();
  }
}

export const queueStore = new QueueStore();
