<script lang="ts">
  interface Category {
    label: string;
    icon: string;
    value: string;
  }

  interface Props {
    categories: Category[];
    activeCategory?: string;
    onCategoryChange?: (value: string) => void;
  }

  let { categories = [], activeCategory = '', onCategoryChange }: Props = $props();

  function handleClick(value: string) {
    if (onCategoryChange) {
      onCategoryChange(value);
    }
  }
</script>

<div class="scrollbar-hide mb-8 flex gap-2.5 overflow-x-auto pb-1">
  {#each categories as category (category.value || 'all')}
    <button
      on:click={() => handleClick(category.value)}
      class={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-4.5 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200
        ${
          activeCategory === category.value
            ? 'border-purple-600 bg-purple-600 text-white shadow-md'
            : 'border-slate-300 bg-white text-slate-700 hover:border-purple-400 hover:text-purple-600'
        }
      `}
    >
      <span class="text-base">{category.icon}</span>
      {category.label}
    </button>
  {/each}
</div>

<style>
  :global(.scrollbar-hide::-webkit-scrollbar) {
    display: none;
  }
  :global(.scrollbar-hide) {
    scrollbar-width: none;
  }
</style>
