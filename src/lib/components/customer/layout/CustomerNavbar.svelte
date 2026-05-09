<!-- src/lib/components/customer/layout/CustomerNavbar.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page as pageState } from '$app/state';
  import Logo2 from '$lib/assets/Logo2.svelte';
  import CategoryFilterBar from '$lib/components/customer/event/CategoryFilterBar.svelte';
  import { AnimatedThemeToggler } from '$lib/components/magic/animated-theme-toggler';
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
  import { handleLogout as sharedLogout } from '$lib/utils/auth';
  import {
    CircleUserRound,
    House,
    LayoutDashboard,
    LogOut,
    Search,
    Ticket,
    User,
  } from 'lucide-svelte';
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
    sharedLogout();
  }

  let currentPath = $derived(pageState.url.pathname);

  function isActive(path: string): boolean {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  }

  let isAdmin = $derived(user?.role === 'admin');

  // Bottom nav tabs dynamic — admin sees Quản lý instead of Vé của tôi
  let bottomTabs = $derived(
    isAdmin
      ? (['/', '/search', '/admin', '/me/profile'] as const)
      : (['/', '/search', '/me/tickets', '/me/profile'] as const),
  );
  let activeTabIndex = $derived(
    bottomTabs.findIndex((p) => {
      if (p === '/') return currentPath === '/';
      return currentPath.startsWith(p);
    }),
  );
</script>

