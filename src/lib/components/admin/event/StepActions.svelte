<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { Button } from '$lib/components/ui/button';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import { ArrowLeft, ArrowRight, Loader } from 'lucide-svelte';

  let {
    isValid = false,
    loading = false,
    issues = [],
    backHref = '',
    backLabel = 'Quay lại',
    submitLabel = 'Tiếp tục',
    submitType = 'submit',
    showArrow = true,
    onsubmit,
    extraLeft,
    extraRight,
  }: {
    isValid: boolean;
    loading?: boolean;
    issues: string[];
    backHref: string;
    backLabel?: string;
    submitLabel?: string;
    submitType?: 'submit' | 'button';
    showArrow?: boolean;
    onsubmit?: () => void;
    extraLeft?: import('svelte').Snippet;
    extraRight?: import('svelte').Snippet;
  } = $props();
</script>

<div class="bento-card flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-between">
  <div class="hidden md:block">
    {#if !isValid && issues.length > 0}
      <p class="text-xs text-muted-foreground">
        ⚠️ {issues.length} vấn đề cần khắc phục
      </p>
    {:else if isValid}
      <p class="text-xs text-success">✓ Sẵn sàng tiếp tục</p>
    {/if}
    {#if extraLeft}
      {@render extraLeft()}
    {/if}
  </div>

  <div class="flex flex-col-reverse gap-2 md:flex-row md:items-center">
    <Button
      type="button"
      variant="ghost"
      class="w-full md:w-auto"
      onclick={() => goto(resolve(backHref))}
    >
      <ArrowLeft class="mr-2 h-4 w-4" />
      {backLabel}
    </Button>

    {#if extraRight}
      {@render extraRight()}
    {/if}

    {#if !isValid && issues.length > 0}
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props })}
              <span {...props} class="inline-flex w-full md:w-auto">
                <Button type="button" class="w-full gap-2 md:w-auto" disabled>
                  {submitLabel}
                  {#if showArrow}
                    <ArrowRight class="h-4 w-4" />
                  {/if}
                </Button>
              </span>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="top" class="max-w-xs">
            <p class="mb-1 text-xs font-semibold">Chưa thể tiếp tục:</p>
            <ul class="list-inside list-disc space-y-0.5 text-xs">
              {#each issues.slice(0, 5) as issue, i (`${issue}-${i}`)}
                <li>{issue}</li>
              {/each}
              {#if issues.length > 5}
                <li>… và {issues.length - 5} lỗi khác</li>
              {/if}
            </ul>
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    {:else}
      <Button
        type={submitType}
        class="w-full gap-2 md:w-auto"
        disabled={loading}
        onclick={submitType === 'button' ? onsubmit : undefined}
      >
        {#if loading}
          <Loader class="h-4 w-4 animate-spin" />
        {:else}
          {submitLabel}
          {#if showArrow}
            <ArrowRight class="h-4 w-4" />
          {/if}
        {/if}
      </Button>
    {/if}
  </div>
</div>
