<!-- src/lib/components/customer/layout/CustomerNavbar.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import { resolve } from '$app/paths';
  import CategoryFilterBar from '$lib/components/customer/event/CategoryFilterBar.svelte';
  import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
  import { Button } from '$lib/components/ui/button';
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '$lib/components/ui/dropdown-menu';
  import { LogOut, Ticket, User } from 'lucide-svelte';

  interface Users {
    id: number;
    role: 'admin' | 'customer';
  }

  interface Props {
    user?: Users;
    searchQuery?: string;
  }

  const categories = [
    { label: 'Tất cả', icon: '✨', value: '' },
    { label: 'Concert', icon: '🎵', value: 'concert' },
    { label: 'Festival', icon: '🎉', value: 'festival' },
    { label: 'Thể Thao', icon: '⚽', value: 'sports' },
    { label: 'Kịch Nghệ', icon: '🎭', value: 'theater' },
    { label: 'Art & Expo', icon: '🖼️', value: 'art' },
    { label: 'Comedy', icon: '😂', value: 'comedy' },
  ];

  let activeCategory = $state('');

  let { user, searchQuery = '' }: Props = $props();
  let isSearchOpen = $state(false);
  let isUserMenuOpen = $state(false);

  function handleLogout() {
    return async () => {
      await invalidateAll();
      await goto(resolve('/'));
    };
  }
</script>

<header class="sticky top-0 z-40 w-full shadow-sm">
  <div class="bg-primary transition-all">
    <div class="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
      <a
        href={resolve('/')}
        class="flex shrink-0 items-center gap-2 font-bold text-white transition-opacity {isSearchOpen
          ? 'hidden md:flex'
          : 'flex'}"
      >
        <span class="text-2xl tracking-tighter sm:text-3xl">Tixtac</span>
      </a>

      <!-- SEARCH BAR -->
      <form
        action={resolve('/')}
        method="GET"
        class="relative max-w-2xl flex-1 items-center transition-all {isSearchOpen
          ? 'flex w-full'
          : 'hidden md:flex'}"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="mr-2 text-white md:hidden"
          onclick={() => (isSearchOpen = false)}
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </Button>

        <div
          class="relative flex h-10 w-full items-center overflow-hidden rounded-lg bg-white px-4"
        >
          <svg
            class="pointer-events-none h-5 w-5 shrink-0 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            name="q"
            value={searchQuery}
            placeholder="Bạn tìm gì hôm nay?"
            class="w-full flex-1 border-none bg-transparent px-3 py-2 text-sm text-slate-900 outline-none focus:ring-0"
            autofocus={isSearchOpen}
          />
          <div class="mx-2 hidden h-5 w-[1px] bg-slate-300 sm:block"></div>
          <button
            type="submit"
            class="hidden px-2 text-sm font-medium whitespace-nowrap text-slate-600 hover:text-primary sm:block"
          >
            Tìm kiếm
          </button>
        </div>
      </form>

      <!-- AUTH & MENU -->
      <nav
        class="flex shrink-0 items-center justify-end gap-4 text-white sm:gap-6 {isSearchOpen
          ? 'hidden md:flex'
          : 'flex'}"
      >
        <!-- Nút mở search mobile -->
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="text-white md:hidden"
          onclick={() => (isSearchOpen = true)}
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </Button>

        {#if user}
          <a
            href={resolve('/')}
            // href={resolve('/my-tickets')}
            class="flex items-center gap-2 text-sm font-medium transition hover:opacity-80"
          >
            <Ticket className="h-5 w-5" />
            <span class="hidden whitespace-nowrap sm:inline">Vé của tôi</span>
          </a>

          <!-- User Menu Dropdown -->
          <DropdownMenu bind:open={isUserMenuOpen}>
            <DropdownMenuTrigger>
              <Button
                variant="ghost"
                size="icon"
                class="cursor-pointer gap-2 rounded-lg hover:bg-transparent hover:text-white focus:bg-transparent sm:size-auto sm:px-3"
              >
                <Avatar class="h-8 w-8">
                  <AvatarImage src="" alt={`User ${user.id}`} />
                  <AvatarFallback class="text-xs font-semibold">
                    {user.id}
                  </AvatarFallback>
                </Avatar>
                <span class="hidden text-sm font-medium sm:inline">Tài khoản</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-48">
              <DropdownMenuItem
                onclick={() => {
                  goto(resolve('/'));
                  // goto(resolve('/account'));
                  isUserMenuOpen = false;
                }}
                class="cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                <span>Tài khoản của tôi</span>
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
          <a
            href={resolve('/login')}
            class="flex items-center gap-2 text-sm font-medium transition hover:opacity-80"
          >
            <Ticket className="h-5 w-5" />
            <span class="hidden whitespace-nowrap sm:inline">Vé của tôi</span>
          </a>
          <span>
            <a
              href={resolve('/login')}
              class="text-sm font-medium whitespace-nowrap transition hover:opacity-80"
            >
              Đăng nhập
            </a>
            <a
              href={resolve('/register')}
              class="text-sm font-medium whitespace-nowrap transition hover:opacity-80"
            >
              <span class="hidden sm:inline">| Đăng ký</span>
            </a>
          </span>
        {/if}
      </nav>
    </div>
  </div>

  <!-- TẦNG 2: CATEGORY FILTER (Đặc trưng Ticketbox) -->
  <div class="border-t border-white/10 bg-secondary">
    <div class="mx-auto flex h-14 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
      <CategoryFilterBar {categories} bind:activeCategory />
    </div>
  </div>
</header>

<style>
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
