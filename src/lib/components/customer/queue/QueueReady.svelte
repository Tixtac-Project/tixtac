<script lang="ts">
  import { AlertCircle, ArrowRight } from 'lucide-svelte';
  import { queueStore } from '$lib/stores/queue.svelte';

  type Props = {
    formattedTime: string;
    onGoToSeats: () => void;
  };
  let { formattedTime, onGoToSeats }: Props = $props();
</script>

<div class="bg-emerald-600 p-1.5 sm:p-4 text-white">
  <!-- ═══════════════════════════════════════════ -->
  <!-- MOBILE PILL VIEW (< 640px)                  -->
  <!-- ═══════════════════════════════════════════ -->
  <div class="flex items-center gap-2 sm:hidden pl-1 pr-0.5">
    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
      <AlertCircle class="h-4 w-4" />
    </div>
    
    <span class="font-mono text-lg font-black">{formattedTime}</span>
    
    <div class="mx-1 h-5 w-px bg-white/20"></div>
    
    <button
      onclick={onGoToSeats}
      class="flex h-8 w-auto px-3 items-center justify-center gap-1.5 rounded-full bg-white text-xs font-bold text-emerald-700 animate-pulse transition active:scale-95"
    >
      CHỌN GHẾ
      <ArrowRight class="h-3 w-3" />
    </button>
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
      class="w-full animate-pulse rounded-xl bg-white py-3 text-sm font-bold text-emerald-700 shadow-lg shadow-black/20 transition-all hover:animate-none hover:bg-white/90 active:scale-95"
    >
      VÀO CHỌN GHẾ NGAY →
    </button>
  </div>
</div>
