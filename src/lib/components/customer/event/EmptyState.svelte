<script lang="ts">
  import { resolve } from '$app/paths';

  interface Props {
    icon?: string;
    title: string;
    description: string;
    ctaLabel?: string;
    ctaHref?: `/${string}`;
    onCtaClick?: () => void;
  }

  let {
    icon = '🎭',
    title,
    description,
    ctaLabel = 'Xóa tìm kiếm',
    ctaHref = '/',
    onCtaClick,
  }: Props = $props();
</script>

<div
  class="bento-card border-2 border-dashed border-border bg-muted/50 px-4 py-12 text-center sm:px-6 sm:py-20"
>
  <div class="mb-3 text-4xl sm:mb-4 sm:text-5xl">{icon}</div>

  <h3 class="mb-2 text-xl font-bold text-foreground sm:text-2xl">{title}</h3>

  <p class="mx-auto mb-6 max-w-md text-sm text-muted-foreground sm:mb-8 sm:text-base">
    {description}
  </p>

  {#if ctaLabel}
    <a
      href={resolve(ctaHref)}
      onclick={(e) => {
        if (onCtaClick) {
          e.preventDefault();
          onCtaClick();
        }
      }}
      class="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg sm:px-7 sm:py-3 sm:text-sm"
    >
      {ctaLabel}
      <svg class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 7l5 5m0 0l-5 5m5-5H6"
        />
      </svg>
    </a>
  {/if}
</div>
