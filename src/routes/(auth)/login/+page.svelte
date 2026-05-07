<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { formatZodErrors } from '$lib/shared/format-errors';
  import { loginSchema } from '$lib/shared/schemas/auth.schema';
  import { toast } from '$lib/stores/toast';
  import { api } from '$lib/utils/api';
  import { Eye, EyeOff, Loader } from 'lucide-svelte';

  let loading = $state(false);
  let showPassword = $state(false);
  let email = $state('');
  let password = $state('');
  let authError = $state<string | null>(null);

  let errors = $state<Record<string, string>>({});

  function clearError(field: string) {
    authError = null;
    if (!errors[field]) return;
    const next = { ...errors };
    delete next[field];
    errors = next;
  }

  function validateField(field: string) {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const allErrors = formatZodErrors(result.error);
      if (allErrors[field]) {
        errors = { ...errors, [field]: allErrors[field] };
      } else {
        clearError(field);
      }
    } else {
      clearError(field);
    }
  }

  async function handleLogin() {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      errors = formatZodErrors(result.error);
      return;
    }
    errors = {};
    authError = null;

    loading = true;
    const { data, error, details } = await api.post<{ role: string }>('/auth/login', result.data);
    loading = false;

    if (details) {
      errors = details;
      return;
    }

    if (error) {
      authError = error;
      return;
    }

    if (data) {
      toast.success('Đăng nhập thành công!');

      const redirectTo = page.url.searchParams.get('redirect');
      if (redirectTo && redirectTo.startsWith('/')) {
        goto(resolve(redirectTo), { invalidateAll: true });
      } else if (data.role === 'admin') {
        goto(resolve('/admin'), { invalidateAll: true });
      } else {
        goto(resolve('/'), { invalidateAll: true });
      }
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === ' ') {
      e.preventDefault();
    }
  }

  function stripWhitespace(field: 'email' | 'password', e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    const sanitized = target.value.replace(/\s+/g, '');

    if (field === 'email') {
      email = sanitized;
    } else {
      password = sanitized;
    }
  }
</script>

<div class="space-y-6">
  <!-- Header -->
  <div>
    <h1 class="font-heading text-2xl font-bold tracking-tight text-foreground">Đăng nhập</h1>
    <p class="mt-1 text-sm text-muted-foreground">Nhập email và mật khẩu của bạn để tiếp tục</p>
  </div>

  <!-- Form -->
  <form
    onsubmit={(e) => {
      e.preventDefault();
      handleLogin();
    }}
    class="grid gap-5"
  >
    <div class="grid gap-2">
      <Label for="email">Email</Label>
      <Input
        id="email"
        type="email"
        autocomplete="username"
        placeholder="name@example.com"
        bind:value={email}
        onfocus={() => clearError('email')}
        onblur={() => validateField('email')}
        onkeydown={handleKeydown}
        oninput={(e) => stripWhitespace('email', e)}
      />
      {#if errors.email}
        <span class="text-xs text-destructive">{errors.email}</span>
      {/if}
    </div>

    <div class="grid gap-2">
      <Label for="password">Mật khẩu</Label>
      <div
        class="flex h-10 w-full rounded-md border border-input bg-transparent ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
      >
        <input
          id="password"
          type={showPassword ? 'text' : 'password'}
          bind:value={password}
          placeholder="••••••••"
          class="h-full flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
          onfocus={() => clearError('password')}
          onblur={() => validateField('password')}
          onkeydown={handleKeydown}
          oninput={(e) => stripWhitespace('password', e)}
        />
        <button
          type="button"
          class="flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground"
          onclick={() => (showPassword = !showPassword)}
          tabindex={-1}
          aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {#if showPassword}
            <EyeOff class="size-4 shrink-0" />
          {:else}
            <Eye class="size-4 shrink-0" />
          {/if}
        </button>
      </div>
      {#if errors.password}
        <span class="text-xs text-destructive">{errors.password}</span>
      {/if}
    </div>

    {#if authError}
      <div role="alert" class="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {authError}
      </div>
    {/if}

    <Button type="submit" class="mt-1 w-full py-5 text-sm font-semibold" disabled={loading}>
      {#if loading}<Loader class="mr-2 h-4 w-4 animate-spin" />{/if}
      Đăng nhập
    </Button>
  </form>
</div>
