<script lang="ts">
  import * as Accordion from '$lib/components/ui/accordion';
  import {
    HelpCircle,
    Lock,
    Mail,
    MessageCircle,
    RefreshCcw,
    Smartphone,
    Ticket,
  } from 'lucide-svelte';
  import { motion } from 'motion-sv';

  interface FaqItem {
    q: string;
    a: string;
    category: 'buying' | 'payment' | 'account';
    icon: typeof HelpCircle;
  }

  interface Category {
    id: 'all' | FaqItem['category'];
    label: string;
  }

  const CATEGORIES: Category[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'buying', label: 'Mua vé' },
    { id: 'payment', label: 'Thanh toán' },
    { id: 'account', label: 'Tài khoản' },
  ];

  const FAQS: FaqItem[] = [
    {
      q: 'Làm thế nào để mua vé trên TixTac?',
      a: 'Bạn chỉ cần chọn sự kiện yêu thích, chọn suất diễn, chọn chỗ ngồi (hoặc khu vực vé đứng), sau đó tiến hành thanh toán. Vé điện tử sẽ được gửi ngay vào tài khoản của bạn.',
      category: 'buying',
      icon: Ticket,
    },
    {
      q: 'Tôi có thể hủy vé và được hoàn tiền không?',
      a: 'Chính sách hoàn vé phụ thuộc vào từng sự kiện. Vui lòng kiểm tra điều khoản hoàn vé trong trang chi tiết sự kiện hoặc liên hệ ban tổ chức để được hỗ trợ.',
      category: 'buying',
      icon: RefreshCcw,
    },
    {
      q: 'Làm sao để nhận vé sau khi thanh toán?',
      a: 'Sau khi thanh toán thành công, vé điện tử sẽ xuất hiện trong mục "Vé của tôi". Bạn có thể xem mã QR và thông tin vé bất kỳ lúc nào.',
      category: 'buying',
      icon: Smartphone,
    },
    {
      q: 'Tôi có thể chuyển nhượng vé cho người khác không?',
      a: 'Hiện tại TixTac chưa hỗ trợ tính năng chuyển nhượng vé. Vui lòng liên hệ ban tổ chức sự kiện nếu bạn cần thay đổi thông tin người tham dự.',
      category: 'buying',
      icon: Ticket,
    },
    {
      q: 'Thanh toán trên TixTac có an toàn không?',
      a: 'Tất cả giao dịch trên TixTac đều được mã hóa đầu cuối (end-to-end encryption). Chúng tôi sử dụng các tiêu chuẩn bảo mật cao nhất để bảo vệ thông tin của bạn.',
      category: 'payment',
      icon: Lock,
    },
    {
      q: 'Tôi quên mật khẩu, phải làm sao?',
      a: 'Hiện tại bạn có thể liên hệ với đội ngũ hỗ trợ qua email support@tixtac.io.vn để được cấp lại mật khẩu. Tính năng quên mật khẩu tự động đang được phát triển.',
      category: 'account',
      icon: Lock,
    },
  ];

  let activeCategory = $state<Category['id']>('all');
  let query = $state('');

  const filtered = $derived(
    FAQS.filter((f) => {
      const matchCat = activeCategory === 'all' || f.category === activeCategory;
      const matchQ =
        query.trim() === '' ||
        f.q.toLowerCase().includes(query.toLowerCase()) ||
        f.a.toLowerCase().includes(query.toLowerCase());
      return matchCat && matchQ;
    }),
  );
</script>

<svelte:head>
  <title>FAQ - TixTac</title>
  <meta
    name="description"
    content="Câu hỏi thường gặp về việc mua vé, thanh toán và sử dụng TixTac."
  />
</svelte:head>

