<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
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
  import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
  import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
  } from '$lib/components/ui/select';
  import { updateProfileSchema, updateSecuritySchema } from '$lib/shared/schemas/auth.schema';
  import { cn } from '$lib/utils';
  import {
    AlertCircle,
    Calendar as CalendarIcon,
    CheckCircle,
    Eye,
    EyeOff,
    Key,
    Lock,
    Mail,
    Phone,
    ShieldCheck,
    User,
    Users,
  } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';

  const profile = $derived(page.data.profile);

  // ─── Profile Form ──────────────────────────
  let profileForm = $state({
    full_name: '',
    phone: '',
    date_of_birth: '',
    gender: 'male' as 'male' | 'female' | 'other',
  });

  let profileErrors = $state<Record<string, string>>({});
  let isProfileLoading = $state(false);

  $effect(() => {
    if (profile) {
      profileForm = {
        full_name: profile.full_name ?? '',
        phone: profile.phone ?? '',
        date_of_birth: profile.date_of_birth ? profile.date_of_birth.split('T')[0] : '',
        gender: profile.gender ?? 'male',
      };
    }
  });

  async function handleProfileSubmit(e: Event) {
    e.preventDefault();
    const data = {
      ...profileForm,
      date_of_birth: profileForm.date_of_birth || undefined,
      phone: profileForm.phone || null,
    };
    const result = updateProfileSchema.safeParse(data);
    if (!result.success) {
      profileErrors = Object.fromEntries(
        result.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
      );
      return;
    }
    profileErrors = {};
    isProfileLoading = true;
    try {
      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      });
      if (res.ok) {
        toast.success('Đã lưu thông tin');
        await invalidateAll();
      } else if (res.status === 400) {
        const json = await res.json();
        if (json.errors?.details) {
          profileErrors = json.errors.details;
        } else if (json.errors) {
          profileErrors = json.errors;
        } else {
          toast.error('Dữ liệu không hợp lệ');
        }
      } else {
        toast.error('Lỗi máy chủ');
      }
    } catch {
      toast.error('Mất kết nối');
    } finally {
      isProfileLoading = false;
    }
  }

  // ─── Password visibility toggles ──────────
  let showEmailPwd = $state(false);
  let showCurPwd = $state(false);
  let showNewPwd = $state(false);
  let showCfPwd = $state(false);

  // ─── Email Form ──────────────────────────
  let emailForm = $state({ new_email: '', current_password: '' });
  let emailErrors = $state<Record<string, string>>({});
  let isEmailLoading = $state(false);
  let currentEmail = $state('');
  $effect(() => {
    if (profile) currentEmail = profile.email ?? '';
  });

  async function handleEmailSubmit(e: Event) {
    e.preventDefault();
    const result = updateSecuritySchema.safeParse({
      current_password: emailForm.current_password,
      new_email: emailForm.new_email,
    });
    if (!result.success) {
      emailErrors = Object.fromEntries(
        result.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
      );
      return;
    }
    emailErrors = {};
    isEmailLoading = true;
    try {
      const res = await fetch('/api/me/security', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      });
      if (res.ok) {
        toast.success('Email đã được đổi');
        currentEmail = emailForm.new_email;
        emailForm = { new_email: '', current_password: '' };
        await invalidateAll();
      } else if (res.status === 400) {
        const json = await res.json();
        if (json.errors?.details) {
          emailErrors = json.errors.details;
        } else if (json.errors) {
          profileErrors = json.errors;
        } else {
          toast.error('Dữ liệu không hợp lệ');
        }
      } else {
        toast.error('Lỗi máy chủ');
      }
    } catch {
      toast.error('Mất kết nối');
    } finally {
      isEmailLoading = false;
    }
  }

  // ─── Password Form ──────────────────────────
  let passwordForm = $state({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  let passwordErrors = $state<Record<string, string>>({});
  let isPasswordLoading = $state(false);

  async function handlePasswordSubmit(e: Event) {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      passwordErrors = { confirm_password: 'Mật khẩu mới không khớp' };
      return;
    }
    const result = updateSecuritySchema.safeParse({
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password,
    });
    if (!result.success) {
      passwordErrors = Object.fromEntries(
        result.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
      );
      return;
    }
    passwordErrors = {};
    isPasswordLoading = true;
    try {
      const res = await fetch('/api/me/security', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      });
      if (res.ok) {
        toast.success('Mật khẩu đã được đổi');
        passwordForm = { current_password: '', new_password: '', confirm_password: '' };
      } else if (res.status === 400) {
        const json = await res.json();
        if (json.errors?.details) {
          passwordErrors = json.errors.details;
        } else if (json.errors) {
          profileErrors = json.errors;
        } else {
          toast.error('Dữ liệu không hợp lệ');
        }
      } else {
        toast.error('Lỗi máy chủ');
      }
    } catch {
      toast.error('Mất kết nối');
    } finally {
      isPasswordLoading = false;
    }
  }

  function genderLabel(g: string) {
    if (g === 'male') return 'Nam';
    if (g === 'female') return 'Nữ';
    if (g === 'other') return 'Khác';
    return 'Chọn';
  }
