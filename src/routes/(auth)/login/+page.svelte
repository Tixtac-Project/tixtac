<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { PasswordInput } from '$lib/components/ui/password-input';
  import { loginSchema } from '$lib/shared/schemas/auth.schema';
  import { toast } from '$lib/stores/toast';
  import { api } from '$lib/utils/api';
  import { Loader } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { superForm } from 'sveltekit-superforms';
  import { zod4Client } from 'sveltekit-superforms/adapters';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const { form, errors, validateForm, validate } = $derived(
    superForm(data.form, {
      validators: zod4Client(loginSchema),
    }),
  );

  let submitting = $state(false);
  let apiMessage = $state<string | undefined>(undefined);

  onMount(() => {
    const redirectTo = page.url.searchParams.get('redirect');
    if (redirectTo && redirectTo.startsWith('/')) {
      toast.info('Vui lòng đăng nhập để tiếp tục.');
    }
  });

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();

    const result = await validateForm({ update: true });
    if (!result.valid) return;

    submitting = true;
    apiMessage = undefined;

    const res = await api.post<{ role: string }>('/auth/login', $form);
    submitting = false;

    if (res.details) {
      return;
    }
    if (res.error) {
      apiMessage = res.error;
      return;
    }

    if (res.data) {
      toast.success('Đăng nhập thành công!');
      const redirectTo = page.url.searchParams.get('redirect');
      if (redirectTo && redirectTo.startsWith('/')) {
        goto(resolve(redirectTo), { invalidateAll: true });
      } else if (res.data.role === 'admin') {
        goto(resolve('/admin'), { invalidateAll: true });
      } else {
        goto(resolve('/'), { invalidateAll: true });
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
  <form onsubmit={handleSubmit} class="grid gap-5" novalidate>
    <div class="grid gap-2">
      <Label for="email">Email</Label>
      <Input
        id="email"
        name="email"
        type="email"
        autocomplete="username"
        placeholder="name@example.com"
        bind:value={$form.email}
        onblur={() => validate('email')}
        aria-invalid={$errors.email ? 'true' : undefined}
        class={$errors.email ? 'border-destructive focus-visible:ring-destructive/20' : ''}
      />
      {#if $errors.email}
        <span class="text-xs text-destructive">{$errors.email[0]}</span>
      {/if}
    </div>

    <div class="grid gap-2">
      <Label for="password">Mật khẩu</Label>
      <PasswordInput
        id="password"
        name="password"
        bind:value={$form.password}
        onblur={() => validate('password')}
        disabled={submitting}
        error={!!$errors.password}
      />
      {#if $errors.password}
        <span class="text-xs text-destructive">{$errors.password[0]}</span>
      {/if}
    </div>

    {#if apiMessage}
      <div role="alert" class="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {apiMessage}
      </div>
    {/if}

    <Button type="submit" class="mt-1 w-full py-5 text-sm font-semibold" disabled={submitting}>
      {#if submitting}<Loader class="mr-2 h-4 w-4 animate-spin" />{/if}
      Đăng nhập
    </Button>

    <div class="mt-4 flex justify-end text-sm">
      <a
        href={resolve('/forgot-password')}
        class="ml-1 font-bold text-primary transition-colors hover:text-primary/80"
      >
        Quên mật khẩu?
      </a>
    </div>
  </form>
</div>
