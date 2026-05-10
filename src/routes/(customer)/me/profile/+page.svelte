<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import ProfileSidebar from '$lib/components/customer/layout/ProfileSidebar.svelte';
  import { Button } from '$lib/components/ui/button';
  import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { PasswordInput } from '$lib/components/ui/password-input';
  import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
  import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
  } from '$lib/components/ui/select';
  import {
    updateEmailSchema,
    updatePasswordSchema,
    updateProfileSchema,
  } from '$lib/shared/schemas/auth.schema';
  import { toast } from '$lib/stores/toast';
  import { cn } from '$lib/utils';
  import { api } from '$lib/utils/api';
  import { handleLogout as sharedLogout } from '$lib/utils/auth';
  import {
    AlertCircle,
    Calendar as CalendarIcon,
    CheckCircle,
    Key,
    Lock,
    LogOut,
    Mail,
    Phone,
    ShieldCheck,
    User,
    Users,
  } from 'lucide-svelte';
  import { superForm } from 'sveltekit-superforms';
  import { zod4Client } from 'sveltekit-superforms/adapters';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const profile = $derived(page.data.profile);

  // ─── Profile Form ──────────────────────────
  const {
    form: pForm,
    errors: pErrors,
    validateForm: pValidate,
    validate: pV,
  } = $derived(
    superForm(data.profileForm, { validators: zod4Client(updateProfileSchema), id: 'profile' }),
  );
  let isProfileLoading = $state(false);

  // ─── Email Form ──────────────────────────
  const {
    form: eForm,
    errors: eErrors,
    validateForm: eValidate,
    validate: eV,
  } = $derived(
    superForm(data.emailForm, { validators: zod4Client(updateEmailSchema), id: 'email' }),
  );
  let isEmailLoading = $state(false);
  let currentEmail = $state('');
  $effect(() => {
    if (profile) currentEmail = profile.email ?? '';
  });

  // ─── Password Form ──────────────────────────
  const {
    form: pwForm,
    errors: pwErrors,
    validateForm: pwValidate,
    validate: pwV,
    reset: pwReset,
  } = $derived(
    superForm(data.passwordForm, {
      validators: zod4Client(updatePasswordSchema),
      id: 'password',
    }),
  );
  let isPasswordLoading = $state(false);

  // ─── Profile Submit ──────────────────────────
  async function handleProfileSubmit(e: Event) {
    e.preventDefault();
    const result = await pValidate({ update: true });
    if (!result.valid) return;

    isProfileLoading = true;
    const res = await api.patch('/me/profile', $pForm, { silent: true });
    isProfileLoading = false;

    if (res.error) return;
    toast.success('Đã lưu thông tin');
    await invalidateAll();
  }

  // ─── Email Submit ──────────────────────────
  async function handleEmailSubmit(e: Event) {
    e.preventDefault();
    const result = await eValidate({ update: true });
    if (!result.valid) return;

    isEmailLoading = true;
    const res = await api.patch(
      '/me/security',
      { current_password: $eForm.current_password, new_email: $eForm.new_email },
      { silent: true },
    );
    isEmailLoading = false;

    if (res.error) return;
    toast.success('Email đã được đổi');
    currentEmail = $eForm.new_email ?? '';
    eForm.update((f) => {
      f.new_email = '';
      f.current_password = '';
      return f;
    });
    await invalidateAll();
  }

  // ─── Password Submit ──────────────────────────
  async function handlePasswordSubmit(e: Event) {
    e.preventDefault();
    const result = await pwValidate({ update: true });
    if (!result.valid) return;

    isPasswordLoading = true;
    const res = await api.patch(
      '/me/security',
      { current_password: $pwForm.current_password, new_password: $pwForm.new_password },
      { silent: true },
    );
    isPasswordLoading = false;

    if (res.error) return;
    toast.success('Mật khẩu đã được đổi');
    pwReset();
  }

  function genderLabel(g: string) {
    if (g === 'male') return 'Nam';
    if (g === 'female') return 'Nữ';
    if (g === 'other') return 'Khác';
    return 'Chọn';
  }

  let isLoggingOut = $state(false);
