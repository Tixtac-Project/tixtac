<script lang="ts">
  import { resolve } from '$app/paths';

  interface Props {
    title: string;
    searchQuery?: string;
    viewAllHref?: string;
    variant?: 'default' | 'small';
  }

  let { title, searchQuery, viewAllHref = '/events', variant = 'default' }: Props = $props();
</script>

<div
  class={`mb-6 flex items-end justify-between
    ${variant === 'small' ? 'mb-4' : 'mb-6'}
  `}
>
  <div>
    <h2
      class={`font-bold tracking-tight text-slate-900
        ${variant === 'small' ? 'text-xl' : 'text-2xl sm:text-3xl'}
      `}
    >
      {title}
    </h2>

    {#if searchQuery}
      <p class="mt-1 text-sm text-slate-500">
        Kết quả cho: <span class="font-semibold text-primary">"{searchQuery}"</span>
      </p>
    {/if}
  </div>

  {#if viewAllHref}
    <a
      href={resolve(viewAllHref)}
      class="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-all duration-200 hover:gap-2"
    >
      Xem tất cả
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </a>
  {/if}
</div>
