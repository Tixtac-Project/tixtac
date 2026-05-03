<script lang="ts">
  import { resolve } from '$app/paths';

  interface Props {
    title: string;
    searchQuery?: string;
    viewAllHref?: string | null;
    variant?: 'default' | 'small';
  }

  let { title, searchQuery, viewAllHref, variant = 'default' }: Props = $props();

  const showViewAll = $derived(viewAllHref !== undefined && viewAllHref !== null);
</script>

<div
  class={`flex items-end justify-between
    ${variant === 'small' ? 'mb-4' : 'mb-8'}
  `}
>
  <div>
    <h2
      class={`font-heading font-bold tracking-tight text-foreground
        ${variant === 'small' ? 'text-xl' : 'text-2xl md:text-3xl'}
      `}
    >
      {title}
    </h2>

    {#if searchQuery}
      <p class="mt-1.5 text-sm text-muted-foreground">
        Kết quả cho: <span class="font-semibold text-primary">"{searchQuery}"</span>
      </p>
    {/if}
  </div>

  {#if showViewAll}
    <a
      href={resolve(viewAllHref!)}
      class="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-all duration-200 hover:gap-2"
    >
      Xem tất cả
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </a>
  {/if}
</div>
