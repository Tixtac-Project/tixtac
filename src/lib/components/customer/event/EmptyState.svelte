<script lang="ts">
  import { resolve } from '$app/paths';

  interface Props {
    icon?: string;
    title: string;
    description: string;
    ctaLabel?: string;
    ctaHref?: string;
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

<div class="rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-20 text-center">
  <div class="mb-4 text-5xl">{icon}</div>

  <h3 class="mb-2 text-2xl font-bold text-slate-900">{title}</h3>

  <p class="mx-auto mb-8 max-w-md text-slate-600">{description}</p>

  {#if ctaLabel}
    <a
      href={resolve((ctaHref || '/') as any)}
      onclick={(e) => {
        if (onCtaClick) {
          e.preventDefault();
          onCtaClick();
        }
      }}
      class="inline-flex items-center gap-2 rounded-full bg-purple-600 px-7 py-3 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg hover:shadow-purple-600/50"
    >
      {ctaLabel}
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
