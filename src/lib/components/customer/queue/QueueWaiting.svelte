<script lang="ts">
  import { Loader2, X, Maximize2 } from 'lucide-svelte';
  import { queueStore } from '$lib/stores/queue.svelte';

  type Props = {
    onExpand: () => void;
    onExitClick: () => void;
  };
  let { onExpand, onExitClick }: Props = $props();
</script>

<div class="bg-primary sm:bg-surface-container-highest p-2 sm:p-4 shadow-inner sm:shadow-none">
  <!-- ═══════════════════════════════════════════ -->
  <!-- MOBILE PILL VIEW (< 640px)                  -->
  <!-- ═══════════════════════════════════════════ -->
  <div class="flex items-center gap-3 sm:hidden pl-2 pr-1 text-white">
    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 shadow-sm">
      <Loader2 class="h-5 w-5 animate-spin text-white" />
    </div>
    <span class="font-mono text-xl font-black text-white drop-shadow-sm">#{queueStore.position}</span>
    
    <div class="mx-1 h-6 w-px bg-white/20"></div>
    
    <button
      onclick={onExpand}
      class="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white shadow-sm transition hover:bg-white/30 active:scale-95"
      title="Phóng to"
    >
      <Maximize2 class="h-5 w-5" />
    </button>
    
    <button
      onclick={onExitClick}
      class="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white shadow-sm transition hover:bg-red-500 hover:text-white active:scale-95"
      title="Hủy xếp hàng"
    >
      <X class="h-5 w-5" />
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
