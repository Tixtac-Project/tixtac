<script lang="ts">
  import { Timer, ArrowLeft, LogOut } from 'lucide-svelte';
  import { slide } from 'svelte/transition';
  import { queueStore } from '$lib/stores/queue.svelte';

  type Props = {
    isDocked?: boolean;
    onUndock?: () => void;
    formattedTime: string;
    onGoToSeats: () => void;
    onExitClick: () => void;
  };
  let { isDocked = false, onUndock, formattedTime, onGoToSeats, onExitClick }: Props = $props();
</script>

<div class="bg-orange-500 p-2 sm:p-4 text-white shadow-inner sm:shadow-none">
  <!-- ═══════════════════════════════════════════ -->
  <!-- MOBILE PILL VIEW (< 640px)                  -->
  <!-- ═══════════════════════════════════════════ -->
  <div class="flex items-center sm:hidden text-white">
    <!-- Clickable area to undock when docked -->
    <button 
      class="flex items-center gap-3"
      onclick={isDocked ? onUndock : undefined}
      aria-label={isDocked ? "Mở rộng widget" : undefined}
    >
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-md">
        <Timer class="h-5 w-5 text-orange-600" />
      </div>
      
      <span class="font-mono text-xl font-black drop-shadow-sm">{formattedTime}</span>
    </button>
    
    {#if !isDocked}
      <div class="flex items-center gap-3 overflow-hidden pl-3" transition:slide={{ axis: 'x', duration: 250 }}>
        <div class="h-6 w-px bg-white/20 shrink-0"></div>
        
        <button
          onclick={onGoToSeats}
          class="action-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white shadow-sm transition active:scale-95"
          title="Quay lại chọn ghế"
        >
          <ArrowLeft class="h-5 w-5" />
        </button>
        
        <button
          onclick={onExitClick}
          class="action-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white shadow-sm transition hover:bg-red-500 hover:text-white active:scale-95"
          title="Hủy xếp hàng"
        >
          <LogOut class="h-5 w-5" />
        </button>
      </div>
    {/if}
  </div>

  <!-- ═══════════════════════════════════════════ -->
  <!-- DESKTOP CARD VIEW (>= 640px)                -->
  <!-- ═══════════════════════════════════════════ -->
  <div class="hidden sm:block relative">
    <!-- Decoration -->
    <div class="absolute -top-10 -left-10 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
    
    <div class="mb-3 flex items-center gap-3">
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
        <Timer class="h-5 w-5" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-[10px] font-bold tracking-widest uppercase opacity-80">Phiên chọn ghế</p>
        {#if queueStore.eventTitle}
          <p class="truncate text-xs font-semibold">{queueStore.eventTitle}</p>
        {/if}
      </div>
    </div>

    <!-- Countdown -->
    <div class="mb-3 flex items-center justify-between rounded-xl bg-black/20 px-4 py-2.5">
      <span class="text-xs opacity-80">Hết hạn sau:</span>
      <span class="font-mono text-2xl font-black tabular-nums">{formattedTime}</span>
    </div>

    <!-- Actions -->
    <div transition:slide>
      <div class="flex gap-2">
        <button
          onclick={onGoToSeats}
          class="action-btn flex-1 rounded-xl bg-white py-2.5 text-xs font-bold text-orange-600 transition-all hover:bg-white/90 active:scale-95"
        >
          Quay lại chọn ghế
        </button>
        <button
          onclick={onExitClick}
          class="action-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white transition hover:bg-red-500 hover:text-white"
          title="Hủy xếp hàng"
        >
          <LogOut class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</div>