<div class="min-h-screen overflow-x-hidden bg-surface pb-24">
  <!-- ═══ HEADER ═══ -->
  <section
    class="relative overflow-hidden border-b border-border bg-surface-container-lowest px-4 py-16 md:py-24"
  >
    <!-- Ambient blob -->
    <div class="pointer-events-none absolute inset-0" aria-hidden="true">
      <div
        class="absolute -top-1/2 left-1/2 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/20 to-transparent blur-[100px]"
      ></div>
    </div>

    <div class="relative mx-auto max-w-2xl text-center">
      <!-- Icon -->
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary md:h-16 md:w-16"
      >
        <HelpCircle class="size-7 md:size-8" />
      </motion.div>

      <!-- Title -->
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <span class="text-xs font-bold tracking-widest text-primary uppercase">Hỗ trợ</span>
        <h1
          class="mt-3 font-heading text-3xl font-extrabold tracking-tight text-foreground md:text-5xl"
        >
          Câu hỏi thường gặp
        </h1>
        <p class="mt-4 text-sm text-muted-foreground md:text-base">
          Mọi thắc mắc về TixTac đều được giải đáp tại đây.
        </p>
      </motion.div>

      <!-- Search -->
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        class="mt-8"
      >
        <div class="relative mx-auto max-w-md">
          <svg
            class="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            bind:value={query}
            placeholder="Tìm kiếm câu hỏi..."
            aria-label="Tìm kiếm câu hỏi"
            class="w-full rounded-full border border-border bg-surface px-5 py-3 pl-11 text-sm text-foreground transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
        </div>
      </motion.div>

      <!-- Category chips -->
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        class="mt-4 flex flex-wrap justify-center gap-2"
      >
        {#each CATEGORIES as cat (cat.id)}
          <button
            onclick={() => (activeCategory = cat.id)}
            class="rounded-full border px-4 py-1.5 text-xs font-bold tracking-wide transition-all duration-200
              {activeCategory === cat.id
              ? 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20'
              : 'border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground'}"
          >
            {cat.label}
          </button>
        {/each}
      </motion.div>
    </div>
  </section>

  <!-- ═══ ACCORDION ═══ -->
  <section class="mx-auto max-w-2xl px-4 py-12 md:px-6">
    {#if filtered.length === 0}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        class="py-16 text-center"
      >
        <HelpCircle class="mx-auto mb-4 size-10 text-muted-foreground/30" />
        <p class="font-medium text-muted-foreground">Không tìm thấy câu hỏi phù hợp.</p>
        <button
          onclick={() => {
            query = '';
            activeCategory = 'all';
          }}
          class="mt-3 text-sm font-semibold text-primary hover:underline"
        >
          Xoá bộ lọc
        </button>
      </motion.div>
    {:else}
      <Accordion.Root type="multiple" class="flex flex-col gap-3">
        {#each filtered as faq, i (faq.q)}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          >
            <Accordion.Item
              value={faq.q}
              class="overflow-hidden rounded-2xl border border-border bg-surface-container-lowest transition-colors hover:border-primary/30 hover:bg-surface-container"
            >
              <Accordion.Trigger
                class="flex w-full items-center gap-4 px-5 py-4 text-left md:px-6 md:py-5
                  [&[data-state=open]>.faq-icon]:bg-primary/15
                  [&[data-state=open]>.faq-icon]:text-primary"
              >
                <div
                  class="faq-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-container text-muted-foreground transition-colors"
                >
                  <faq.icon class="size-4" />
                </div>
                <span class="flex-1 text-sm font-semibold text-foreground md:text-base">
                  {faq.q}
                </span>
              </Accordion.Trigger>
              <Accordion.Content>
                <div class="pb-5 md:pb-6">
                  <div class="ml-[52px] border-l-2 border-primary/20 pl-4">
                    <p class="text-sm leading-relaxed text-muted-foreground md:text-base">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </Accordion.Content>
            </Accordion.Item>
          </motion.div>
        {/each}
      </Accordion.Root>
    {/if}

    <!-- ═══ CONTACT CTA ═══ -->
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      inViewOptions={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      class="mt-10 flex flex-col items-center gap-5 rounded-3xl border border-border bg-surface-container-lowest p-6 text-center md:flex-row md:gap-6 md:p-8 md:text-left"
    >
      <div
        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary"
      >
        <MessageCircle class="size-5" />
      </div>
      <div class="flex-1">
        <h3 class="font-bold text-foreground">Vẫn còn thắc mắc?</h3>
        <p class="mt-1 text-sm text-muted-foreground">
          Đội ngũ hỗ trợ luôn sẵn sàng giải đáp trong vòng 24 giờ.
        </p>
      </div>
      <a
        href="mailto:support@tixtac.io.vn"
        class="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25"
      >
        <Mail class="size-4" />
        Gửi email
      </a>
    </motion.div>
  </section>
</div>
