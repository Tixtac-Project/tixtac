<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    children,
    cols = 12,
    class: className = '',
    ...restProps
  }: HTMLAttributes<HTMLDivElement> & {
    children: Snippet;
    cols?: 2 | 3 | 4 | 6 | 12;
  } = $props();

  const colsClass: Record<number, string> = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
    6: 'grid-cols-2 md:grid-cols-6',
    12: 'grid-cols-1 md:grid-cols-12',
  };
</script>

<div class="bento-grid bento-fade-in {colsClass[cols] ?? colsClass[12]} {className}" {...restProps}>
  {@render children()}
</div>
