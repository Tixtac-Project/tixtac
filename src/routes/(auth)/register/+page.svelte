<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Select from '$lib/components/ui/select';
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

  function validate() {
    errors = {};
    if (!form.email.includes('@')) errors.email = 'Email không hợp lệ';
    if (form.password.length < 8) errors.password = 'Mật khẩu phải ít nhất 8 ký tự';
    if (!form.full_name) errors.full_name = 'Vui lòng nhập họ tên';
    if (!form.date_of_birth) errors.date_of_birth = 'Vui lòng chọn ngày sinh';
    if (!form.gender) errors.gender = 'Vui lòng chọn giới tính';
    return Object.keys(errors).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    loading = true;

    const { data, error } = await api.post('/auth/register', form);

    loading = false;
    if (!error) {
      toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
      goto(resolve('/login'));
    }
  }
</script>

<div class="flex h-screen w-screen flex-col items-center justify-center">
  <Card.Root class="w-full max-w-100" style="view-transition-name: auth-card;">
    <Card.Header class="space-y-1 text-center">
      <Card.Title class="text-2xl font-bold">Đăng ký tài khoản</Card.Title>
      <Card.Description>Nhập thông tin của bạn để tạo tài khoản mới</Card.Description>
    </Card.Header>

    <form
      onsubmit={(e) => {
        e.preventDefault();
        handleRegister();
      }}
      class="grid gap-4"
    >
      <Card.Content>
        <div class="grid gap-4">
          <div class="grid gap-2">
            <Label for="full_name">Họ và tên</Label>
            <Input id="full_name" bind:value={form.full_name} placeholder="Nguyễn Văn A" />
            {#if errors.full_name}
              <span class="text-xs text-destructive">{errors.full_name}</span>
            {/if}
          </div>

          <div class="grid gap-2">
            <Label for="email">Email</Label>
            <Input id="email" type="email" bind:value={form.email} placeholder="name@example.com" />
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
                bind:value={form.password}
                class="pr-10"
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

          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="dob">Ngày sinh</Label>
              <Input id="dob" type="date" bind:value={form.date_of_birth} />
              {#if errors.date_of_birth}
                <span class="text-xs text-destructive">{errors.date_of_birth}</span>
              {/if}
            </div>
            <div class="grid gap-2">
              <Label for="gender">Giới tính</Label>
              <Select.Root type="single" bind:value={form.gender}>
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
                    {#each genderOptions as option}
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
        </div>
      </Card.Content>

      <Card.Footer class="flex flex-col gap-4">
        <Button type="submit" class="w-full" disabled={loading}>
          {#if loading}<Loader class="mr-2 h-4 w-4 animate-spin" />{/if}
          Đăng ký
        </Button>
        <div class="text-center text-sm">
          Đã có tài khoản?
          <a href={resolve('/login')} class="text-primary underline underline-offset-4">
            Đăng nhập
          </a>
        </div>
      </Card.Footer>
    </form>
  </Card.Root>
</div>
