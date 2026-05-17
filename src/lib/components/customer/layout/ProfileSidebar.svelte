<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { toast } from '$lib/stores/toast';
  import { api } from '$lib/utils/api';
  import { Key, LayoutDashboard, LogOut, Mail, ShieldCheck, Ticket, User } from 'lucide-svelte';

  let { onItemClick, active } = $props<{
    onItemClick?: (id: string) => void;
    active?: string;
  }>();

  const profile = $derived(page.data.profile);
  const user = $derived(page.data.user);
  const displayName = $derived(profile?.full_name || 'Người dùng');
  const displayEmail = $derived(profile?.email || '');
  const initials = $derived(
    displayName
      .split(' ')
      .map((n: string) => n.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U',
  );
  const isAdmin = $derived(user?.role === 'admin');

  function handleLogout() {
    api.post('/auth/logout', {}).catch(() => {});
    toast.success('Đăng xuất thành công!');
    goto(resolve('/'), { invalidateAll: true });
  }
</script>

<div class="flex h-full flex-col gap-1">
  <!-- ═══ User block ═══ -->
  <div class="px-3 pt-5 pb-4">
    <div class="flex items-center gap-3">
      <!-- Avatar -->
      <div class="relative shrink-0">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container text-sm font-bold text-primary-foreground shadow-sm"
        >
          {initials}
        </div>
        <!-- Online dot -->
        <span
          class="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-surface-container bg-success"
        ></span>
      </div>

      <div class="min-w-0 leading-tight">
        <p class="truncate text-sm font-semibold text-foreground">{displayName}</p>
        <p class="truncate text-xs text-muted-foreground">{displayEmail}</p>
      </div>
    </div>

    <!-- Role badge -->
    <div class="mt-3">
      {#if isAdmin}
        <span
          class="inline-flex items-center gap-1 rounded-full bg-purple-muted px-2 py-0.5 text-[10px] font-bold tracking-wide text-purple uppercase"
        >
          <ShieldCheck class="size-3" />
          Quản trị viên
        </span>
      {:else}
        <span
          class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-primary uppercase"
        >
          <User class="size-3" />
          Khách hàng
        </span>
      {/if}
    </div>
  </div>

  <div class="mx-3 border-t border-border"></div>

  <!-- ═══ Section 1: Tài khoản ═══ -->
  <nav class="flex-1 px-2 pt-3">
    <p class="mb-1.5 px-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
      Tài khoản
    </p>

    <ul class="space-y-0.5">
      <li>
        <button
          onclick={() => onItemClick?.('profile')}
          class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150 {active ===
          'profile'
            ? 'bg-primary/10 font-semibold text-foreground'
            : 'text-muted-foreground hover:bg-surface-container-low hover:text-foreground'}"
          aria-current={active === 'profile' ? 'page' : undefined}
        >
          <User class="size-3.5 shrink-0" />
          Thông tin cá nhân
        </button>
      </li>
      <li>
        <button
          onclick={() => onItemClick?.('email')}
          class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150 {active ===
          'email'
            ? 'bg-primary/10 font-semibold text-foreground'
            : 'text-muted-foreground hover:bg-surface-container-low hover:text-foreground'}"
          aria-current={active === 'email' ? 'page' : undefined}
        >
          <Mail class="size-3.5 shrink-0" />
          Email
        </button>
      </li>
      <li>
        <button
          onclick={() => onItemClick?.('password')}
          class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150 {active ===
          'password'
            ? 'bg-primary/10 font-semibold text-foreground'
            : 'text-muted-foreground hover:bg-surface-container-low hover:text-foreground'}"
          aria-current={active === 'password' ? 'page' : undefined}
        >
          <Key class="size-3.5 shrink-0" />
          Đổi mật khẩu
        </button>
      </li>
    </ul>

    <!-- ═══ Section 2: Hoạt động ═══ -->
    <p
      class="mt-4 mb-1.5 px-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase"
    >
      Hoạt động
    </p>

    <ul class="space-y-0.5">
      {#if isAdmin}
        <li>
          <a
            href={resolve('/admin')}
            class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-surface-container-low hover:text-foreground"
          >
            <LayoutDashboard class="size-3.5 shrink-0" />
            Trang quản trị
          </a>
        </li>
      {:else}
        <li>
          <a
            href={resolve('/me/tickets')}
            class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-surface-container-low hover:text-foreground"
          >
            <Ticket class="size-3.5 shrink-0" />
            Vé của tôi
          </a>
        </li>
      {/if}
    </ul>
  </nav>

  <!-- ═══ Footer: Logout ═══ -->
  <div class="px-2 pt-2 pb-4">
    <div class="border-t border-border pt-2">
      <button
        onclick={handleLogout}
        class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-destructive/8 hover:text-destructive"
      >
        <LogOut class="size-3.5 shrink-0" />
        Đăng xuất
      </button>
    </div>
  </div>
</div>
