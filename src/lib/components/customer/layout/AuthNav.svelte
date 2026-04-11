<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import { resolve } from '$app/paths';
  import type { User } from '$lib/types';

  interface Props {
    user: User | null;
  }

  let { user }: Props = $props();

  function handleLogout() {
    return async () => {
      await invalidateAll();
      await goto(resolve('/'));
    };
  }
</script>

<nav class="navbar-auth">
  {#if user}
    <a href={resolve('/(customer)')} class="nav-link">🎟️ Vé của tôi</a>

    <form action={resolve('/api/auth/logout')} method="POST" use:enhance={handleLogout}>
      <button type="submit" class="btn-ghost-danger">Đăng xuất</button>
    </form>
  {:else}
    <a href={resolve('/login')} class="nav-link">Đăng nhập</a>
    <a href={resolve('/register')} class="btn-primary">Đăng ký</a>
  {/if}
</nav>

<style>
  .navbar-auth {
    display: flex;
    gap: 12px;
    margin-left: auto;
    align-items: center;
  }

  .nav-link {
    font-size: 0.9rem;
    color: var(--color-muted-strong);
  }

  .nav-link:hover {
    color: var(--color-primary);
  }

  .btn-primary {
    background: var(--color-primary);
    color: white;
    padding: 8px 16px;
    border-radius: var(--radius-pill);
  }

  .btn-ghost-danger {
    background: none;
    border: none;
    color: red;
    cursor: pointer;
  }
</style>
