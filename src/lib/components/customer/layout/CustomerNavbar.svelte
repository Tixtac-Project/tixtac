<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import { resolve } from '$app/paths';

  interface Props {
    user?: Record<string, any>;
    searchQuery?: string;
  }

  let { user, searchQuery = '' }: Props = $props();

  function handleLogout() {
    return async () => {
      await invalidateAll();
      await goto(resolve('/'));
    };
  }
</script>

<header class="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
  <div class="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
    <a
      href={resolve('/')}
      class="flex items-center gap-3 text-lg font-semibold text-slate-900 sm:text-xl"
    >
      <span class="text-2xl">🎫</span>
      <span>TixTac</span>
    </a>

    <form action={resolve('/')} method="GET" class="relative min-w-[240px] flex-1">
      <svg
        class="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400"
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
        placeholder="Tìm kiếm sự kiện, nghệ sĩ, địa điểm..."
        class="w-full rounded-full border border-slate-300 bg-slate-50 py-3 pr-4 pl-11 text-sm text-slate-900 transition outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
      />
    </form>

    <nav class="flex flex-wrap items-center justify-end gap-3">
      {#if user}
        <a
          href={resolve('/me')}
          class="text-sm font-medium text-slate-700 transition hover:text-purple-600"
        >
          🎟️ Vé của tôi
        </a>
        <form
          action={resolve('/api/auth/logout')}
          method="POST"
          use:enhance={handleLogout}
          class="inline"
        >
          <button
            type="submit"
            class="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-slate-50"
          >
            Đăng xuất
          </button>
        </form>
      {:else}
        <a
          href={resolve('/login')}
          class="text-sm font-medium text-slate-700 transition hover:text-purple-600"
        >
          Đăng nhập
        </a>
        <a
          href={resolve('/register')}
          class="inline-flex rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
        >
          Đăng ký
        </a>
      {/if}
    </nav>
  </div>
</header>
