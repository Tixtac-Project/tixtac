<!-- src/lib/components/customer/layout/CustomerNavbar.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page as pageState } from '$app/state';
  import Logo2 from '$lib/assets/Logo2.svelte';
  import CategoryFilterBar from '$lib/components/customer/event/CategoryFilterBar.svelte';
  import { Button } from '$lib/components/ui/button';
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '$lib/components/ui/dropdown-menu';
  import type { CategoryInfo, UserInfo } from '$lib/types/layout';
  import MoonIcon from '@lucide/svelte/icons/moon';
  import SunIcon from '@lucide/svelte/icons/sun';
  import { CircleUserRound, House, LogOut, Search, Ticket, User } from 'lucide-svelte';
  import { toggleMode } from 'mode-watcher';
  import { onMount, tick } from 'svelte';

  interface Props {
    user?: UserInfo;
    searchQuery?: string;
    categories?: CategoryInfo[];
  }

  let { user, searchQuery = '', categories = [] }: Props = $props();

  let activeCategory = $state('');

  $effect(() => {
    activeCategory = pageState.url.searchParams.get('category') ?? '';
  });

  let isSearchOpen = $state(false);
  let isUserMenuOpen = $state(false);
  let searchInput = $state<HTMLInputElement | null>(null);

  $effect(() => {
    if (isSearchOpen) {
      tick().then(() => searchInput?.focus());
    }
  });

  // Bottom nav visibility — hide when footer is in view
  let isBottomNavVisible = $state(true);

  onMount(() => {
    const footer = document.querySelector('footer');
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isBottomNavVisible = !entry.isIntersecting;
      },
      { threshold: 0 },
    );
    observer.observe(footer);

    return () => observer.disconnect();
  });

  function toggleSearch() {
    isSearchOpen = !isSearchOpen;
  }

  function handleLogout() {
    return async () => {
      await invalidateAll();
      await goto(resolve('/'));
    };
  }

  let currentPath = $derived(pageState.url.pathname);

  function isActive(path: string): boolean {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  }
</script>

