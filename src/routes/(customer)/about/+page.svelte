<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Building2, Globe, Heart, Shield, Sparkles, Ticket, Zap } from 'lucide-svelte';
  import { motion } from 'motion-sv';

  interface StatItem {
    label: string;
    compact: string;
    highlight?: boolean;
  }

  const STATS: StatItem[] = [
    { label: 'Sự kiện đồng hành', compact: '500+' },
    { label: 'Khán giả tin chọn', compact: '1M+' },
    { label: 'Nhà tổ chức hợp tác', compact: '200+' },
    { label: 'Trải nghiệm xuyên suốt', compact: '99.9%', highlight: true },
  ];

  interface ValueItem {
    icon: typeof Shield;
    iconBg: string;
    title: string;
    desc: string;
    span?: boolean;
    extra?: string;
    gradient?: boolean;
    heartFill?: boolean;
  }

  const VALUES: ValueItem[] = [
    {
      icon: Shield,
      iconBg: 'bg-primary/15 text-primary',
      title: 'Minh bạch & An tâm tuyệt đối',
      desc: 'Không phí ẩn, không lo vé giả. Mọi thông tin từ sơ đồ ghế đến giá tiền đều rõ ràng ngay từ ánh nhìn đầu tiên. Bạn chỉ việc chọn chỗ ưng ý nhất.',
      span: true,
      extra: 'Giao dịch an toàn, bảo mật 100%',
    },
    {
      icon: Zap,
      iconBg: 'bg-tertiary/15 text-tertiary',
      title: 'Mượt mà từng cú chạm',
      desc: 'Hiểu được cảm giác hồi hộp khi "săn" vé, chúng tôi duy trì hệ thống ổn định để bạn không bao giờ phải thấy lỗi máy chủ lúc quyết định.',
    },
    {
      icon: Sparkles,
      iconBg: 'bg-primary/15 text-primary',
      title: 'Đơn giản hóa mọi thao tác',
      desc: 'Từ lúc mở web đến khi nhận vé điện tử, tất cả chỉ gói gọn trong vài bước trực quan để bất kỳ ai cũng có thể sử dụng dễ dàng.',
    },
    {
      icon: Heart,
      iconBg: 'bg-foreground/10 text-foreground backdrop-blur-md',
      title: 'Xây dựng từ góc nhìn khán giả',
      desc: 'Đội ngũ TixTac cũng là những người yêu âm nhạc, mê sân khấu. Chúng tôi tạo ra nền tảng này để giải quyết chính những rắc rối mà bản thân từng gặp phải khi đi xem show.',
      span: true,
      gradient: true,
      heartFill: true,
    },
  ];

  const HIGHLIGHTS = [
    {
      icon: Globe,
      title: 'Đa dạng trải nghiệm',
      desc: 'Từ concert quy mô lớn ở sân vận động đến những đêm nhạc indie ấm cúng. Dù gu của bạn là gì, TixTac luôn có sự kiện dành cho bạn.',
    },
    {
      icon: Building2,
      title: 'Đồng hành cùng nhà tổ chức',
      desc: 'Làm việc trực tiếp với các đơn vị tổ chức uy tín, chúng tôi đảm bảo quyền lợi tối đa cho khán giả và mang đến những sự kiện chất lượng nhất.',
    },
  ] as const;
</script>

<svelte:head>
  <title>Về TixTac - Sống trọn từng khoảnh khắc</title>
  <meta
    name="description"
    content="TixTac - Nền tảng đặt vé sự kiện hàng đầu Việt Nam. Khám phá câu chuyện và sứ mệnh của chúng tôi."
  />
</svelte:head>

