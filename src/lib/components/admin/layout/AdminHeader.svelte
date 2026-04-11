<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { Button } from '$lib/components/ui/button';
  import { toast } from '$lib/stores/toast';
  import { api } from '$lib/utils/api';
  import { Loader, LogOut, Menu } from 'lucide-svelte';

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
</script>

<header
  class="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 md:px-6"
>
  <div class="flex items-center gap-2">
    <Button variant="ghost" size="icon" class="md:hidden" onclick={ontogglesidebar}>
      <Menu class="h-5 w-5" />
    </Button>
    <h2 class="text-sm font-semibold text-foreground">Admin Panel</h2>
  </div>

  <div class="flex items-center gap-2 md:gap-3">
    <span class="hidden text-sm text-muted-foreground md:inline">👤 Admin</span>
    <Button variant="ghost" size="sm" onclick={handleLogout} disabled={loggingOut}>
      {#if loggingOut}
        <Loader class="mr-1.5 h-3.5 w-3.5 animate-spin" />
      {:else}
        <LogOut class="mr-1.5 h-3.5 w-3.5" />
      {/if}
      <span class="hidden md:inline">Đăng xuất</span>
    </Button>
  </div>
</header>