<!-- ═══════════════════════════════════════════════════ -->
<!-- DESKTOP TOP NAV BAR                                -->
<!-- ═══════════════════════════════════════════════════ -->
<header class="relative z-40 w-full md:sticky md:top-0">
  <div class="glass-nav border-b border-outline-variant/10">
    <div class="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
      <!-- Brand -->

      <a
        href={resolve('/')}
        class="align-center flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
      >
        <span class="size-6 fill-primary">
          <Logo2 />
        </span>
        <span class="font-heading text-2xl font-extrabold tracking-tight text-primary">TixTac</span>
      </a>

      <!-- Center nav links (desktop only) -->
      <nav class="hidden items-center gap-1 md:flex">
        <a
          href={resolve('/')}
          class="relative px-4 py-2 text-sm font-medium transition-colors {isActive('/')
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'}"
        >
          Trang chủ
          {#if isActive('/')}
            <span class="absolute right-4 bottom-0 left-4 h-0.5 rounded-full bg-primary"></span>
          {/if}
        </a>
        <a
          href={resolve('/events')}
          class="relative px-4 py-2 text-sm font-medium transition-colors {isActive('/events')
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'}"
        >
          Khám phá
          {#if isActive('/events')}
            <span class="absolute right-4 bottom-0 left-4 h-0.5 rounded-full bg-primary"></span>
          {/if}
        </a>
        <a
          href={resolve('/me/tickets')}
          class="relative px-4 py-2 text-sm font-medium transition-colors {isActive('/me/tickets')
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'}"
        >
          Vé của tôi
          {#if isActive('/me/tickets')}
            <span class="absolute right-4 bottom-0 left-4 h-0.5 rounded-full bg-primary"></span>
          {/if}
        </a>
      </nav>

      <!-- Right side: search + profile -->
      <div class="flex shrink-0 items-center gap-4">
        <!-- Animated expandable search (desktop only) -->
        <div class="relative hidden items-center gap-3 md:flex">
          <form action={resolve('/search')} method="GET" class="flex items-center">
            <div
              class="flex h-10 items-center overflow-hidden rounded-full transition-all duration-300 ease-(--ease-architectural) {isSearchOpen
                ? 'w-56 border border-outline-variant bg-surface-container-lowest px-3 sm:w-72'
                : 'w-0 px-0'}"
            >
              <Search
                class="pointer-events-none  size-4 shrink-0 text-muted-foreground transition-opacity duration-200 {isSearchOpen
                  ? 'opacity-100'
                  : 'opacity-0'}"
              />
              <input
                bind:this={searchInput}
                type="text"
                name="q"
                value={searchQuery}
                placeholder="Tìm sự kiện..."
                tabindex={isSearchOpen ? 0 : -1}
                class="w-full flex-1 border-none bg-transparent px-2 py-2 text-sm text-foreground transition-opacity duration-200 outline-none placeholder:text-muted-foreground {isSearchOpen
                  ? 'opacity-100'
                  : 'opacity-0'}"
              />
              <button type="submit" class="sr-only">Tìm</button>
            </div>
          </form>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="h-9 w-9 shrink-0 rounded-full text-muted-foreground transition-colors duration-200 hover:text-foreground"
            onclick={toggleSearch}
          >
            {#if isSearchOpen}
              <svg
                class="h-4.5 w-4.5 transition-opacity duration-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            {:else}
              <Search class="size-6 transition-opacity duration-200" />
            {/if}
          </Button>
        </div>

        <!-- Theme toggle -->
        <Button
          onclick={toggleMode}
          variant="ghost"
          size="icon"
          class="h-9 w-9 shrink-0 rounded-full text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <SunIcon
            class="size-max scale-100 rotate-0 transition-all! dark:scale-0 dark:-rotate-90"
          />
          <MoonIcon
            class="absolute size-max scale-0 rotate-90 transition-all! dark:scale-100 dark:rotate-0"
          />
          <span class="sr-only">Toggle theme</span>
        </Button>

        <!-- Profile / Auth -->
        {#if user}
          <div class="hidden md:block">
            <DropdownMenu bind:open={isUserMenuOpen}>
              <DropdownMenuTrigger
                class="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full  bg-surface-container-lowest text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary-light hover:text-primary"
              >
                <CircleUserRound class="size-max" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-56">
                <DropdownMenuLabel class="px-3 pt-2 pb-1">Tài khoản</DropdownMenuLabel>
                <DropdownMenuItem
                  onclick={() => {
                    goto(resolve('/me/profile'));
                    isUserMenuOpen = false;
                  }}
                  class="cursor-pointer"
                >
                  <User class="size-4 text-muted-foreground" />
                  <span>Trang cá nhân</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onclick={() => {
                    goto(resolve('/me/tickets'));
                    isUserMenuOpen = false;
                  }}
                  class="cursor-pointer"
                >
                  <Ticket class="size-4 text-muted-foreground" />
                  <span>Vé của tôi</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={resolve('/api/auth/logout')} method="POST" use:enhance={handleLogout}>
                  <DropdownMenuItem variant="destructive" class="cursor-pointer">
                    <button
                      type="submit"
                      class="flex w-full items-center gap-2"
                      onclick={() => (isUserMenuOpen = false)}
                    >
                      <LogOut class="size-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        {:else}
          <Button
            variant="ghost"
            size="icon"
            href={resolve('/login')}
            class="hidden h-9 w-9 rounded-full text-muted-foreground transition-all hover:bg-primary-light hover:text-primary md:inline-flex"
          >
            <CircleUserRound class="size-5" />
          </Button>
        {/if}
      </div>
    </div>
  </div>

  <!-- CATEGORY FILTER BAR — hidden on /search which has its own filter sidebar -->
  {#if categories.length > 0 && !currentPath.startsWith('/search')}
    <div class="border-b border-outline-variant/10 bg-surface-container-lowest">
      <div class="mx-auto flex h-12 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <CategoryFilterBar {categories} bind:activeCategory />
      </div>
    </div>
  {/if}
</header>

<!-- ═══════════════════════════════════════════════════ -->
<!-- MOBILE BOTTOM NAV BAR                              -->
<!-- ═══════════════════════════════════════════════════ -->
<nav
  class="fixed right-0 bottom-0 left-0 z-50 transition-transform duration-300 ease-(--ease-architectural) md:hidden {isBottomNavVisible
    ? 'translate-y-0'
    : 'translate-y-full'}"
>
  <div class="rounded-t-2xl border-t border-outline-variant/10 bg-accent">
    <div class="mx-auto flex h-18 max-w-lg items-center justify-around px-2">
      <!-- Home -->
      <a
        href={resolve('/')}
        class="flex flex-col items-center gap-0.5 px-3 py-1 {isActive('/')
          ? 'text-primary'
          : 'text-muted-foreground'}"
      >
        <House class="h-5 w-5" />
        <span class="text-[10px] font-semibold tracking-wider uppercase">Home</span>
      </a>

      <!-- Search -->
      <a
        href={resolve('/search')}
        class="flex flex-col items-center gap-0.5 px-3 py-1 {isActive('/search')
          ? 'text-primary'
          : 'text-muted-foreground'}"
      >
        <Search class="h-5 w-5" />
        <span class="text-[10px] font-semibold tracking-wider uppercase">Tìm kiếm</span>
      </a>

      <!-- My Tickets -->
      <a
        href={resolve('/me/tickets')}
        class="flex flex-col items-center gap-0.5 px-3 py-1 {isActive('/me/tickets')
          ? 'text-primary'
          : 'text-muted-foreground'}"
      >
        <Ticket class="h-5 w-5" />
        <span class="text-[10px] font-semibold tracking-wider uppercase">Vé của tôi</span>
      </a>

      <!-- Profile -->
      <a
        href={resolve(user ? '/profile' : '/login')}
        class="flex flex-col items-center gap-0.5 px-3 py-1 {isActive('/profile')
          ? 'text-primary'
          : 'text-muted-foreground'}"
      >
        <User class="h-5 w-5" />
        <span class="text-[10px] font-semibold tracking-wider uppercase">Cá nhân</span>
      </a>
    </div>
  </div>
</nav>