</script>

<svelte:head>
  <title>Quản lý tài khoản</title>
</svelte:head>

<div class="mx-auto flex max-w-7xl gap-8 px-4 py-6 md:gap-10 md:px-8 md:py-10 lg:gap-12 lg:px-10">
  <!-- Sidebar -->
  <aside class="hidden w-52 shrink-0 md:block lg:w-56">
    <div class="sticky top-24">
      <ProfileSidebar
        onItemClick={(id) => {
          const el = document.getElementById(id);
          el?.scrollIntoView({ behavior: 'smooth' });
        }}
      />
    </div>
  </aside>

  <!-- Content -->
  <div class="min-w-0 flex-1">
    <!-- Header -->
    <div class="mb-8 flex items-center gap-3.5 md:mb-10">
      <div class="rounded-xl bg-primary/10 p-2.5 text-primary">
        <ShieldCheck class="size-5 md:size-6" />
      </div>
      <div>
        <h1 class="text-xl font-bold tracking-tight md:text-2xl">Quản lý tài khoản</h1>
        <p class="mt-0.5 text-sm text-muted-foreground">
          Cập nhật thông tin cá nhân, email và bảo mật
        </p>
      </div>
    </div>

    <div class="space-y-5 md:space-y-6">
      <!-- ═══ Profile Card ═══ -->
      <Card id="profile" class="scroll-mt-20 overflow-hidden py-0!">
        <form onsubmit={handleProfileSubmit} novalidate>
          <CardHeader class="border-b bg-muted/30 px-5 py-4 md:px-6">
            <div class="flex items-center gap-2.5">
              <User class="size-4 text-primary md:size-5" />
              <CardTitle class="text-base md:text-lg">Thông tin cá nhân</CardTitle>
            </div>
            <CardDescription class="mt-1 text-xs md:text-sm">
              Họ tên, số điện thoại, ngày sinh và giới tính
            </CardDescription>
          </CardHeader>

          <CardContent class="px-5 py-5 md:px-6 md:py-6">
            <div class="space-y-5">
              <!-- Full name -->
              <div class="space-y-2">
                <Label for="fn" class="text-sm font-medium">Họ và tên</Label>
                <div class="relative">
                  <User
                    class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="fn"
                    name="full_name"
                    bind:value={$pForm.full_name}
                    onblur={() => pV('full_name')}
                    class="pl-10"
                    placeholder="Nguyễn Văn A"
                    aria-invalid={$pErrors.full_name ? 'true' : undefined}
                  />
                </div>
                {#if $pErrors.full_name}
                  <p class="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle class="size-3.5 shrink-0" />{$pErrors.full_name[0]}
                  </p>
                {/if}
              </div>

              <!-- Phone -->
              <div class="space-y-2">
                <Label for="phone" class="text-sm font-medium">Số điện thoại</Label>
                <div class="relative">
                  <Phone
                    class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="phone"
                    name="phone"
                    bind:value={$pForm.phone}
                    onblur={() => pV('phone')}
                    class="pl-10"
                    placeholder="0912 345 678"
                    aria-invalid={$pErrors.phone ? 'true' : undefined}
                  />
                </div>
                {#if $pErrors.phone}
                  <p class="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle class="size-3.5 shrink-0" />{$pErrors.phone[0]}
                  </p>
                {/if}
              </div>

              <!-- Date of birth + Gender -->
              <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div class="space-y-2">
                  <Label class="text-sm font-medium">Ngày sinh</Label>
                  <Popover>
                    <PopoverTrigger>
                      <Button
                        variant="outline"
                        class={cn(
                          'w-full justify-start gap-2 font-normal',
                          !$pForm.date_of_birth && 'text-muted-foreground',
                        )}
                      >
                        <CalendarIcon class="size-4 shrink-0" />
                        {$pForm.date_of_birth
                          ? new Date($pForm.date_of_birth).toLocaleDateString('vi-VN')
                          : 'Chọn ngày'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent class="w-auto p-0">
                      <Input
                        type="date"
                        bind:value={$pForm.date_of_birth}
                        onblur={() => pV('date_of_birth')}
                      />
                    </PopoverContent>
                  </Popover>
                  {#if $pErrors.date_of_birth}
                    <p class="flex items-center gap-1.5 text-xs text-destructive">
                      <AlertCircle class="size-3.5 shrink-0" />{$pErrors.date_of_birth[0]}
                    </p>
                  {/if}
                </div>

                <div class="space-y-2">
                  <Label for="gender" class="text-sm font-medium">Giới tính</Label>
                  <Select
                    type="single"
                    value={$pForm.gender}
                    onValueChange={(value: string | undefined) => {
                      if (value) $pForm.gender = value as 'male' | 'female' | 'other';
                    }}
                  >
                    <SelectTrigger id="gender" class="gap-2">
                      <Users class="size-4 text-muted-foreground" />
                      <span>{genderLabel($pForm.gender)}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Giới tính</SelectLabel>
                        <SelectItem value="male">Nam</SelectItem>
                        <SelectItem value="female">Nữ</SelectItem>
                        <SelectItem value="other">Khác</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {#if $pErrors.gender}
                    <p class="flex items-center gap-1.5 text-xs text-destructive">
                      <AlertCircle class="size-3.5 shrink-0" />{$pErrors.gender[0]}
                    </p>
                  {/if}
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter class="border-t bg-muted/20 px-5 py-4 md:px-6">
            <Button type="submit" disabled={isProfileLoading} class="gap-2 md:w-auto">
              {#if isProfileLoading}
                <span
                  class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                ></span>
              {:else}
                <CheckCircle class="size-4" />
              {/if}
              Lưu thông tin
            </Button>
          </CardFooter>
        </form>
      </Card>

      <!-- ═══ Email Card ═══ -->
      <Card id="email" class="scroll-mt-20 overflow-hidden py-0!">
        <form onsubmit={handleEmailSubmit} novalidate>
          <CardHeader class="border-b bg-muted/30 px-5 py-4 md:px-6">
            <div class="flex items-center gap-2.5">
              <Mail class="size-4 text-primary md:size-5" />
              <CardTitle class="text-base md:text-lg">Đổi Email</CardTitle>
            </div>
            <CardDescription class="mt-1 text-xs md:text-sm">
              Email hiện tại:&nbsp;
              <span
                class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-foreground"
              >
                {currentEmail}
              </span>
            </CardDescription>
          </CardHeader>

          <CardContent class="px-5 py-5 md:px-6 md:py-6">
            <div class="space-y-5">
              <div class="space-y-2">
                <Label for="new_email" class="text-sm font-medium">Email mới</Label>
                <div class="relative">
                  <Mail
                    class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="new_email"
                    name="new_email"
                    type="email"
                    bind:value={$eForm.new_email}
                    onblur={() => eV('new_email')}
                    class="pl-10"
                    placeholder="example@mail.com"
                    aria-invalid={$eErrors.new_email ? 'true' : undefined}
                  />
                </div>
                {#if $eErrors.new_email}
                  <p class="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle class="size-3.5 shrink-0" />{$eErrors.new_email[0]}
                  </p>
                {/if}
              </div>
              <div class="space-y-2">
                <Label for="email_curpwd" class="text-sm font-medium">Mật khẩu hiện tại</Label>
                <PasswordInput
                  id="email_curpwd"
                  name="current_password"
                  bind:value={$eForm.current_password}
                  onblur={() => eV('current_password')}
                  disabled={isEmailLoading}
                  error={!!$eErrors.current_password}
                />
                {#if $eErrors.current_password}
                  <p class="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle class="size-3.5 shrink-0" />{$eErrors.current_password[0]}
                  </p>
                {/if}
              </div>
            </div>
          </CardContent>

          <CardFooter class="border-t bg-muted/20 px-5 py-4 md:px-6">
            <Button type="submit" disabled={isEmailLoading} class="gap-2 md:w-auto">
              {#if isEmailLoading}
                <span
                  class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                ></span>
              {:else}
                <Mail class="size-4" />
              {/if}
              Đổi Email
            </Button>
          </CardFooter>
        </form>
      </Card>

      <!-- ═══ Password Card ═══ -->
      <Card id="password" class="scroll-mt-20 overflow-hidden py-0!">
        <form onsubmit={handlePasswordSubmit} novalidate>
          <CardHeader class="border-b bg-muted/30 px-5 py-4 md:px-6">
            <div class="flex items-center gap-2.5">
              <Key class="size-4 text-primary md:size-5" />
              <CardTitle class="text-base md:text-lg">Đổi mật khẩu</CardTitle>
            </div>
            <CardDescription class="mt-1 text-xs md:text-sm">
              Cần xác nhận mật khẩu hiện tại để bảo vệ tài khoản
            </CardDescription>
          </CardHeader>

          <CardContent class="px-5 py-5 md:px-6 md:py-6">
            <div class="space-y-5">
              <div class="space-y-2">
                <Label for="pw_cur" class="text-sm font-medium">Mật khẩu hiện tại</Label>
                <PasswordInput
                  id="pw_cur"
                  name="current_password"
                  bind:value={$pwForm.current_password}
                  onblur={() => pwV('current_password')}
                  disabled={isPasswordLoading}
                  error={!!$pwErrors.current_password}
                />
                {#if $pwErrors.current_password}
                  <p class="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle class="size-3.5 shrink-0" />{$pwErrors.current_password[0]}
                  </p>
                {/if}
              </div>

              <div class="space-y-2">
                <Label for="new_pw" class="text-sm font-medium">Mật khẩu mới</Label>
                <PasswordInput
                  id="new_pw"
                  name="new_password"
                  autocomplete="new-password"
                  bind:value={$pwForm.new_password}
                  onblur={() => pwV('new_password')}
                  disabled={isPasswordLoading}
                  error={!!$pwErrors.new_password}
                />
                {#if $pwErrors.new_password}
                  <p class="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle class="size-3.5 shrink-0" />{$pwErrors.new_password[0]}
                  </p>
                {/if}
              </div>

              <div class="space-y-2">
                <Label for="confirm_pw" class="text-sm font-medium">Xác nhận mật khẩu mới</Label>
                <PasswordInput
                  id="confirm_pw"
                  name="confirm_password"
                  autocomplete="new-password"
                  bind:value={$pwForm.confirm_password}
                  onblur={() => pwV('confirm_password')}
                  disabled={isPasswordLoading}
                  error={!!$pwErrors.confirm_password}
                />
                {#if $pwErrors.confirm_password}
                  <p class="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle class="size-3.5 shrink-0" />{$pwErrors.confirm_password[0]}
                  </p>
                {/if}
              </div>
            </div>
          </CardContent>

          <CardFooter class="border-t bg-muted/20 px-5 py-4 md:px-6">
            <Button type="submit" disabled={isPasswordLoading} class="gap-2 md:w-auto">
              {#if isPasswordLoading}
                <span
                  class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                ></span>
              {:else}
                <Lock class="size-4" />
              {/if}
              Đổi mật khẩu
            </Button>
          </CardFooter>
        </form>
      </Card>

      <!-- ═══ Logout Box ═══ -->
      <div
        class="flex items-center justify-between rounded-xl border border-danger/30 bg-surface-container-lowest px-5 py-4 md:px-6"
      >
        <div class="flex items-center gap-2.5">
          <LogOut class="size-4 text-destructive md:size-5" />
          <span class="text-sm font-medium text-foreground">Phiên đăng nhập</span>
        </div>
        <form action={resolve('/api/auth/logout')} method="POST">
          <Button
            variant="destructive"
            type="submit"
            disabled={isLoggingOut}
            onclick={() => {
              isLoggingOut = true;
              sharedLogout();
            }}
            class="gap-2"
          >
            {#if isLoggingOut}
              <span
                class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              ></span>
            {:else}
              <LogOut class="size-4" />
            {/if}
            Đăng xuất
          </Button>
        </form>
      </div>
    </div>
  </div>
</div>
