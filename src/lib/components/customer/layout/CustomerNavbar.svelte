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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '$lib/components/ui/dropdown-menu';
  import { CircleUserRound, House, LogOut, Search, Ticket, User } from 'lucide-svelte';
  import { onMount, tick } from 'svelte';

  interface Users {
    id: number;
    role: 'admin' | 'customer';
  }

  interface Category {
    id: number;
    name: string;
    slug: string;
  }

  interface Props {
    user?: Users;
    searchQuery?: string;
    categories?: Category[];
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
          href={resolve(user ? '/my-tickets' : '/login?redirect=/my-tickets')}
          class="relative px-4 py-2 text-sm font-medium transition-colors {isActive('/my-tickets')
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'}"
        >
          Vé của tôi
          {#if isActive('/my-tickets')}
            <span class="absolute right-4 bottom-0 left-4 h-0.5 rounded-full bg-primary"></span>
          {/if}
        </a>
      </nav>

      <!-- Right side: search + profile -->
      <div class="flex shrink-0 items-center gap-4">
        <!-- Animated expandable search -->
        <div class="relative flex items-center">
          <form action={resolve('/')} method="GET" class="flex items-center">
            <div
              class="flex h-10 items-center overflow-hidden rounded-xl transition-all duration-300 ease-[var(--ease-architectural)] {isSearchOpen
                ? 'w-56 bg-surface-container-low px-3 sm:w-72'
                : 'w-0 px-0'}"
            >
              <Search
                class="pointer-events-none h-4 w-4 shrink-0 text-muted-foreground transition-opacity duration-200 {isSearchOpen
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
            class="h-9 w-9 shrink-0 text-muted-foreground transition-colors duration-200 hover:text-foreground"
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

        <!-- Profile / Auth -->
        {#if user}
          <DropdownMenu bind:open={isUserMenuOpen}>
            <DropdownMenuTrigger>
              <Button
                variant="ghost"
                size="icon"
                class="h-9 w-9 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <CircleUserRound class="size-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-48">
              <DropdownMenuItem
                onclick={() => {
                  goto(resolve('/'));
                  isUserMenuOpen = false;
                }}
                class="cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                <span>Tài khoản của tôi</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onclick={() => {
                  goto(resolve('/my-tickets'));
                  isUserMenuOpen = false;
                }}
                class="cursor-pointer"
              >
                <Ticket className="mr-2 h-4 w-4" />
                <span>Vé của tôi</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form
                action={resolve('/api/auth/logout')}
                method="POST"
                use:enhance={handleLogout}
                class="w-full"
              >
                <DropdownMenuItem onclick={() => (isUserMenuOpen = false)} class="cursor-pointer">
                  <button type="submit" class="flex w-full items-center">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Đăng xuất</span>
                  </button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        {:else}
          <Button
            variant="ghost"
            size="icon"
            href={resolve('/login')}
            class="h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <CircleUserRound class="size-6" />
          </Button>
        {/if}
      </div>
    </div>
  </div>

  <!-- CATEGORY FILTER BAR -->
  {#if categories.length > 0}
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
        href={resolve(user ? '/my-tickets' : '/login?redirect=/my-tickets')}
        class="flex flex-col items-center gap-0.5 px-3 py-1 {isActive('/my-tickets')
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