</script>

<svelte:head>
  <title>Quản lý tài khoản</title>
</svelte:head>

<div class="min-h-screen bg-surface py-8 md:py-14">
  <div class="mx-auto max-w-2xl px-4 md:px-6">
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
      <Card class="overflow-hidden py-0!">
        <form onsubmit={handleProfileSubmit}>
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
                    bind:value={profileForm.full_name}
                    class="pl-10"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                {#if profileErrors.full_name}
                  <p class="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle class="size-3.5 shrink-0" />{profileErrors.full_name}
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
                    bind:value={profileForm.phone}
                    class="pl-10"
                    placeholder="0912 345 678"
                  />
                </div>
                {#if profileErrors.phone}
                  <p class="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle class="size-3.5 shrink-0" />{profileErrors.phone}
                  </p>
                {/if}
              </div>

              <!-- Date of birth + Gender (side-by-side on desktop) -->
              <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
                <!-- Date of birth -->
                <div class="space-y-2">
                  <Label class="text-sm font-medium">Ngày sinh</Label>
                  <Popover>
                    <PopoverTrigger>
                      <Button
                        variant="outline"
                        class={cn(
                          'w-full justify-start gap-2 font-normal',
                          !profileForm.date_of_birth && 'text-muted-foreground',
                        )}
                      >
                        <CalendarIcon class="size-4 shrink-0" />
                        {profileForm.date_of_birth
                          ? new Date(profileForm.date_of_birth).toLocaleDateString('vi-VN')
                          : 'Chọn ngày'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent class="w-auto p-0">
                      <Input type="date" bind:value={profileForm.date_of_birth} />
                    </PopoverContent>
                  </Popover>
                  {#if profileErrors.date_of_birth}
                    <p class="flex items-center gap-1.5 text-xs text-destructive">
                      <AlertCircle class="size-3.5 shrink-0" />{profileErrors.date_of_birth}
                    </p>
                  {/if}
                </div>

                <!-- Gender -->
                <div class="space-y-2">
                  <Label for="gender" class="text-sm font-medium">Giới tính</Label>
                  <Select
                    type="single"
                    value={profileForm.gender}
                    onValueChange={(value: string) => {
                      profileForm.gender = value as 'male' | 'female' | 'other';
                    }}
                  >
                    <SelectTrigger id="gender" class="gap-2">
                      <Users class="size-4 text-muted-foreground" />
                      <span>{genderLabel(profileForm.gender)}</span>
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
                  {#if profileErrors.gender}
                    <p class="flex items-center gap-1.5 text-xs text-destructive">
                      <AlertCircle class="size-3.5 shrink-0" />{profileErrors.gender}
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
      <Card class="overflow-hidden py-0!">
        <form onsubmit={handleEmailSubmit}>
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
                    type="email"
                    bind:value={emailForm.new_email}
                    class="pl-10"
                    placeholder="example@mail.com"
                  />
                </div>
                {#if emailErrors.new_email}
                  <p class="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle class="size-3.5 shrink-0" />{emailErrors.new_email}
                  </p>
                {/if}
              </div>
              <div class="space-y-2">
                <Label for="email_curpwd" class="text-sm font-medium">Mật khẩu hiện tại</Label>
                <div
                  class="flex h-10 w-full rounded-md border border-input bg-transparent ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                >
                  <div class="flex items-center pl-3 text-muted-foreground">
                    <Lock class="size-4 shrink-0" />
                  </div>
                  <input
                    id="email_curpwd"
                    type={showEmailPwd ? 'text' : 'password'}
                    bind:value={emailForm.current_password}
                    placeholder="••••••••"
                    class="h-full flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onclick={() => (showEmailPwd = !showEmailPwd)}
                    class="flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showEmailPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {#if showEmailPwd}
                      <EyeOff class="size-4 shrink-0" />
                    {:else}
                      <Eye class="size-4 shrink-0" />
                    {/if}
                  </button>
                </div>
                {#if emailErrors.current_password}
                  <p class="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle class="size-3.5 shrink-0" />{emailErrors.current_password}
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
      <Card class="overflow-hidden py-0!">
        <form onsubmit={handlePasswordSubmit}>
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
                <div
                  class="flex h-10 w-full rounded-md border border-input bg-transparent ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                >
                  <div class="flex items-center pl-3 text-muted-foreground">
                    <Lock class="size-4 shrink-0" />
                  </div>
                  <input
                    id="pw_cur"
                    type={showCurPwd ? 'text' : 'password'}
                    bind:value={passwordForm.current_password}
                    placeholder="••••••••"
                    class="h-full flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onclick={() => (showCurPwd = !showCurPwd)}
                    class="flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showCurPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {#if showCurPwd}
                      <EyeOff class="size-4 shrink-0" />
                    {:else}
                      <Eye class="size-4 shrink-0" />
                    {/if}
                  </button>
                </div>
                {#if passwordErrors.current_password}
                  <p class="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle class="size-3.5 shrink-0" />{passwordErrors.current_password}
                  </p>
                {/if}
              </div>

              <!-- New + Confirm side-by-side on desktop -->
              <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div class="space-y-2">
                  <Label for="new_pw" class="text-sm font-medium">Mật khẩu mới</Label>
                  <div
                    class="flex h-10 w-full rounded-md border border-input bg-transparent ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                  >
                    <div class="flex items-center pl-3 text-muted-foreground">
                      <Key class="size-4 shrink-0" />
                    </div>
                    <input
                      id="new_pw"
                      type={showNewPwd ? 'text' : 'password'}
                      bind:value={passwordForm.new_password}
                      placeholder="••••••••"
                      class="h-full flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
                    />
                    <button
                      type="button"
                      onclick={() => (showNewPwd = !showNewPwd)}
                      class="flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showNewPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {#if showNewPwd}
                        <EyeOff class="size-4 shrink-0" />
                      {:else}
                        <Eye class="size-4 shrink-0" />
                      {/if}
                    </button>
                  </div>
                  {#if passwordErrors.new_password}
                    <p class="flex items-center gap-1.5 text-xs text-destructive">
                      <AlertCircle class="size-3.5 shrink-0" />{passwordErrors.new_password}
                    </p>
                  {:else}
                    <p class="text-xs text-muted-foreground">Tối thiểu 8 ký tự</p>
                  {/if}
                </div>
                <div class="space-y-2">
                  <Label for="cf_pw" class="text-sm font-medium">Nhập lại mật khẩu mới</Label>
                  <div
                    class="flex h-10 w-full rounded-md border border-input bg-transparent ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                  >
                    <div class="flex items-center pl-3 text-muted-foreground">
                      <Key class="size-4 shrink-0" />
                    </div>
                    <input
                      id="cf_pw"
                      type={showCfPwd ? 'text' : 'password'}
                      bind:value={passwordForm.confirm_password}
                      placeholder="••••••••"
                      class="h-full flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
                    />
                    <button
                      type="button"
                      onclick={() => (showCfPwd = !showCfPwd)}
                      class="flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showCfPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {#if showCfPwd}
                        <EyeOff class="size-4 shrink-0" />
                      {:else}
                        <Eye class="size-4 shrink-0" />
                      {/if}
                    </button>
                  </div>
                  {#if passwordErrors.confirm_password}
                    <p class="flex items-center gap-1.5 text-xs text-destructive">
                      <AlertCircle class="size-3.5 shrink-0" />{passwordErrors.confirm_password}
                    </p>
                  {/if}
                </div>
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
    </div>
  </div>
</div>
