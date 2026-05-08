<script lang="ts">
  import { AlertCircle, ArrowRight } from 'lucide-svelte';
  import { slide } from 'svelte/transition';
  import { queueStore } from '$lib/stores/queue.svelte';

  type Props = {
    isDocked?: boolean;
    onUndock?: () => void;
    formattedTime: string;
    onGoToSeats: () => void;
  };
  let { isDocked = false, onUndock, formattedTime, onGoToSeats }: Props = $props();
</script>

<div class="bg-emerald-600 p-2 sm:p-4 text-white shadow-inner sm:shadow-none">
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
        <AlertCircle class="h-5 w-5 text-green-600" />
      </div>
      
      <span class="font-mono text-xl font-black drop-shadow-sm">{formattedTime}</span>
    </button>
    
    {#if !isDocked}
      <div class="flex items-center gap-3 overflow-hidden pl-3" transition:slide={{ axis: 'x', duration: 250 }}>
        <div class="h-6 w-px bg-white/20 shrink-0"></div>
        
        <button
          onclick={onGoToSeats}
          class="action-btn flex h-10 w-auto px-4 shrink-0 items-center justify-center gap-1.5 rounded-full bg-white text-sm font-bold text-emerald-700 animate-pulse shadow-md transition active:scale-95"
        >
          CHỌN GHẾ
          <ArrowRight class="h-4 w-4" />
        </button>
      </div>
    {/if}
  </div>

  <!-- ═══════════════════════════════════════════ -->
  <!-- DESKTOP CARD VIEW (>= 640px)                -->
  <!-- ═══════════════════════════════════════════ -->
  <div class="hidden sm:block relative">
    <!-- Pulse ring decoration -->
    <div class="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
    
    <div class="mb-3 flex items-center gap-3">
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
        <AlertCircle class="h-5 w-5" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-[10px] font-bold tracking-widest uppercase opacity-80">Đã tới lượt!</p>
        {#if queueStore.eventTitle}
          <p class="truncate text-xs font-semibold">{queueStore.eventTitle}</p>
        {/if}
      </div>
    </div>

    <!-- Countdown -->
    <div class="mb-3 text-center">
      <p class="text-xs opacity-80">Xác nhận trong vòng</p>
      <p class="font-mono text-4xl font-black tabular-nums">{formattedTime}</p>
    </div>

    <button
      onclick={onGoToSeats}
      class="action-btn w-full animate-pulse rounded-xl bg-white py-3 text-sm font-bold text-emerald-700 shadow-lg shadow-black/20 transition-all hover:animate-none hover:bg-white/90 active:scale-95"
    >
      VÀO CHỌN GHẾ NGAY →
    </button>
  </div>
</div>
