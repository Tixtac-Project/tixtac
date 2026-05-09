<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Select from '$lib/components/ui/select';
  import { formatZodErrors } from '$lib/shared/format-errors';
  import { registerSchema } from '$lib/shared/schemas/auth.schema';
  import { toast } from '$lib/stores/toast';
  import { api } from '$lib/utils/api';
  import { Eye, EyeOff, Loader } from 'lucide-svelte';

  let loading = $state(false);
  let showPassword = $state(false);
  let form = $state({
    email: '',
    password: '',
    full_name: '',
    date_of_birth: '',
    gender: '',
  });

  let errors = $state<Record<string, string>>({});

  const genderOptions = [
    { value: 'male', label: 'Nam' },
    { value: 'female', label: 'Nữ' },
    { value: 'other', label: 'Khác' },
  ];

  let genderLabel = $derived(genderOptions.find((o) => o.value === form.gender)?.label);

  function clearError(field: string) {
    if (!errors[field]) return;
    const next = { ...errors };
    delete next[field];
    errors = next;
  }

  function validateField(field: string) {
    const result = registerSchema.safeParse(form);
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

  async function handleRegister() {
    const result = registerSchema.safeParse(form);
    if (!result.success) {
      errors = formatZodErrors(result.error);
      return;
    }
    errors = {};

    loading = true;
    const res = await api.post('/auth/register', result.data, { silent: true });
    loading = false;

    if (res.details) {
      errors = res.details;
      return;
    }

    if (res.error) {
      // Show inline error on email field for duplicate email
      if (res.status === 409) {
        errors = { email: res.error };
      } else {
        toast.error(res.error);
      }
      return;
    }

    toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
    goto(resolve('/login'));
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === ' ') {
      e.preventDefault();
    }
  }

  function stripWhitespace(field: 'email' | 'password', e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    const sanitized = target.value.replace(/\s+/g, '');
    if (sanitized !== target.value) {
      form[field] = sanitized;
    }
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
  <form
    onsubmit={(e) => {
      e.preventDefault();
      handleRegister();
    }}
    class="grid gap-5"
  >
    <div class="grid gap-2">
      <Label for="full_name">Họ và tên</Label>
      <Input
        id="full_name"
        bind:value={form.full_name}
        placeholder="Nguyễn Văn A"
        class="rounded-xl"
        onfocus={() => clearError('full_name')}
        onblur={() => validateField('full_name')}
      />
      {#if errors.full_name}
        <span class="text-xs text-destructive">{errors.full_name}</span>
      {/if}
    </div>

    <div class="grid gap-2">
      <Label for="email">Email</Label>
      <Input
        id="email"
        type="email"
        bind:value={form.email}
        placeholder="name@example.com"
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
          bind:value={form.password}
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

    <div class="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
      <div class="grid gap-2">
        <Label for="dob">Ngày sinh</Label>
        <Input
          id="dob"
          type="date"
          bind:value={form.date_of_birth}
          onfocus={() => clearError('date_of_birth')}
          onchange={() => validateField('date_of_birth')}
          onblur={() => validateField('date_of_birth')}
        />
        {#if errors.date_of_birth}
          <span class="text-xs text-destructive">{errors.date_of_birth}</span>
        {/if}
      </div>
      <div class="grid gap-2">
        <Label for="gender">Giới tính</Label>
        <Select.Root
          type="single"
          bind:value={form.gender}
          onOpenChange={(open) => {
            if (open) clearError('gender');
            else validateField('gender');
          }}
        >
          <Select.Trigger class="w-full">
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
        {#if errors.gender}
          <span class="text-xs text-destructive">{errors.gender}</span>
        {/if}
      </div>
    </div>

    <Button type="submit" class="mt-1 w-full  py-5 text-sm font-semibold" disabled={loading}>
      {#if loading}<Loader class="mr-2 h-4 w-4 animate-spin" />{/if}
      Đăng ký
    </Button>
  </form>
</div>
