<script lang="ts">
  import { page } from '$app/state';
  import { Check } from 'lucide-svelte';

  let { children } = $props();

  const steps = [
    { label: 'Thông tin cơ bản', path: '/admin/events/create' },
    { label: 'Suất diễn', path: '/admin/events/create/shows' },
    { label: 'Sơ đồ ghế', path: '/admin/events/create/seatmap' },
  ] as const;

  // Determine current step from URL
  const currentStepIndex = $derived.by(() => {
    const pathname = page.url.pathname;
    if (pathname.endsWith('/seatmap')) return 2;
    if (pathname.endsWith('/shows')) return 1;
    return 0;
  });
</script>

<div class="mx-auto max-w-4xl space-y-6 md:space-y-8">
  <!-- Step indicator -->
  <div class="bento-card">
    <nav aria-label="Tiến trình tạo sự kiện">
      <ol class="flex items-center gap-2">
        {#each steps as step, i (step.path)}
          {@const isCompleted = i < currentStepIndex}
          {@const isCurrent = i === currentStepIndex}
          {@const isFuture = i > currentStepIndex}

          {#if i > 0}
            <li class="flex-1" aria-hidden="true">
              <div
                class="h-0.5 w-full rounded-full transition-colors duration-300
                  {isCompleted ? 'bg-primary' : 'bg-border'}"
              ></div>
            </li>
          {/if}

          <li class="flex items-center gap-2">
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300
                {isCompleted
                ? 'bg-primary text-primary-foreground'
                : isCurrent
                  ? 'border-2 border-primary bg-primary/10 text-primary'
                  : 'border border-border bg-muted text-muted-foreground'}"
            >
              {#if isCompleted}
                <Check class="h-4 w-4" />
              {:else}
                {i + 1}
              {/if}
            </div>
            <span
              class="hidden text-sm font-medium md:inline
                {isCurrent
                ? 'text-foreground'
                : isCompleted
                  ? 'text-primary'
                  : 'text-muted-foreground'}"
            >
              {step.label}
            </span>
          </li>
        {/each}
      </ol>
    </nav>
  </div>

  {@render children()}
</div>