<div class="min-h-screen overflow-x-hidden bg-surface pb-24">
  <!-- ═══ HERO ═══ -->
  <section class="relative overflow-hidden px-4 py-20 md:px-8 md:py-32 lg:px-12">
    <!-- Ambient blobs -->
    <div class="pointer-events-none absolute inset-0" aria-hidden="true">
      <div
        class="absolute -top-1/4 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-primary/20 via-secondary/10 to-transparent blur-[120px]"
      ></div>
      <div
        class="absolute top-1/2 -right-1/4 h-[350px] w-[450px] rounded-full bg-gradient-to-bl from-tertiary/15 to-transparent blur-[100px]"
      ></div>
    </div>

    <div class="relative mx-auto max-w-4xl text-center">
      <!-- Badge -->
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <span
          class="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold tracking-widest text-primary uppercase backdrop-blur-md"
        >
          <Sparkles class="size-3 animate-pulse" />
          Câu chuyện của TixTac
        </span>
      </motion.div>

      <!-- Headline -->
      <motion.h1
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        class="mt-6 font-heading text-4xl font-black tracking-tighter text-foreground uppercase sm:text-5xl md:text-6xl lg:text-[5rem] lg:leading-[1.05]"
      >
        Dành trọn tâm trí.
        <br />
        <span
          class="bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent"
        >
          Cho ngày hội ngộ.
        </span>
      </motion.h1>

      <!-- Body -->
      <motion.p
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        class="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg"
      >
        TixTac tin rằng niềm vui của một sự kiện nên bắt đầu ngay từ lúc bạn đặt vé. Không chờ đợi,
        không lo âu, chỉ có sự hào hứng cho những khoảnh khắc đáng nhớ sắp diễn ra.
      </motion.p>

      <!-- CTAs -->
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
        class="mt-8 flex flex-wrap justify-center gap-3"
      >
        <Button
          href="/events"
          size="lg"
          class="rounded-full px-7 font-bold shadow-lg shadow-primary/25 transition-shadow hover:shadow-primary/40"
        >
          <Ticket class="mr-2 size-4" /> Khám phá ngay
        </Button>
        <Button href="#values" variant="outline" size="lg" class="rounded-full px-7 font-bold">
          Về chúng tôi
        </Button>
      </motion.div>
    </div>

    <!-- Scroll hint — desktop only -->
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2, duration: 0.6 }}
      class="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-muted-foreground/40 md:flex"
      aria-hidden="true"
    >
      <span class="text-[10px] tracking-widest uppercase">Cuộn xuống</span>
      <div
        class="h-7 w-px animate-bounce bg-gradient-to-b from-muted-foreground/40 to-transparent"
      ></div>
    </motion.div>
  </section>

  <!-- ═══ STATS ═══ -->
  <section class="relative z-10 mx-auto max-w-5xl px-4 md:px-8">
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      inViewOptions={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      class="grid grid-cols-2 overflow-hidden rounded-3xl border border-border bg-surface-container-lowest/70 shadow-xl backdrop-blur-xl md:grid-cols-4"
    >
      {#each STATS as stat, i (stat.label)}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          inViewOptions={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.45, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
          class="cursor-default p-6 text-center transition-colors hover:bg-surface-container-low
            {i === 0 || i === 2 ? 'border-b border-border md:border-b-0' : ''}
            {i < 3 ? 'md:border-r md:border-border' : ''}
            md:p-8"
        >
          <div
            class="text-3xl font-black tracking-tight tabular-nums md:text-5xl {stat.highlight
              ? 'text-primary'
              : 'text-foreground'}"
          >
            {stat.compact}
          </div>
          <p
            class="mt-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase md:mt-2 md:text-xs"
          >
            {stat.label}
          </p>
        </motion.div>
      {/each}
    </motion.div>
  </section>

  <!-- ═══ VALUES ═══ -->
  <section id="values" class="mx-auto max-w-5xl px-4 py-20 md:px-8 md:py-28">
    <motion.div
      initial={{ opacity: 0, x: -32 }}
      whileInView={{ opacity: 1, x: 0 }}
      inViewOptions={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      class="mb-10 md:mb-12"
    >
      <span class="text-xs font-bold tracking-widest text-primary uppercase">Giá trị cốt lõi</span>
      <h2
        class="mt-3 font-heading text-3xl font-black tracking-tight text-foreground uppercase md:text-5xl"
      >
        DNA của TixTac
      </h2>
      <p class="mt-3 max-w-lg text-sm text-muted-foreground md:mt-4 md:text-base">
        Những nguyên tắc luôn định hướng cho mọi quyết định phát triển sản phẩm của chúng tôi.
      </p>
    </motion.div>

    <!--
      Mobile:  single column stack
      md:      3-col bento with row spans
      Row 1: [Shield col-span-2] [Zap]
      Row 2: [Sparkles] [Heart col-span-2]
    -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      {#each VALUES as item, i (item.title)}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          inViewOptions={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.55, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
          class="group relative cursor-default overflow-hidden rounded-3xl p-6 transition-all hover:-translate-y-1 hover:shadow-lg md:p-8
            {item.span ? 'md:col-span-2' : ''}
            {item.gradient
            ? 'bg-gradient-to-br from-primary/20 via-primary/10 to-surface-container'
            : 'bg-surface-container hover:bg-surface-container-high'}"
        >
          <!-- Watermark icon (span cards only) -->
          {#if item.span && !item.gradient}
            <div
              class="pointer-events-none absolute -top-8 -right-8 opacity-[0.04] transition-transform duration-700 group-hover:scale-110 group-hover:opacity-[0.07]"
              aria-hidden="true"
            >
              <item.icon class="h-48 w-48 text-foreground md:h-64 md:w-64" />
            </div>
          {/if}

          <!-- Hover orb (gradient card only) -->
          {#if item.gradient}
            <div
              class="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-primary/10 opacity-0 blur-2xl transition-all duration-700 group-hover:scale-150 group-hover:opacity-50"
              aria-hidden="true"
            ></div>
          {/if}

          <!-- Content -->
          <div class="relative z-10 flex h-full flex-col">
            <!-- Icon -->
            <div
              class="flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 md:h-14 md:w-14 {item.iconBg}"
            >
              <item.icon
                class="h-6 w-6 md:h-7 md:w-7 {item.heartFill
                  ? 'transition-all duration-300 group-hover:fill-current'
                  : ''}"
              />
            </div>

            <!-- Text -->
            <div class="mt-6 md:mt-10">
              <h3
                class="text-xl font-bold text-foreground md:text-2xl {item.span
                  ? 'md:text-3xl'
                  : ''}"
              >
                {item.title}
              </h3>
              <p class="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
                {item.desc}
              </p>
              {#if item.extra}
                <div class="mt-5 flex items-center gap-2 text-xs font-bold text-primary">
                  <span
                    class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
                  ></span>
                  {item.extra}
                </div>
              {/if}
            </div>
          </div>
        </motion.div>
      {/each}
    </div>
  </section>

  <!-- ═══ MISSION ═══ -->
  <section class="mx-auto max-w-5xl border-t border-border px-4 py-20 md:px-8 md:py-28">
    <div class="grid gap-12 md:grid-cols-2 md:gap-16">
      <!-- Sticky left -->
      <motion.div
        initial={{ opacity: 0, x: -32 }}
        whileInView={{ opacity: 1, x: 0 }}
        inViewOptions={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        class="self-start md:sticky md:top-24"
      >
        <span class="text-xs font-bold tracking-widest text-primary uppercase">Câu chuyện</span>
        <h2
          class="mt-3 font-heading text-4xl font-black tracking-tight text-foreground uppercase md:text-5xl lg:text-6xl"
        >
          Sứ mệnh
          <br />
          <span class="text-muted-foreground/60">của chúng tôi</span>
        </h2>
        <p class="mt-5 text-sm leading-relaxed text-muted-foreground md:text-base">
          Xóa bỏ mọi rào cản giữa khán giả và nghệ sĩ, để mỗi sự kiện đều là một kỷ niệm đẹp từ bước
          đầu tiên.
        </p>
        <div class="mt-7">
          <Button
            href="/events"
            class="rounded-full px-7 py-5 text-base font-bold shadow-lg shadow-primary/25 transition-shadow hover:shadow-primary/40"
          >
            <Ticket class="mr-2 h-5 w-5" /> Khám phá sự kiện
          </Button>
        </div>
      </motion.div>

      <!-- Right -->
      <div class="flex flex-col gap-8">
        <motion.div
          initial={{ opacity: 0, x: 32 }}
          whileInView={{ opacity: 1, x: 0 }}
          inViewOptions={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          class="space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base"
        >
          <p>
            TixTac được ấp ủ từ phòng lab bởi những sinh viên UET-VNU với một nỗi niềm chung:
            <em class="border-b border-primary/40 font-semibold text-foreground not-italic">
              "Tại sao việc đi xem nghệ sĩ mình yêu thích lại áp lực đến thế?"
            </em>
          </p>
          <p>
            Thay vì chấp nhận cảnh mua lại vé giá cao, hay hồi hộp canh website sập, chúng tôi quyết
            định tự tay xây dựng một giải pháp công bằng, minh bạch và thân thiện hơn cho cả cộng
            đồng.
          </p>
        </motion.div>

        <div class="flex flex-col gap-3">
          {#each HIGHLIGHTS as item, i (item.title)}
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              whileInView={{ opacity: 1, x: 0 }}
              inViewOptions={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              class="group flex cursor-default gap-4 rounded-2xl border border-border bg-surface-container-low p-4 transition-all hover:border-primary/20 hover:bg-surface-container md:gap-5 md:p-5"
            >
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary md:h-11 md:w-11"
              >
                <item.icon class="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div class="min-w-0">
                <h4 class="text-sm font-bold text-foreground md:text-base">{item.title}</h4>
                <p class="mt-1 text-xs leading-relaxed text-muted-foreground md:text-sm">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          {/each}
        </div>
      </div>
    </div>
  </section>
</div>
