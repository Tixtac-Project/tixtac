<script lang="ts">
  import { Timer, ArrowLeft, LogOut } from 'lucide-svelte';
  import { queueStore } from '$lib/stores/queue.svelte';

  type Props = {
    formattedTime: string;
    onGoToSeats: () => void;
    onExitClick: () => void;
  };
  let { formattedTime, onGoToSeats, onExitClick }: Props = $props();
</script>

<div class="bg-orange-500 p-1.5 sm:p-4 text-white">
  <!-- ═══════════════════════════════════════════ -->
  <!-- MOBILE PILL VIEW (< 640px)                  -->
  <!-- ═══════════════════════════════════════════ -->
  <div class="flex items-center gap-2 sm:hidden pl-1 pr-0.5">
    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
      <Timer class="h-4 w-4" />
    </div>
    
    <span class="font-mono text-lg font-black">{formattedTime}</span>
    
    <div class="mx-1 h-5 w-px bg-white/20"></div>
    
    <button
      onclick={onGoToSeats}
      class="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition active:scale-95"
      title="Quay lại chọn ghế"
    >
      <ArrowLeft class="h-4 w-4 -rotate-180" />
    </button>

    <button
      onclick={onExitClick}
      class="flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white transition active:scale-95"
      title="Thoát phiên"
    >
      <LogOut class="h-4 w-4" />
    </button>
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
    <div class="flex gap-2">
      <button
        onclick={onGoToSeats}
        class="flex-1 rounded-xl bg-white py-2.5 text-xs font-bold text-orange-600 transition-all hover:bg-white/90 active:scale-95"
      >
        <ArrowLeft class="mr-1 inline-block h-3.5 w-3.5 -rotate-180" />
        Quay lại chọn ghế
      </button>
      <button
        onclick={onExitClick}
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/20 text-white transition hover:bg-black/30"
        title="Thoát phiên chọn ghế"
      >
        <LogOut class="h-4 w-4" />
      </button>
    </div>
  </div>
</div>
