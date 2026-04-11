<script lang="ts">
  import { Button } from '$lib/components/ui/button';

  interface Category {
    label: string;
    icon: string;
    value: string;
  }

  let { categories, activeCategory = $bindable() } = $props<{
    categories: Category[];
    activeCategory?: string;
  }>();
</script>

<div class="category-bar">
  {#each categories as cat (cat.value || 'all')}
    <Button
      id="cat-{cat.value || 'all'}"
      variant={activeCategory === cat.value ? 'default' : 'outline'}
      size="sm"
      onclick={() => (activeCategory = cat.value)}
      class="rounded-full whitespace-nowrap"
    >
      <span>{cat.icon}</span>
      {cat.label}
    </Button>
  {/each}
</div>

<style>
  .category-bar {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 4px;
    margin-bottom: 32px;
    scrollbar-width: none;
  }
  .category-bar::-webkit-scrollbar {
    display: none;
  }
</style>
