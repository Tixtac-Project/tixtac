<!-- src/lib/components/customer/queue/CrossQueueModal.svelte -->
<script lang="ts">
  import { AlertTriangle, ArrowRight, X } from 'lucide-svelte';

  interface Props {
    open: boolean;
    currentEventTitle: string;
    newEventTitle: string;
    onStay: () => void;
    onLeaveAndJoin: () => void;
  }

  let { open, currentEventTitle, newEventTitle, onStay, onLeaveAndJoin }: Props = $props();
</script>

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-[60] flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="cross-queue-title"
  >
    <!-- Overlay -->
    <button
      class="absolute inset-0 bg-black/60 backdrop-blur-sm"
      onclick={onStay}
      aria-label="Đóng"
    ></button>

    <!-- Modal Card -->
    <div
      class="relative z-10 w-full max-w-md animate-in overflow-hidden rounded-2xl bg-surface shadow-2xl duration-200 zoom-in-95 slide-in-from-bottom-4"
    >
      <!-- Header -->
      <div class="flex items-start gap-4 bg-amber-500/10 p-6 pb-5">
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-600"
        >
          <AlertTriangle class="h-6 w-6" />
        </div>
        <div class="flex-1 pr-6">
          <h2 id="cross-queue-title" class="font-heading text-lg font-bold text-foreground">
            Đang xếp hàng sự kiện khác
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Bạn chỉ có thể xếp hàng một sự kiện tại một thời điểm.
          </p>
        </div>
        <button
          onclick={onStay}
          class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-surface-container-high hover:text-foreground"
          aria-label="Đóng"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Body -->
      <div class="space-y-3 p-6">
        <!-- Current queue -->
        <div class="rounded-xl border border-outline-variant/40 bg-surface-container-low p-4">
          <p class="mb-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            Đang xếp hàng
          </p>
          <p class="line-clamp-2 font-semibold text-foreground">{currentEventTitle}</p>
        </div>

        <!-- Arrow -->
        <div class="flex justify-center text-muted-foreground">
          <ArrowRight class="h-5 w-5 rotate-90" />
        </div>

        <!-- New queue -->
        <div class="rounded-xl border border-primary/30 bg-primary-container/10 p-4">
          <p class="mb-1 text-[10px] font-bold tracking-widest text-primary uppercase">
            Muốn tham gia
          </p>
          <p class="line-clamp-2 font-semibold text-foreground">{newEventTitle}</p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-3 px-6 pb-6">
        <button
          onclick={onLeaveAndJoin}
          class="w-full rounded-xl bg-gradient-to-br from-primary to-primary/80 px-6 py-3.5 font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90 active:scale-95"
        >
          Rời cũ & Tham gia mới
        </button>
        <button
          onclick={onStay}
          class="w-full rounded-xl bg-surface-container-highest px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-surface-container-high active:scale-95"
        >
          Ở lại hàng chờ hiện tại
        </button>
      </div>
    </div>
  </div>
{/if}
