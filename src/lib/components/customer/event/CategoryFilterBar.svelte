<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  interface Category {
    label: string;
    value: string;
  }

  interface Props {
    categories: Category[];
    activeCategory: string;
  }

  let { categories, activeCategory = $bindable() }: Props = $props();

  function handleSelectCategory(value: string) {
    activeCategory = value;
    const url = new URL($page.url);
    if (value) {
      url.searchParams.set('category', value);
    } else {
      url.searchParams.delete('category');
    }
    goto(url.toString(), { keepFocus: true, noScroll: true });
  }
</script>

<div class="no-scrollbar flex w-full items-center overflow-x-auto">
  <ul class="flex h-full min-w-max items-center gap-6 md:gap-8">
    <li>
      <button
        type="button"
        onclick={() => handleSelectCategory('')}
        class="relative flex h-14 items-center text-[15px] font-semibold tracking-wide whitespace-nowrap transition-colors duration-200 {activeCategory ===
        ''
          ? 'text-primary'
          : 'text-slate-300 hover:text-white'}"
      >
        {#if activeCategory === ''}
          <div class="absolute bottom-0 left-0 h-[3px] w-full rounded-t-md bg-primary"></div>
        {/if}
      </button>
    </li>

    {#each categories as cat (cat.value)}
      <li>
        <button
          type="button"
          onclick={() => handleSelectCategory(cat.value)}
          class="relative flex h-14 items-center text-[15px] font-semibold tracking-wide whitespace-nowrap transition-colors duration-200 {activeCategory ===
          cat.value
            ? 'text-primary'
            : 'text-shadow-white hover:text-primary'}"
        >
          {cat.label}
          {#if activeCategory === cat.value}
            <div class="absolute bottom-0 left-0 h-[3px] w-full rounded-t-md bg-primary"></div>
          {/if}
        </button>
      </li>
    {/each}
  </ul>
</div>

<style>
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
