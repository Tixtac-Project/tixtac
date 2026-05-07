<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import { CheckCircle, Clock, Mail, MapPin, MessageSquare, Phone, Send } from 'lucide-svelte';
  import { motion } from 'motion-sv';

  let submitted = $state(false);
  let serverError = $state('');
  let loading = $state(false);

  function showForm() {
    submitted = false;
    serverError = '';
  }

  const CONTACT_INFO = [
    {
      icon: Mail,
      label: 'Email hỗ trợ',
      value: 'support@tixtac.io.vn',
      href: 'mailto:support@tixtac.io.vn',
    },
    {
      icon: Phone,
      label: 'Điện thoại',
      value: '+84 123 456 789',
      href: 'tel:+84123456789',
    },
    {
      icon: MapPin,
      label: 'Địa chỉ',
      value: 'UET-VNU, Hòa Lạc, Thạch Thất, Hà Nội',
      href: null,
    },
  ] as const;
</script>

<svelte:head>
  <title>Liên hệ - TixTac</title>
  <meta
    name="description"
    content="Liên hệ với đội ngũ TixTac để được hỗ trợ, hợp tác hoặc góp ý."
  />
</svelte:head>

<div class="min-h-screen overflow-x-hidden bg-surface pb-24">
  <!-- ═══ HERO ═══ -->
  <section
    class="relative overflow-hidden border-b border-border bg-surface-container-lowest px-4 py-16 md:py-24"
  >
    <div class="pointer-events-none absolute inset-0" aria-hidden="true">
      <div
        class="absolute -top-1/2 left-1/2 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/20 to-transparent blur-[100px]"
      ></div>
    </div>

    <div class="relative mx-auto max-w-2xl text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary md:h-16 md:w-16"
      >
        <MessageSquare class="size-7 md:size-8" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <span class="text-xs font-bold tracking-widest text-primary uppercase">Liên hệ</span>
        <h1
          class="mt-3 font-heading text-3xl font-extrabold tracking-tight text-foreground md:text-5xl"
        >
          Chúng tôi lắng nghe
        </h1>
        <p class="mt-4 text-sm text-muted-foreground md:text-base">
          Hỗ trợ, hợp tác hay góp ý — đội ngũ TixTac luôn sẵn sàng phản hồi trong 24 giờ.
        </p>
      </motion.div>
    </div>
  </section>

  <!-- ═══ BODY ═══ -->
  <section class="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-16">
    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
      <!-- ── Form — col 3 ── -->
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        class="overflow-hidden rounded-3xl border border-border bg-surface-container-lowest"
      >
        {#if submitted}
          <!-- ── Success state ── -->
          <div class="flex flex-col items-center px-6 py-16 text-center md:px-10">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: 'spring', stiffness: 220, damping: 18 }}
              class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/15 text-success ring-8 ring-success/10"
            >
              <CheckCircle class="size-10" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              class="space-y-2"
            >
              <h2 class="font-heading text-2xl font-bold text-foreground">Đã gửi thành công!</h2>
              <p class="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
                Cảm ơn bạn đã liên hệ. Đội ngũ TixTac sẽ phản hồi trong thời gian sớm nhất.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              class="mt-8"
            >
              <Button onclick={showForm} variant="outline" class="rounded-full px-7 font-bold">
                <Send class="mr-2 size-4" />
                Gửi tin khác
              </Button>
            </motion.div>
          </div>
        {:else}
          <!-- ── Form ── -->
          <form
            method="POST"
            use:enhance={() => {
              loading = true;
              serverError = '';
              return async ({ result }) => {
                loading = false;
                if (result.type === 'success') {
                  if (result.data?.success) submitted = true;
                  else
                    serverError =
                      String(result.data?.error ?? '') || 'Gửi thất bại, vui lòng thử lại.';
                } else if (result.type === 'failure') {
                  serverError =
                    String(result.data?.error ?? '') || 'Gửi thất bại, vui lòng thử lại.';
                }
              };
            }}
            novalidate
          >
            <!-- Honeypot + time — hidden -->
            <div class="absolute -left-[9999px] opacity-0" aria-hidden="true">
              <input type="text" name="_hp" autocomplete="off" tabindex="-1" />
            </div>
            <input type="hidden" name="_time" value={Date.now()} />

            <!-- Card header -->
            <div class="border-b border-border bg-muted/20 px-6 py-4 md:px-8">
              <h2 class="text-base font-bold text-foreground md:text-lg">Gửi tin nhắn</h2>
              <p class="mt-0.5 text-xs text-muted-foreground">
                Điền thông tin bên dưới, chúng tôi sẽ liên hệ lại sớm nhất.
                <br />
                (Đây là form liên hệ thật, chúng tôi sẽ nhận được email!)
              </p>
            </div>

            <!-- Fields -->
            <div class="space-y-5 px-6 py-6 md:px-8 md:py-7">
              <!-- Name + Email -->
              <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div class="space-y-2">
                  <Label for="name" class="text-sm font-medium">Họ và tên</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Nguyễn Văn A"
                    class={page.form?.errors?.name
                      ? 'border-destructive focus-visible:ring-destructive/20'
                      : ''}
                  />
                  {#if page.form?.errors?.name}
                    <p class="text-xs text-destructive">{page.form.errors.name}</p>
                  {/if}
                </div>
                <div class="space-y-2">
                  <Label for="email" class="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    class={page.form?.errors?.email
                      ? 'border-destructive focus-visible:ring-destructive/20'
                      : ''}
                  />
                  {#if page.form?.errors?.email}
                    <p class="text-xs text-destructive">{page.form.errors.email}</p>
                  {/if}
                </div>
              </div>

              <!-- Subject -->
              <div class="space-y-2">
                <Label for="subject" class="text-sm font-medium">Tiêu đề</Label>
                <Input
                  id="subject"
                  name="subject"
                  placeholder="Tôi cần hỗ trợ về..."
                  class={page.form?.errors?.subject
                    ? 'border-destructive focus-visible:ring-destructive/20'
                    : ''}
                />
                {#if page.form?.errors?.subject}
                  <p class="text-xs text-destructive">{page.form.errors.subject}</p>
                {/if}
              </div>

              <!-- Message -->
              <div class="space-y-2">
                <Label for="message" class="text-sm font-medium">Nội dung</Label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="Mô tả chi tiết vấn đề của bạn..."
                  rows={5}
                  class={page.form?.errors?.message
                    ? 'border-destructive focus-visible:ring-destructive/20'
                    : ''}
                />
                {#if page.form?.errors?.message}
                  <p class="text-xs text-destructive">{page.form.errors.message}</p>
                {/if}
              </div>
            </div>

            <!-- Card footer -->
            <div
              class="flex items-center justify-between gap-4 border-t border-border bg-muted/20 px-6 py-4 md:px-8"
            >
              <div class="min-w-0 flex-1">
                {#if serverError}
                  <p class="truncate text-xs text-destructive">{serverError}</p>
                {:else}
                  <p class="text-xs text-muted-foreground">
                    Phản hồi trong vòng <span class="font-medium text-foreground">24 giờ</span>
                  </p>
                {/if}
              </div>
              <Button
                type="submit"
                disabled={loading}
                class="shrink-0 gap-2 rounded-full font-bold shadow-sm shadow-primary/15 transition-shadow hover:shadow-primary/25"
              >
                {#if loading}
                  <span
                    class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  ></span>
                  Đang gửi...
                {:else}
                  <Send class="size-4" />
                  Gửi tin nhắn
                {/if}
              </Button>
            </div>
          </form>
        {/if}
      </motion.div>

      <!-- ── Sidebar — col 2 ── -->
      <div class="flex flex-col gap-3">
        <!-- Contact cards -->
        {#each CONTACT_INFO as info, i (info.label)}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            class="group flex items-center gap-4 rounded-2xl border border-border bg-surface-container-lowest px-5 py-4 transition-colors hover:border-primary/20 hover:bg-surface-container"
          >
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
            >
              <info.icon class="size-4" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-semibold text-muted-foreground">{info.label}</p>
              {#if info.href}
                <a
                  href={info.href}
                  class="mt-0.5 block truncate text-sm font-medium text-foreground transition-colors hover:text-primary"
                >
                  {info.value}
                </a>
              {:else}
                <p class="mt-0.5 text-sm font-medium text-foreground">{info.value}</p>
              {/if}
            </div>
          </motion.div>
        {/each}

        <!-- Response time card -->
        <motion.div
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.44, ease: [0.16, 1, 0.3, 1] }}
          class="rounded-2xl border border-border bg-surface-container-lowest px-5 py-4"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success"
            >
              <Clock class="size-4" />
            </div>
            <div>
              <p class="text-xs font-semibold text-muted-foreground">Thời gian phản hồi</p>
              <p class="mt-0.5 text-sm font-medium text-foreground">
                Trong vòng <span class="text-success">24 giờ</span>
                làm việc
              </p>
            </div>
          </div>
        </motion.div>

        <!-- Divider note -->
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.52, ease: [0.16, 1, 0.3, 1] }}
          class="px-1 text-xs leading-relaxed text-muted-foreground"
        >
          Ngoài giờ hành chính, chúng tôi vẫn đọc email và sẽ phản hồi vào sáng hôm sau.
        </motion.p>
      </div>
    </div>
  </section>
</div>
