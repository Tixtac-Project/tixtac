<script lang="ts">
  import { Loader2, X } from 'lucide-svelte';
  import { queueStore } from '$lib/stores/queue.svelte';

  interface Props {
    onExpand: () => void;
    onExitClick: () => void;
  }
  let { onExpand, onExitClick }: Props = $props();
</script>

<div class="bg-surface-container-highest p-4">
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
