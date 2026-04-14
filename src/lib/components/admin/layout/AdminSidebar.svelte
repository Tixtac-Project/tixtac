<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { CalendarDays, LayoutDashboard, Ticket } from 'lucide-svelte';

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
    class="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
    onclick={() => (open = false)}
    aria-label="Đóng menu"
    tabindex="-1"
  ></button>
{/if}

<aside
  class="fixed top-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-border/50 bg-card
    {open ? 'translate-x-0' : '-translate-x-full'}
    md:z-30 md:translate-x-0"
  style="transition: transform 0.3s var(--ease-bento);"
>
  <!-- Logo -->
  <div class="flex h-16 items-center gap-3 px-6">
    <a href={resolve('/admin')} class="group flex items-center gap-3" onclick={handleNavClick}>
      <div
        class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm"
        style="transition: transform 0.2s var(--ease-bento);"
      >
        <Ticket class="h-5 w-5 text-primary-foreground" />
      </div>
      <div class="flex flex-col">
        <span class="text-sm font-bold tracking-tight text-foreground">TixTac</span>
        <span class="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
          Admin
        </span>
      </div>
    </a>
  </div>

  <!-- Divider -->
  <div class="mx-4 h-px bg-border/60"></div>

  <!-- Navigation -->
  <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-5">
    <p
      class="mb-2 px-3 text-[10px] font-semibold tracking-widest text-muted-foreground/70 uppercase"
    >
      Menu
    </p>
    {#each navItems as item (item.href)}
      {@const resolvedHref = resolve(item.href)}
      {@const active = isActive(resolvedHref, item.exact, page.url.pathname)}
      <a
        href={resolvedHref}
        onclick={handleNavClick}
        class="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium
          {active
          ? 'bg-primary/10 font-bold! text-primary shadow-sm dark:bg-primary/15'
          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'}"
        style="transition: all 0.2s var(--ease-bento);"
      >
        {#if active}
          <div
            class="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary"
          ></div>
        {/if}
        <item.icon
          class="size-6 {active ? 'text-primary' : ''}"
          style="transition: transform 0.2s var(--ease-bento);"
        />
        {item.label}
      </a>
    {/each}
  </nav>

  <!-- Footer -->
  <div class="mx-4 h-px bg-border/60"></div>
  <div class="px-6 py-4">
    <div class="flex items-center justify-between">
      <p class="text-[11px] text-muted-foreground/60">&copy; {currentYear} TixTac</p>
      <span
        class="rounded-md bg-muted/60 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-muted-foreground/50 uppercase"
      >
        v1.0.0
      </span>
    </div>
  </div>
</aside>
