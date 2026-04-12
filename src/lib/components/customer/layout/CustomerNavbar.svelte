<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import { resolve } from '$app/paths';

  interface Props {
    user?: Record<string, any>;
    searchQuery?: string;
  }

  let { user, searchQuery = '' }: Props = $props();

  // Trạng thái kiểm soát việc mở/đóng thanh tìm kiếm trên mobile
  let isSearchOpen = $state(false);

  function handleLogout() {
    return async () => {
      await invalidateAll();
      await goto(resolve('/'));
    };
  }
</script>

<header class="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
  <div class="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 transition-all sm:px-6">

    <a
      href={resolve('/')}
      class="flex shrink-0 items-center gap-2 text-lg font-semibold text-slate-900 transition-opacity sm:text-xl {isSearchOpen ? 'hidden md:flex' : 'flex'}"
    >
      <span class="text-2xl">🎫</span>
      <span>TixTac</span>
    </a>

    <form
      action={resolve('/')}
      method="GET"
      class="relative flex-1 items-center max-w-2xl transition-all {isSearchOpen ? 'flex w-full' : 'hidden md:flex'}"
    >
      <button
        type="button"
        aria-label="Đóng tìm kiếm"
        class="mr-2 shrink-0 rounded-full p-2 text-slate-500 transition hover:bg-slate-100 md:hidden"
        onclick={() => (isSearchOpen = false)}
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>

      <div class="relative w-full">
        <svg
          class="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          name="q"
          value={searchQuery}
          placeholder="Tìm kiếm sự kiện, nghệ sĩ..."
          class="w-full rounded-full border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-11 text-sm text-slate-900 transition outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 sm:py-3"
          autofocus={isSearchOpen}
        />
      </div>
    </form>

    <nav class="flex shrink-0 items-center justify-end gap-2 {isSearchOpen ? 'hidden md:flex' : 'flex'}">

      <button
        type="button"
        aria-label="Mở tìm kiếm"
        class="rounded-full p-2 text-slate-600 transition hover:bg-slate-100 md:hidden"
        onclick={() => (isSearchOpen = true)}
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>

      {#if user}
        <a href={resolve('/')} class="text-sm font-medium text-slate-700 transition hover:text-purple-600">
          <span class="hidden sm:inline">🎟️ Vé của tôi</span>
          <span class="inline sm:hidden text-lg">🎟️</span>
        </a>
        <form action={resolve('/api/auth/logout')} method="POST" use:enhance={handleLogout} class="inline">
          <button type="submit" class="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-slate-50 sm:px-4 sm:py-2 sm:text-sm">
            Đăng xuất
          </button>
        </form>
      {:else}
        <a href={resolve('/login')} class="inline text-sm font-medium text-slate-700 transition hover:text-purple-600 sm:block">
          Đăng nhập
        </a>
        <a href={resolve('/register')} class="inline-flex rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-purple-700 sm:text-sm">
          Đăng ký
        </a>
      {/if}
    </nav>

  </div>
</header>
