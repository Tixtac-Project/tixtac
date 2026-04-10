<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { CalendarDays, LayoutDashboard } from 'lucide-svelte';

  let {
    open = $bindable(false),
  }: {
    open?: boolean;
  } = $props();

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/admin/events', label: 'Sự kiện', icon: CalendarDays, exact: false },
  ] as const;

  function isActive(href: string, exact: boolean, pathname: string): boolean {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  function handleNavClick() {
    open = false;
  }

  const currentYear = new Date().getFullYear();
</script>

<!-- Backdrop overlay on mobile -->
{#if open}
  <button
    class="fixed inset-0 z-40 bg-black/50 md:hidden"
    onclick={() => (open = false)}
    aria-label="Đóng menu"
    tabindex="-1"
  ></button>
{/if}

<aside
  class="fixed top-0 left-0 z-50 flex h-screen w-60 flex-col border-r bg-card text-card-foreground transition-transform duration-200 ease-in-out
    {open ? 'translate-x-0' : '-translate-x-full'}
    md:z-30 md:translate-x-0"
>
  <!-- Logo -->
  <div class="flex h-14 items-center border-b px-5">
    <a
      href={resolve('/admin')}
      class="flex items-center gap-2 text-lg font-bold tracking-tight"
      onclick={handleNavClick}
    >
      <span class="text-xl">🎫</span>
      <span>TixTac Admin</span>
    </a>
  </div>

  <!-- Navigation -->
  <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4">
    {#each navItems as item (item.href)}
      {@const resolvedHref = resolve(item.href)}
      {@const active = isActive(resolvedHref, item.exact, page.url.pathname)}
      <a
        href={resolvedHref}
        onclick={handleNavClick}
        class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
          {active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
      >
        <item.icon class="h-4 w-4" />
        {item.label}
      </a>
    {/each}
  </nav>

  <!-- Footer -->
  <div class="border-t px-5 py-3">
    <p class="text-xs text-muted-foreground">&copy; {currentYear} TixTac</p>
  </div>
</aside>
