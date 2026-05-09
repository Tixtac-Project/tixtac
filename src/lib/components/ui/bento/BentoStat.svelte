<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    label,
    value,
    subtitle = '',
    hue = 265,
    class: className = '',
    ...restProps
  }: HTMLAttributes<HTMLDivElement> & {
    label: string;
    value: string | number;
    subtitle?: string;
    hue?: number;
  } = $props();
</script>

<div
  class="bento-stat bento-fade-in {className}"
  style="
    --stat-hue: {hue};
    background: oklch(from var(--surface-container-lowest) l calc(c + 0.01) h);
    border: 1px solid oklch(from var(--border) l c h);
  "
  {...restProps}
>
  <!-- Decorative blob -->
  <div
    class="absolute -top-5 -right-5 h-16 w-16 rounded-full"
    style="background: oklch(58% 0.08 var(--stat-hue) / 15%); filter: blur(12px);"
  ></div>

  <div class="relative">
    <!-- Accent bar -->
    <div
      class="mb-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5"
      style="background: oklch(58% 0.1 var(--stat-hue) / 12%);"
    >
      <div
        class="h-1.5 w-1.5 rounded-full"
        style="background: oklch(58% 0.16 var(--stat-hue));"
      ></div>
      <span class="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </span>
    </div>

    <p class="text-xl font-extrabold tracking-tighter text-foreground md:text-2xl lg:text-3xl">
      {value}
    </p>

    {#if subtitle}
      <p class="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
    {/if}
  </div>
</div>
