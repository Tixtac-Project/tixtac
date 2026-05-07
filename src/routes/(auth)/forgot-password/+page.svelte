<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { toast } from '$lib/stores/toast';
  import { api } from '$lib/utils/api';
  import { Loader } from 'lucide-svelte';

  let loading = $state(false);
  let email = $state('');
  let error = $state<string | null>(null);
  let success = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    loading = true;
    error = null;

    try {
      const { error: apiError } = await api.post('/auth/forgot-password', { email });
      loading = false;

      if (apiError) {
        error = apiError;
        return;
      }

      success = true;
      toast.success('Vui lòng kiểm tra email để nhận hướng dẫn đặt lại mật khẩu');
    } catch {
      loading = false;
      error = 'Lỗi không xác định. Vui lòng thử lại.';
    }
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold tracking-tight">Quên mật khẩu</h1>
    <p class="mt-1 text-sm text-muted-foreground">Nhập email để nhận link đặt lại mật khẩu</p>
  </div>

  {#if success}
    <div class="rounded-xl bg-green-500/10 px-4 py-3 text-sm text-green-600">
      Nếu email tồn tại, chúng tôi đã gửi hướng dẫn. Vui lòng kiểm tra cả Spam/Junk.
    </div>
  {:else}
    <form onsubmit={handleSubmit} class="grid gap-5">
      <div class="grid gap-2">
        <Label for="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          autocomplete="email"
          bind:value={email}
          required
        />
      </div>

      {#if error}
        <div class="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      {/if}

      <Button type="submit" class="w-full" disabled={loading}>
        {#if loading}<Loader class="mr-2 h-4 w-4 animate-spin" />{/if}
        Gửi yêu cầu
      </Button>
    </form>
  {/if}
</div>
