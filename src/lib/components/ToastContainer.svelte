<script lang="ts">
  import { toast, type ToastType } from '$lib/stores/toast';
  import { fade, fly } from 'svelte/transition';

  const icons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  const variantClass: Record<ToastType, string> = {
    success: 'border-success-border bg-success-muted text-success-muted-foreground',
    error: 'border-danger-border bg-danger-muted text-danger-muted-foreground',
    warning: 'border-warning-border bg-warning-muted text-warning-muted-foreground',
    info: 'border-info-border bg-info-muted/40 text-info-muted-foreground',
  };

  const iconClass: Record<ToastType, string> = {
    success: 'bg-success text-success-foreground',
    error: 'bg-danger text-danger-foreground',
    warning: 'bg-warning text-warning-foreground',
    info: 'bg-info text-info-foreground',
  };
</script>

<div
  class="fixed top-4 left-1/2 z-[9999] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2 md:right-4 md:left-auto md:w-80 md:translate-x-0"
  role="region"
  aria-label="Thông báo"
>
  {#each $toast as t (t.id)}
    <div
      class="flex w-full items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm {variantClass[
        t.type
      ]}"
      in:fly={{ x: 300, duration: 300, opacity: 0 }}
      out:fade={{ duration: 200 }}
      role={t.type === 'error' ? 'alert' : 'status'}
      aria-live={t.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <span
        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold {iconClass[
          t.type
        ]}"
        aria-hidden="true"
      >
        {icons[t.type]}
      </span>
      <span class="flex-1 text-sm leading-snug font-medium">{t.message}</span>
      <button
        class="shrink-0 rounded-lg p-1 opacity-50 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-current"
        onclick={() => toast.remove(t.id)}
        aria-label="Đóng thông báo"
      >
        ✕
      </button>
    </div>
  {/each}
</div>
