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
  background: oklch(96.5% 0.015 {hue});
  border: 1px solid oklch(92% 0.02 {hue});
"
  {...restProps}
>
  <!-- Decorative blob -->
  <div
    class="absolute -top-5 -right-5 h-16 w-16 rounded-full"
    style="background: oklch(88% 0.05 {hue} / 40%); filter: blur(12px);"
  ></div>

  <div class="relative">
    <!-- Accent bar -->
    <div
      class="mb-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5"
      style="background: oklch(88% 0.06 {hue} / 50%);"
    >
      <div class="h-1.5 w-1.5 rounded-full" style="background: oklch(55% 0.15 {hue});"></div>
      <span
        class="text-[10px] font-semibold tracking-wider uppercase"
        style="color: oklch(45% 0.12 {hue});"
      >
        {label}
      </span>
    </div>

    <p class="text-3xl font-extrabold tracking-tighter text-foreground">{value}</p>

    {#if subtitle}
      <p class="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
    {/if}
  </div>
</div>
