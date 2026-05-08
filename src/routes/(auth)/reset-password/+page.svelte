<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { passwordSchema } from '$lib/shared/schemas/auth.schema';
  import { toast } from '$lib/stores/toast';
  import { api } from '$lib/utils/api';
  import { Eye, EyeOff, Loader } from 'lucide-svelte';

  const { data } = $props<{ data: { token: string } }>();

  let loading = $state(false);
  let clientErrors = $state<string[]>([]);
  let serverError = $state<string | null>(null);
  let showPassword = $state(false);
  let showConfirmPassword = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    // Validate client (password strength + confirm match)
    const validation = passwordSchema.safeParse({ password, confirmPassword });

    if (!validation.success) {
      serverError = null;
      clientErrors = validation.error.issues.map((i) => i.message);
      return;
    }
    clientErrors = [];
    serverError = null;

    loading = true;
    const { error } = await api.post('/auth/reset-password', {
      token: data.token,
      password,
    });
    loading = false;

    if (error) {
      serverError = error;
      return;
    }

    toast.success('Đặt lại mật khẩu thành công');

    setTimeout(() => {
      goto(resolve('/(auth)/login'), { invalidateAll: true });
    }, 300);
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold tracking-tight">Đặt lại mật khẩu</h1>
    <p class="mt-1 text-sm text-muted-foreground">Nhập mật khẩu mới cho tài khoản của bạn</p>
  </div>

  <form onsubmit={handleSubmit} class="grid gap-5">
    <input type="hidden" name="token" value={data.token} />

    <!-- Mật khẩu mới -->
    <div class="grid gap-2">
      <Label for="password">Mật khẩu mới</Label>
      <div class="relative">
        <Input
          id="password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          required
          minlength={8}
          placeholder="••••••••"
          autocomplete="new-password"
        />
        <button
          type="button"
          class="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onclick={() => (showPassword = !showPassword)}
          aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {#if showPassword}<EyeOff class="size-5" />{:else}<Eye class="size-5" />{/if}
        </button>
      </div>
    </div>

    <!-- Xác nhận mật khẩu -->
    <div class="grid gap-2">
      <Label for="confirmPassword">Xác nhận mật khẩu</Label>
      <div class="relative">
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type={showConfirmPassword ? 'text' : 'password'}
          required
          placeholder="••••••••"
          autocomplete="new-password"
        />
        <button
          type="button"
          class="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onclick={() => (showConfirmPassword = !showConfirmPassword)}
          tabindex={-1}
          aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {#if showConfirmPassword}<EyeOff class="size-5" />{:else}<Eye class="size-5" />{/if}
        </button>
      </div>
    </div>

    <!-- Lỗi client -->
    {#if clientErrors.length}
      <div class="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <ul class="list-disc pl-4">
          {#each clientErrors as error, i (i)}<li>{error}</li>{/each}
        </ul>
      </div>
    {/if}

    <!-- Lỗi server -->
    {#if serverError}
      <div class="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {serverError}
      </div>
    {/if}

    <Button type="submit" class="w-full" disabled={loading}>
      {#if loading}<Loader class="mr-2 h-4 w-4 animate-spin" />{/if}
      Đặt lại mật khẩu
    </Button>
  </form>
</div>
