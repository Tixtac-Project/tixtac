<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
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
  import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
  import { updateProfileSchema, updateSecuritySchema } from '$lib/shared/schemas/auth.schema';
  import { cn } from '$lib/utils';
  import {
    AlertCircle,
    Calendar as CalendarIcon,
    CheckCircle,
    Key,
    Lock,
    Mail,
    Phone,
    ShieldCheck,
    User,
    Users,
  } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';

  const user = $derived($page.data.profile);

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
    if (user) {
      profileForm = {
        full_name: user.full_name ?? '',
        phone: user.phone ?? '',
        date_of_birth: user.date_of_birth ? user.date_of_birth.split('T')[0] : '',
        gender: user.gender ?? 'male',
      };
    }
  });

  async function handleProfileSubmit(e: Event) {
    e.preventDefault();
    const data = {
      ...profileForm,
      date_of_birth: profileForm.date_of_birth || undefined,
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
        if (json.errors) profileErrors = json.errors;
        else toast.error('Dữ liệu không hợp lệ');
      } else {
        toast.error('Lỗi máy chủ');
      }
    } catch {
      toast.error('Mất kết nối');
    } finally {
      isProfileLoading = false;
    }
  }

  // ─── Email Form ──────────────────────────
  let emailForm = $state({ new_email: '', current_password: '' });
  let emailErrors = $state<Record<string, string>>({});
  let isEmailLoading = $state(false);
  let currentEmail = $state('');
  $effect(() => {
    if (user) currentEmail = user.email ?? '';
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
        if (json.errors) emailErrors = json.errors;
        else toast.error('Dữ liệu không hợp lệ');
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
        if (json.errors) passwordErrors = json.errors;
        else toast.error('Dữ liệu không hợp lệ');
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

<div
  class="min-h-screen bg-linear-to-br from-slate-50 to-slate-100/50 py-8 sm:py-12 dark:from-slate-950 dark:to-slate-900"
>
  <div class="mx-auto max-w-3xl px-4 sm:px-6">
    <!-- Header -->
    <div class="mb-8 flex items-center gap-3">
      <div class="rounded-full bg-primary/10 p-2 text-primary">
        <ShieldCheck class="h-6 w-6" />
      </div>
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Quản lý tài khoản</h1>
        <p class="mt-1 text-muted-foreground">Cập nhật thông tin cá nhân, email và bảo mật</p>
      </div>
    </div>

    <div class="space-y-8">
      <!-- Profile Card -->
      <Card class="overflow-hidden border shadow-sm transition-shadow duration-200 hover:shadow-md">
        <form onsubmit={handleProfileSubmit}>
          <CardHeader class="border-b bg-muted/20 pb-4">
            <div class="flex items-center gap-2">
              <User class="h-5 w-5 text-primary" />
              <CardTitle>Thông tin cá nhân</CardTitle>
            </div>
            <CardDescription>Họ tên, số điện thoại, ngày sinh và giới tính</CardDescription>
          </CardHeader>
          <CardContent class="space-y-5 pt-6">
            <!-- Full name -->
            <div class="space-y-2">
              <Label for="fn" class="text-sm font-medium">Họ và tên</Label>
              <div class="relative">
                <User
                  class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="fn"
                  bind:value={profileForm.full_name}
                  class="pl-10"
                  placeholder={profileForm.full_name}
                />
              </div>
              {#if profileErrors.full_name}
                <div class="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle class="h-3.5 w-3.5" />
                  <span>{profileErrors.full_name}</span>
                </div>
              {/if}
            </div>

            <!-- Phone -->
            <div class="space-y-2">
              <Label for="phone" class="text-sm font-medium">Số điện thoại</Label>
              <div class="relative">
                <Phone
                  class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="phone"
                  bind:value={profileForm.phone}
                  class="pl-10"
                  placeholder={profileForm.phone}
                />
              </div>
              {#if profileErrors.phone}
                <div class="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle class="h-3.5 w-3.5" />
                  <span>{profileErrors.phone}</span>
                </div>
              {/if}
            </div>

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
                    <CalendarIcon class="h-4 w-4" />
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
                <div class="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle class="h-3.5 w-3.5" />
                  <span>{profileErrors.date_of_birth}</span>
                </div>
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
                  <Users class="h-4 w-4 text-muted-foreground" />
                  <span>{genderLabel(profileForm.gender)}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Nam</SelectItem>
                  <SelectItem value="female">Nữ</SelectItem>
                  <SelectItem value="other">Khác</SelectItem>
                </SelectContent>
              </Select>
              {#if profileErrors.gender}
                <div class="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle class="h-3.5 w-3.5" />
                  <span>{profileErrors.gender}</span>
                </div>
              {/if}
            </div>
            <div class="space-y-2"></div>
          </CardContent>
          <CardFooter class="border-t bg-muted/10 px-6 py-4">
            <Button type="submit" disabled={isProfileLoading} class="w-full gap-2 sm:w-auto">
              {#if isProfileLoading}
                <span
                  class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                ></span>
              {:else}
                <CheckCircle class="h-4 w-4" />
              {/if}
              Lưu thông tin
            </Button>
          </CardFooter>
        </form>
      </Card>

      <!-- Email Card -->
      <Card class="overflow-hidden border shadow-sm transition-shadow duration-200 hover:shadow-md">
        <form onsubmit={handleEmailSubmit}>
          <CardHeader class="border-b bg-muted/20 pb-4">
            <div class="flex items-center gap-2">
              <Mail class="h-5 w-5 text-primary" />
              <CardTitle>Đổi Email</CardTitle>
            </div>
            <CardDescription>
              Email hiện tại:
              <span class="rounded-md bg-muted px-1.5 py-0.5 font-mono text-sm font-medium">
                {currentEmail}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-5 pt-6">
            <div class="space-y-2">
              <Label for="new_email" class="text-sm font-medium">Email mới</Label>
              <div class="relative">
                <Mail
                  class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
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
                <div class="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle class="h-3.5 w-3.5" />
                  <span>{emailErrors.new_email}</span>
                </div>
              {/if}
            </div>
            <div class="space-y-2">
              <Label for="email_curpwd" class="text-sm font-medium">Mật khẩu hiện tại</Label>
              <div class="relative">
                <Lock
                  class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="email_curpwd"
                  type="password"
                  bind:value={emailForm.current_password}
                  class="pl-10"
                  placeholder="••••••••"
                />
              </div>
              {#if emailErrors.current_password}
                <div class="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle class="h-3.5 w-3.5" />
                  <span>{emailErrors.current_password}</span>
                </div>
              {/if}
            </div>
            <div class="space-y-2"></div>
          </CardContent>
          <CardFooter class="border-t bg-muted/10 px-6 py-4">
            <Button type="submit" disabled={isEmailLoading} class="w-full gap-2 sm:w-auto">
              {#if isEmailLoading}
                <span
                  class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                ></span>
              {:else}
                <Mail class="h-4 w-4" />
              {/if}
              Đổi Email
            </Button>
          </CardFooter>
        </form>
      </Card>

      <!-- Password Card -->
      <Card class="overflow-hidden border shadow-sm transition-shadow duration-200 hover:shadow-md">
        <form onsubmit={handlePasswordSubmit}>
          <CardHeader class="border-b bg-muted/20 pb-4">
            <div class="flex items-center gap-2">
              <Key class="h-5 w-5 text-primary" />
              <CardTitle>Đổi mật khẩu</CardTitle>
            </div>
            <CardDescription>Cần xác nhận mật khẩu hiện tại để bảo vệ tài khoản</CardDescription>
          </CardHeader>
          <CardContent class="space-y-5 pt-6">
            <div class="space-y-2">
              <Label for="pw_cur" class="text-sm font-medium">Mật khẩu hiện tại</Label>
              <div class="relative">
                <Lock
                  class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="pw_cur"
                  type="password"
                  bind:value={passwordForm.current_password}
                  class="pl-10"
                  placeholder="••••••••"
                />
              </div>
              {#if passwordErrors.current_password}
                <div class="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle class="h-3.5 w-3.5" />
                  <span>{passwordErrors.current_password}</span>
                </div>
              {/if}
            </div>
            <div class="space-y-2">
              <Label for="new_pw" class="text-sm font-medium">Mật khẩu mới</Label>
              <div class="relative">
                <Key
                  class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="new_pw"
                  type="password"
                  bind:value={passwordForm.new_password}
                  class="pl-10"
                  placeholder="Tối thiểu 8 ký tự"
                />
              </div>
              {#if passwordErrors.new_password}
                <div class="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle class="h-3.5 w-3.5" />
                  <span>{passwordErrors.new_password}</span>
                </div>
              {/if}
              <p class="text-xs text-muted-foreground">Mật khẩu phải có ít nhất 8 ký tự</p>
            </div>
            <div class="space-y-2">
              <Label for="cf_pw" class="text-sm font-medium">Nhập lại mật khẩu mới</Label>
              <div class="relative">
                <Key
                  class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="cf_pw"
                  type="password"
                  bind:value={passwordForm.confirm_password}
                  class="pl-10"
                  placeholder="••••••••"
                />
              </div>
              {#if passwordErrors.confirm_password}
                <div class="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle class="h-3.5 w-3.5" />
                  <span>{passwordErrors.confirm_password}</span>
                </div>
              {/if}
            </div>
            <div class="space-y-2"></div>
          </CardContent>
          <CardFooter class="border-t bg-muted/10 px-6 py-4">
            <Button type="submit" disabled={isPasswordLoading} class="w-full gap-2 sm:w-auto">
              {#if isPasswordLoading}
                <span
                  class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                ></span>
              {:else}
                <Lock class="h-4 w-4" />
              {/if}
              Đổi mật khẩu
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  </div>
</div>
