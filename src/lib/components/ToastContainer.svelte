<script lang="ts">
  import { toast, type ToastType } from '$lib/stores/toast';
  import { fade, fly } from 'svelte/transition';

  const icons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  const styles: Record<ToastType, string> = {
    success:
      'border-green-500/40 bg-green-50 text-green-900 dark:bg-green-950/50 dark:text-green-100',
    error: 'border-red-500/40 bg-red-50 text-red-900 dark:bg-red-950/50 dark:text-red-100',
    warning:
      'border-yellow-500/40 bg-yellow-50 text-yellow-900 dark:bg-yellow-950/50 dark:text-yellow-100',
    info: 'border-blue-500/40 bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100',
  };

  const iconStyles: Record<ToastType, string> = {
    success: 'bg-green-500/20 text-green-700 dark:text-green-300',
    error: 'bg-red-500/20 text-red-700 dark:text-red-300',
    warning: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
    info: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  };

  const liveRegion: Record<ToastType, 'polite' | 'assertive'> = {
    success: 'polite',
    error: 'assertive',
    warning: 'polite',
    info: 'polite',
  };
</script>

<div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2" role="region" aria-label="Thông báo">
  {#each $toast as t (t.id)}
    <div
      class="flex w-[340px] items-center gap-3 rounded-lg border px-4 py-3 shadow-md {styles[
        t.type
      ]}"
      in:fly={{ x: 300, duration: 300 }}
      out:fade={{ duration: 200 }}
      role="alert"
      aria-live={liveRegion[t.type]}
      aria-atomic="true"
    >
      <span
        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold {iconStyles[
          t.type
        ]}"
        aria-hidden="true"
      >
        {icons[t.type]}
      </span>
      <span class="flex-1 text-sm">{t.message}</span>
      <button
        class="shrink-0 rounded p-0.5 opacity-50 transition-opacity hover:opacity-100"
        onclick={() => toast.remove(t.id)}
        aria-label="Đóng thông báo"
      >
        ✕
      </button>
    </div>
  {/each}
</div>
