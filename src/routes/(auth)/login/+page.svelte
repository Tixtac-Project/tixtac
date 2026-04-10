<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
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
    // Client-side validation using shared Zod schema
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
      // Server returned field-level validation errors — map them to the form
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

<div class="flex h-screen w-screen flex-col items-center justify-center">
  <Card.Root class="w-full max-w-90" style="view-transition-name: auth-card;">
    <Card.Header class="space-y-1 text-center">
      <Card.Title class="text-2xl font-bold">Đăng nhập</Card.Title>
      <Card.Description>Nhập email và mật khẩu của bạn</Card.Description>
    </Card.Header>

    <form
      onsubmit={(e) => {
        e.preventDefault();
        handleLogin();
      }}
      class="grid gap-4"
    >
      <Card.Content class="grid gap-4">
        <div class="grid gap-2">
          <Label for="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            bind:value={email}
            onfocus={() => clearError('email')}
            onblur={() => validateField('email')}
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
              class="pr-10"
              onfocus={() => clearError('password')}
              onblur={() => validateField('password')}
            />
            <button
              type="button"
              class="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              onclick={() => (showPassword = !showPassword)}
              tabindex={-1}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {#if showPassword}
                <EyeOff class="h-4 w-4" />
              {:else}
                <Eye class="h-4 w-4" />
              {/if}
            </button>
          </div>
          {#if errors.password}
            <span class="text-xs text-destructive">{errors.password}</span>
          {/if}
        </div>
      </Card.Content>

      <Card.Footer class="flex flex-col gap-4">
        <Button type="submit" class="w-full" disabled={loading}>
          {#if loading}<Loader class="mr-2 h-4 w-4 animate-spin" />{/if}
          Đăng nhập
        </Button>
        <div class="text-center text-sm text-muted-foreground">
          Chưa có tài khoản?
          <a href={resolve('/register')} class="text-primary underline underline-offset-4">
            Đăng ký
          </a>
        </div>
      </Card.Footer>
    </form>
  </Card.Root>
</div>
