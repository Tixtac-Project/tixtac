<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
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

  let errors = $state<Record<string, string>>({});

  function clearError(field: string) {
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

    loading = true;
    const { data, error, details } = await api.post<{ role: string }>('/auth/login', result.data);
    loading = false;

    if (details) {
      errors = details;
      return;
    }

    if (!error && data) {
      toast.success('Đăng nhập thành công!');
      if (data.role === 'admin') {
        goto(resolve('/admin'));
      } else {
        goto(resolve('/'));
      }
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
        placeholder="name@example.com"
        bind:value={email}
        onfocus={() => clearError('email')}
        onblur={() => validateField('email')}
        class="rounded-xl"
      />
      {#if errors.email}
        <span class="text-xs text-destructive">{errors.email}</span>
      {/if}
    </div>

    <div class="grid gap-2">
      <Label for="password">Mật khẩu</Label>
      <div class="relative">
        <Input
          id="password"
          type={showPassword ? 'text' : 'password'}
          bind:value={password}
          class="rounded-xl pr-10"
          onfocus={() => clearError('password')}
          onblur={() => validateField('password')}
        />
        <button
          type="button"
          class="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          style="transition: color 0.2s var(--ease-bento);"
          onclick={() => (showPassword = !showPassword)}
          tabindex={-1}
          aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {#if showPassword}
            <EyeOff class="size-5" />
          {:else}
            <Eye class="size-5" />
          {/if}
        </button>
      </div>
      {#if errors.password}
        <span class="text-xs text-destructive">{errors.password}</span>
      {/if}
    </div>

    <Button
      type="submit"
      class="mt-1 w-full rounded-xl py-5 text-sm font-semibold"
      disabled={loading}
    >
      {#if loading}<Loader class="mr-2 h-4 w-4 animate-spin" />{/if}
      Đăng nhập
    </Button>
  </form>

</div>
