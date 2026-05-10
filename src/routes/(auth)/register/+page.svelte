<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { PasswordInput } from '$lib/components/ui/password-input';
  import * as Select from '$lib/components/ui/select';
  import { registerSchema } from '$lib/shared/schemas/auth.schema';
  import { toast } from '$lib/stores/toast';
  import { api } from '$lib/utils/api';
  import { Loader } from 'lucide-svelte';
  import { superForm } from 'sveltekit-superforms';
  import { zod4Client } from 'sveltekit-superforms/adapters';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const { form, errors, validateForm, validate } = $derived(
    superForm(data.form, {
      validators: zod4Client(registerSchema),
    }),
  );

  let submitting = $state(false);
  let apiMessage = $state<string | undefined>(undefined);

  const genderOptions = [
    { value: 'male', label: 'Nam' },
    { value: 'female', label: 'Nữ' },
    { value: 'other', label: 'Khác' },
  ];

  let genderLabel = $derived(genderOptions.find((o) => o.value === $form.gender)?.label);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();

    const result = await validateForm({ update: true });
    if (!result.valid) return;

    submitting = true;
    apiMessage = undefined;

    const res = await api.post('/auth/register', $form, { silent: true });
    submitting = false;

    if (res.details) {
      return;
    }

    if (res.error) {
      if (res.status === 409) {
        apiMessage = res.error;
      } else {
        toast.error(res.error);
      }
      return;
    }

    toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
    goto(resolve('/login'));
  }
</script>

<div class="space-y-6">
  <!-- Header -->
  <div>
    <h1 class="font-heading text-2xl font-bold tracking-tight text-foreground">
      Đăng ký tài khoản
    </h1>
    <p class="mt-1 text-sm text-muted-foreground">Nhập thông tin của bạn để tạo tài khoản mới</p>
  </div>

  <!-- Form -->
  <form onsubmit={handleSubmit} class="grid gap-5" novalidate>
    <div class="grid gap-2">
      <Label for="full_name">Họ và tên</Label>
      <Input
        id="full_name"
        name="full_name"
        bind:value={$form.full_name}
        placeholder="Nguyễn Văn A"
        onblur={() => validate('full_name')}
        aria-invalid={$errors.full_name ? 'true' : undefined}
        class={$errors.full_name ? 'border-destructive focus-visible:ring-destructive/20' : ''}
      />
      {#if $errors.full_name}
        <span class="text-xs text-destructive">{$errors.full_name[0]}</span>
      {/if}
    </div>

    <div class="grid gap-2">
      <Label for="email">Email</Label>
      <Input
        id="email"
        name="email"
        type="email"
        bind:value={$form.email}
        placeholder="name@example.com"
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

    <div class="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
      <div class="grid gap-2">
        <Label for="date_of_birth">Ngày sinh</Label>
        <Input
          id="date_of_birth"
          name="date_of_birth"
          type="date"
          bind:value={$form.date_of_birth}
          onblur={() => validate('date_of_birth')}
          aria-invalid={$errors.date_of_birth ? 'true' : undefined}
          class={$errors.date_of_birth
            ? 'border-destructive focus-visible:ring-destructive/20'
            : ''}
        />
        {#if $errors.date_of_birth}
          <span class="text-xs text-destructive">{$errors.date_of_birth[0]}</span>
        {/if}
      </div>
      <div class="grid gap-2">
        <Label for="gender">Giới tính</Label>
        <Select.Root type="single" bind:value={$form.gender}>
          <Select.Trigger class="w-full" aria-invalid={$errors.gender ? 'true' : undefined}>
            {#if genderLabel}
              {genderLabel}
            {:else}
              <span class="text-muted-foreground">Chọn giới tính</span>
            {/if}
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              <Select.Label>Giới tính</Select.Label>
              {#each genderOptions as option (option.value)}
                <Select.Item value={option.value}>{option.label}</Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
        </Select.Root>
        {#if $errors.gender}
          <span class="text-xs text-destructive">{$errors.gender[0]}</span>
        {/if}
      </div>
    </div>

    {#if apiMessage}
      <div role="alert" class="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {apiMessage}
      </div>
    {/if}

    <Button type="submit" class="mt-1 w-full py-5 text-sm font-semibold" disabled={submitting}>
      {#if submitting}<Loader class="mr-2 h-4 w-4 animate-spin" />{/if}
      Đăng ký
    </Button>
  </form>
</div>
