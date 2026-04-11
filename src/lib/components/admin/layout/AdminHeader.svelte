<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import * as Avatar from '$lib/components/ui/avatar';
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { toast } from '$lib/stores/toast';
  import { api } from '$lib/utils/api';
  import { Loader, LogOut, Menu, User } from 'lucide-svelte';

  let {
    ontogglesidebar,
  }: {
    ontogglesidebar: () => void;
  } = $props();

  let loggingOut = $state(false);

  async function handleLogout() {
    loggingOut = true;
    const { error } = await api.post('/auth/logout', {});
    loggingOut = false;

    if (!error) {
      toast.success('Đăng xuất thành công');
      goto(resolve('/login'));
    }
  }

  const pageTitle = $derived.by(() => {
    const path = page.url.pathname;
    if (path.includes('/events/new')) return 'Tạo sự kiện mới';
    if (path.match(/\/events\/\d+/)) return 'Chi tiết sự kiện';
    if (path.includes('/events')) return 'Quản lý sự kiện';
    return 'Dashboard';
  });
</script>

<header
  class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/50 bg-background/80 px-4 backdrop-blur-xl md:px-6"
>
  <div class="flex items-center gap-3">
    <Button
      variant="ghost"
      size="icon"
      class="h-9 w-9 rounded-xl md:hidden"
      onclick={ontogglesidebar}
    >
      <Menu class="h-5 w-5" />
    </Button>

    <div class="flex flex-col">
      <h2 class="ml-2 font-heading text-lg font-bold tracking-tight text-foreground">
        {pageTitle}
      </h2>
    </div>
  </div>

  <div class="flex items-center gap-2">
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <button
            {...props}
            class="flex items-center gap-2.5 rounded-xl border border-border/50 bg-card px-3 py-1.5 hover:bg-accent/60"
            style="transition: all 0.2s var(--ease-bento);"
          >
            <Avatar.Root class="h-7 w-7">
              <Avatar.Fallback class="bg-primary/10 text-xs font-semibold text-primary">
                A
              </Avatar.Fallback>
            </Avatar.Root>
            <span class="hidden text-sm font-medium text-foreground md:inline">Admin</span>
          </button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" class="w-48 rounded-xl p-1.5">
        <DropdownMenu.Group>
          <DropdownMenu.Item class="gap-2 rounded-lg" disabled>
            <User class="h-4 w-4 text-muted-foreground" />
            <span>Hồ sơ</span>
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            class="gap-2 rounded-lg text-destructive focus:text-destructive"
            onclick={handleLogout}
            disabled={loggingOut}
          >
            {#if loggingOut}
              <Loader class="h-4 w-4 animate-spin" />
            {:else}
              <LogOut class="h-4 w-4" />
            {/if}
            <span>Đăng xuất</span>
          </DropdownMenu.Item>
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>
</header>
