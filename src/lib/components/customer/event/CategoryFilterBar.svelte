<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
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

  let { categories }: { categories: Category[] } = $props();

  const activeCategory = $derived(page.url.searchParams.get('category') ?? '');

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

  function getSlug(cat: Category): string {
    return cat.slug || cat.value || '';
  }

  function getLabel(cat: Category): string {
    return cat.label || cat.name || '';
  }

  function buildHref(slug: string) {
    const params = new SvelteURLSearchParams(page.url.searchParams);
    if (slug) {
      params.set('category', slug);
    } else {
      params.delete('category');
    }
    return resolve(`/search?${params.toString()}`);
  }
</script>

<div class="no-scrollbar flex w-full items-center overflow-x-auto">
  <ul class="flex h-full min-w-max items-center gap-2.5">
    <li>
      <a
        href={buildHref('')}
        class="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-semibold transition-all duration-200 {activeCategory ===
        ''
          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
          : 'bg-secondary text-secondary-foreground hover:bg-surface-container-high'}"
      >
        <Music class="size-3.5" />
        Tất cả
      </a>
    </li>

    {#each categories as cat (getSlug(cat))}
      {@const slug = getSlug(cat)}
      {@const label = getLabel(cat)}
      {@const Icon = getIcon(slug)}
      <li>
        <a
          href={buildHref(slug)}
          class="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-semibold transition-all duration-200 {activeCategory ===
          slug
            ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
            : 'bg-secondary text-secondary-foreground hover:bg-surface-container-high'}"
        >
          <Icon class="size-3.5" />
          {label}
        </a>
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