<!-- ═══════════════════════════════════════════════════ -->
<!-- DESKTOP TOP NAV BAR                                -->
<!-- ═══════════════════════════════════════════════════ -->
<header class="relative z-40 w-full md:sticky md:top-0">
  <div class="glass-nav border-b border-outline-variant/10">
    <div
      class="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-3 sm:h-16 sm:gap-6 sm:px-6"
    >
      <!-- Brand -->

      <a
        href={resolve('/')}
        class="align-center flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
      >
        <span class="size-6 fill-primary">
          <Logo2 />
        </span>
        <span class="font-heading text-xl font-extrabold tracking-tight text-primary sm:text-2xl">
          TixTac
        </span>
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
        {#if isAdmin}
          <a
            href={resolve('/admin')}
            class="relative px-4 py-2 text-sm font-medium transition-colors {isActive('/admin')
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'}"
          >
            Trang quản lý
            {#if isActive('/admin')}
              <span class="absolute right-4 bottom-0 left-4 h-0.5 rounded-full bg-primary"></span>
            {/if}
          </a>
        {:else}
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
        {/if}
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
        <AnimatedThemeToggler class="text-muted-foreground" />

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
                {#if isAdmin}
                  <DropdownMenuItem
                    onclick={() => {
                      goto(resolve('/admin'));
                      isUserMenuOpen = false;
                    }}
                    class="cursor-pointer"
                  >
                    <LayoutDashboard class="size-4 text-muted-foreground" />
                    <span>Trang quản lý</span>
                  </DropdownMenuItem>
                {:else}
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
                {/if}
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
            <CircleUserRound class="size-6" />
          </Button>
        {/if}
      </div>
    </div>
  </div>

  <!-- CATEGORY FILTER BAR — hidden on /search which has its own filter sidebar -->
  {#if categories.length > 0 && !currentPath.startsWith('/search')}
    <div class="border-b border-outline-variant/10 bg-surface-container-lowest">
      <div class="mx-auto flex h-10 w-full max-w-7xl items-center px-3 sm:h-12 sm:px-6 lg:px-8">
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
  <div
    class="rounded-t-xl border-t border-outline-variant/10 bg-surface-container-lowest shadow-[0_-4px_20px_oklch(0.35_0.12_260/0.06)] backdrop-blur-xl"
  >
    <div
      class="relative mx-auto grid h-[4.25rem] max-w-lg grid-cols-4 items-center"
      style="--active-idx: {activeTabIndex}"
    >
      <!-- Sliding pill background — 1/4 width, centered in its column -->
      <div
        class="absolute top-1.5 left-[calc(var(--active-idx)*25%+0.375rem)] h-[calc(100%-0.75rem)] w-[calc(25%-0.75rem)] rounded-2xl bg-primary-light transition-all duration-350 ease-(--ease-architectural)"
      ></div>

      <!-- Home -->
      <a
        href={resolve('/')}
        class="relative z-10 flex flex-col items-center justify-center gap-0.5 py-1.5 transition-colors duration-350 ease-(--ease-architectural) {isActive(
          '/',
        )
          ? 'text-primary'
          : 'text-muted-foreground'}"
      >
        <span
          class="absolute -top-1.5 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full bg-primary transition-all duration-350 ease-(--ease-architectural) {isActive(
            '/',
          )
            ? 'scale-100 opacity-100'
            : 'scale-0 opacity-0'}"
        ></span>
        <House class="h-5 w-5" />
        <span class="text-[10px] font-bold tracking-wider uppercase">Home</span>
      </a>

      <!-- Search -->
      <a
        href={resolve('/search')}
        class="relative z-10 flex flex-col items-center justify-center gap-0.5 py-1.5 transition-colors duration-350 ease-(--ease-architectural) {isActive(
          '/search',
        )
          ? 'text-primary'
          : 'text-muted-foreground'}"
      >
        <span
          class="absolute -top-1.5 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full bg-primary transition-all duration-350 ease-(--ease-architectural) {isActive(
            '/search',
          )
            ? 'scale-100 opacity-100'
            : 'scale-0 opacity-0'}"
        ></span>
        <Search class="h-5 w-5" />
        <span class="text-[10px] font-bold tracking-wider uppercase">Tìm kiếm</span>
      </a>

      <!-- My Tickets / Admin -->
      {#if isAdmin}
        <a
          href={resolve('/admin')}
          class="relative z-10 flex flex-col items-center justify-center gap-0.5 py-1.5 transition-colors duration-350 ease-(--ease-architectural) {isActive(
            '/admin',
          )
            ? 'text-primary'
            : 'text-muted-foreground'}"
        >
          <span
            class="absolute -top-1.5 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full bg-primary transition-all duration-350 ease-(--ease-architectural) {isActive(
              '/admin',
            )
              ? 'scale-100 opacity-100'
              : 'scale-0 opacity-0'}"
          ></span>
          <LayoutDashboard class="h-5 w-5" />
          <span class="text-[10px] font-bold tracking-wider uppercase">Quản lý</span>
        </a>
      {:else}
        <a
          href={resolve('/me/tickets')}
          class="relative z-10 flex flex-col items-center justify-center gap-0.5 py-1.5 transition-colors duration-350 ease-(--ease-architectural) {isActive(
            '/me/tickets',
          )
            ? 'text-primary'
            : 'text-muted-foreground'}"
        >
          <span
            class="absolute -top-1.5 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full bg-primary transition-all duration-350 ease-(--ease-architectural) {isActive(
              '/me/tickets',
            )
              ? 'scale-100 opacity-100'
              : 'scale-0 opacity-0'}"
          ></span>
          <Ticket class="h-5 w-5" />
          <span class="text-[10px] font-bold tracking-wider uppercase">Vé của tôi</span>
        </a>
      {/if}

      <!-- Profile -->
      <a
        href={resolve(user ? '/me/profile' : '/login')}
        class="relative z-10 flex flex-col items-center justify-center gap-0.5 py-1.5 transition-colors duration-350 ease-(--ease-architectural) {isActive(
          '/me/profile',
        )
          ? 'text-primary'
          : 'text-muted-foreground'}"
      >
        <span
          class="absolute -top-1.5 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full bg-primary transition-all duration-350 ease-(--ease-architectural) {isActive(
            '/me/profile',
          )
            ? 'scale-100 opacity-100'
            : 'scale-0 opacity-0'}"
        ></span>
        <User class="h-5 w-5" />
        <span class="text-[10px] font-bold tracking-wider uppercase">Cá nhân</span>
      </a>
    </div>
  </div>
</nav>
