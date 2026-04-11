<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { Button } from '$lib/components/ui/button';

  let { user } = $props();

  function handleLogout() {
    return async () => {
      await invalidateAll();
      await goto(resolve('/'));
    };
  }
</script>

<nav class="navbar-auth">
  {#if user}
    <Button href={resolve('/my-tickets')} variant="ghost" size="sm" class="text-sm">
      🎟️ Vé của tôi
    </Button>

    <form action="/api/auth/logout" method="POST" use:enhance={handleLogout}>
      <Button type="submit" variant="destructive" size="sm">Đăng xuất</Button>
    </form>
  {:else}
    <Button href={resolve('/login')} variant="ghost" size="sm" class="text-sm">Đăng nhập</Button>
    <Button href={resolve('/register')} size="sm">Đăng ký</Button>
  {/if}
</nav>

<style>
  .navbar-auth {
    display: flex;
    gap: 12px;
    margin-left: auto;
    align-items: center;
  }
</style>
