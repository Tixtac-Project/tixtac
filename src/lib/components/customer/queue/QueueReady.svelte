<script lang="ts">
  import { AlertCircle } from 'lucide-svelte';
  import { queueStore } from '$lib/stores/queue.svelte';

  interface Props {
    formattedTime: string;
    onGoToSeats: () => void;
  }
  let { formattedTime, onGoToSeats }: Props = $props();
</script>

<div class="bg-emerald-600 p-4 text-white">
  <!-- Pulse ring decoration -->
  <div class="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>

  <div class="relative">
    <div class="mb-3 flex items-center gap-3">
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
        <AlertCircle class="h-5 w-5" />
      </div>
      <div>
        <p class="text-[10px] font-bold tracking-widest uppercase opacity-80">Đã tới lượt!</p>
        {#if queueStore.eventTitle}
          <p class="max-w-[180px] truncate text-xs font-semibold">{queueStore.eventTitle}</p>
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
