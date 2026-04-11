<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    children,
    class: className = '',
    interactive = false,
    colSpan = undefined,
    rowSpan = undefined,
    ...restProps
  }: HTMLAttributes<HTMLDivElement> & {
    children: Snippet;
    interactive?: boolean;
    colSpan?: number;
    rowSpan?: number;
  } = $props();

  const spanMap: Record<number, string> = {
    2: 'md:col-span-2',
    3: 'md:col-span-3',
    4: 'md:col-span-4',
    6: 'md:col-span-6',
    8: 'md:col-span-8',
    12: 'md:col-span-12',
  };

  const rowMap: Record<number, string> = {
    2: 'md:row-span-2',
    3: 'md:row-span-3',
  };

  let spanClasses = $derived(
    [colSpan && spanMap[colSpan], rowSpan && rowMap[rowSpan]].filter(Boolean).join(' '),
  );
</script>

<div
  class="bento-fade-in {interactive
    ? 'bento-card-interactive'
    : 'bento-card'} {spanClasses} {className}"
  {...restProps}
>
  {@render children()}
</div>
