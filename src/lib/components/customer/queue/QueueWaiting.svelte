<script lang="ts">
  import { Loader2, X, Maximize2 } from 'lucide-svelte';
  import { queueStore } from '$lib/stores/queue.svelte';

  type Props = {
    onExpand: () => void;
    onExitClick: () => void;
  };
  let { onExpand, onExitClick }: Props = $props();
</script>

<div class="bg-surface-container-highest p-1.5 sm:p-4">
  <!-- ═══════════════════════════════════════════ -->
  <!-- MOBILE PILL VIEW (< 640px)                  -->
  <!-- ═══════════════════════════════════════════ -->
  <div class="flex items-center gap-2 sm:hidden pl-1 pr-0.5">
    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
      <Loader2 class="h-4 w-4 animate-spin text-primary" />
    </div>
    <span class="font-mono text-lg font-black text-primary">#{queueStore.position}</span>
    
    <div class="mx-1 h-5 w-px bg-outline-variant/30"></div>
    
    <button
      onclick={onExpand}
      class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-muted-foreground transition active:scale-95"
      title="Phóng to"
    >
      <Maximize2 class="h-4 w-4" />
    </button>
    
    <button
      onclick={onExitClick}
      class="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive transition active:scale-95"
      title="Hủy xếp hàng"
    >
      <X class="h-4 w-4" />
    </button>
  </div>

  <!-- ═══════════════════════════════════════════ -->
  <!-- DESKTOP CARD VIEW (>= 640px)                -->
  <!-- ═══════════════════════════════════════════ -->
  <div class="hidden sm:block">
    <!-- Header -->
    <div class="mb-3 flex items-center gap-3">
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Loader2 class="h-5 w-5 animate-spin text-primary" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-[10px] font-bold tracking-widest text-primary uppercase">Đang xếp hàng</p>
        {#if queueStore.eventTitle}
          <p class="truncate text-xs font-semibold text-foreground">{queueStore.eventTitle}</p>
        {/if}
      </div>
    </div>

    <!-- Position badge -->
    <div class="mb-3 flex items-center justify-center gap-2 rounded-xl bg-surface-container p-3">
      <span class="text-sm text-muted-foreground">Vị trí của bạn:</span>
      <span class="text-2xl font-black text-primary">#{queueStore.position}</span>
    </div>

    <!-- Actions -->
    <div class="flex gap-2">
      <button
        onclick={onExpand}
        class="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
      >
        Phóng to phòng chờ
      </button>
      <button
        onclick={onExitClick}
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
        title="Hủy xếp hàng"
      >
        <X class="h-4 w-4" />
      </button>
    </div>
  </div>
</div>
