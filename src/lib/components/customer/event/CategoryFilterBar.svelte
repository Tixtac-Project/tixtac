<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import {
    Disc3,
    Dumbbell,
    Guitar,
    Laugh,
    MicVocal,
    Music,
    Presentation,
    Theater,
    Trophy,
  } from 'lucide-svelte';
  import { SvelteURLSearchParams } from 'svelte/reactivity';

  interface Category {
    id?: number;
    label?: string;
    name?: string;
    value?: string;
    slug?: string;
  }

  interface Props {
    categories: Category[];
    activeCategory: string;
  }

  let { categories, activeCategory = $bindable() }: Props = $props();

  // Icon map keyed by actual DB slugs
  const iconMap: Record<string, typeof Music> = {
    'nhac-song': Guitar,
    'edm-dj': Disc3,
    'hai-kich': Laugh,
    'the-thao': Trophy,
    'hoi-thao': Presentation,
    'nhac-hoi': MicVocal,
    'kich-san-khau': Theater,
    khac: Dumbbell,
  };

  function getIcon(slug: string) {
    return iconMap[slug] ?? Music;
  }

  function getCategorySlug(cat: Category): string {
    return cat.slug || cat.value || '';
  }

  function getCategoryLabel(cat: Category): string {
    return cat.label || cat.name || '';
  }

  function handleSelectCategory(slug: string) {
    activeCategory = slug;
    const params = new SvelteURLSearchParams(window.location.search);
    if (slug) {
      params.set('category', slug);
    } else {
      params.delete('category');
    }
    goto(resolve(`/search?${params.toString()}`), { keepFocus: true });
  }
</script>

<div class="no-scrollbar flex w-full items-center overflow-x-auto">
  <ul class="flex h-full min-w-max items-center gap-2.5">
    <!-- "All" pill -->
    <li>
      <button
        type="button"
        onclick={() => handleSelectCategory('')}
        class="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-semibold transition-all duration-200 {activeCategory ===
        ''
          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
          : 'bg-secondary text-secondary-foreground hover:bg-surface-container-high'}"
      >
        <Music class="size-3.5" />
        Tất cả
      </button>
    </li>

    {#each categories as cat (getCategorySlug(cat))}
      {@const slug = getCategorySlug(cat)}
      {@const label = getCategoryLabel(cat)}
      {@const Icon = getIcon(slug)}
      <li>
        <button
          type="button"
          onclick={() => handleSelectCategory(slug)}
          class="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-semibold transition-all duration-200 {activeCategory ===
          slug
            ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
            : 'bg-secondary text-secondary-foreground hover:bg-surface-container-high'}"
        >
          <Icon class="size-3.5" />
          {label}
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
