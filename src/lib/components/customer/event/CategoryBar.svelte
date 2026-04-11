<script lang="ts">
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
    <button
      id="cat-{cat.value || 'all'}"
      class="cat-chip {activeCategory === cat.value ? 'active' : ''}"
      onclick={() => (activeCategory = cat.value)}
    >
      <span>{cat.icon}</span>
      {cat.label}
    </button>
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
  .cat-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    border-radius: 999px;
    border: 1px solid var(--color-border);
    background: var(--color-card);
    color: var(--color-muted-strong);
    font-size: 0.875rem;
    font-weight: 500;
    font-family: var(--font-main);
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;
    flex-shrink: 0;
  }
  .cat-chip:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }
  .cat-chip.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
  }
</style>
