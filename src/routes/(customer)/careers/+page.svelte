<script lang="ts">
  import { resolve } from '$app/paths';
  import { Button } from '$lib/components/ui/button';
  import { Briefcase, Coffee, Globe, Heart, MapPin, Sparkles, Users, Zap } from 'lucide-svelte';
  import { motion } from 'motion-sv';

  interface Perk {
    icon: typeof Coffee;
    title: string;
    desc: string;
  }

  interface Opening {
    title: string;
    department: string;
    location: string;
    type: 'Full-time' | 'Part-time' | 'Internship';
    desc: string;
    tag?: string; // e.g. 'Urgent' / 'New'
  }

  const PERKS: Perk[] = [
    {
      icon: Coffee,
      title: 'Môi trường sáng tạo',
      desc: 'Không gian làm việc linh hoạt, tự do sáng tạo. Chúng tôi tin rằng ý tưởng hay nhất đến từ sự thoải mái.',
    },
    {
      icon: Globe,
      title: 'Làm việc từ xa',
      desc: 'Hỗ trợ làm việc hybrid & remote. Chỉ cần bạn có kết nối internet và đam mê, phần còn lại để chúng tôi lo.',
    },
    {
      icon: Heart,
      title: 'Sức khỏe & Cân bằng',
      desc: 'BHXH đầy đủ, ngày nghỉ phép linh hoạt, team-building hàng tháng và vé miễn phí dự sự kiện do TixTac phân phối.',
    },
    {
      icon: Zap,
      title: 'Công nghệ hiện đại',
      desc: 'Làm việc với stack công nghệ mới nhất: Svelte 5, Bun, PostgreSQL, Redis. Được đào tạo và thử nghiệm công nghệ mới.',
    },
  ];

  const OPENINGS: Opening[] = [
    {
      title: 'Senior Full-stack Developer',
      department: 'Engineering',
      location: 'Hà Nội / Remote',
      type: 'Full-time',
      tag: 'Urgent',
      desc: 'Xây dựng và tối ưu các tính năng core của nền tảng. Yêu cầu 3+ năm kinh nghiệm TypeScript, PostgreSQL, kiến trúc microservices.',
    },
    {
      title: 'UI/UX Designer',
      department: 'Design',
      location: 'Hà Nội',
      type: 'Full-time',
      tag: 'New',
      desc: 'Thiết kế trải nghiệm người dùng cho nền tảng web & mobile. Yêu cầu portfolio mạnh về thiết kế hệ thống, kinh nghiệm Figma, Design System.',
    },
    {
      title: 'DevOps Engineer',
      department: 'Engineering',
      location: 'Remote',
      type: 'Full-time',
      desc: 'Quản lý hạ tầng cloud, CI/CD pipeline, monitoring. Yêu cầu kinh nghiệm Docker, Kubernetes, AWS/GCP.',
    },
    {
      title: 'Marketing Specialist',
      department: 'Marketing',
      location: 'Hà Nội',
      type: 'Full-time',
      desc: 'Lên kế hoạch và triển khai chiến dịch marketing cho các sự kiện. Yêu cầu kinh nghiệm digital marketing, content creation.',
    },
  ];

  // Deduplicated departments for filter chips
  const DEPARTMENTS = ['Tất cả', ...new Set(OPENINGS.map((j) => j.department))];

  let activeDept = $state('Tất cả');

  const filteredJobs = $derived(
    activeDept === 'Tất cả' ? OPENINGS : OPENINGS.filter((j) => j.department === activeDept),
  );
</script>

<svelte:head>
  <title>Tuyển dụng - Gia nhập TixTac</title>
  <meta
    name="description"
    content="Gia nhập đội ngũ TixTac - nền tảng đặt vé sự kiện hàng đầu Việt Nam. Khám phá cơ hội nghề nghiệp tại TixTac."
  />
</svelte:head>

<div class="min-h-screen overflow-x-hidden bg-surface pb-24">
  <!-- ═══ HERO ═══ -->
  <section class="relative overflow-hidden px-4 py-20 md:px-8 md:py-32 lg:px-12">
    <div class="pointer-events-none absolute inset-0" aria-hidden="true">
      <div
        class="absolute -top-1/4 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-primary/20 via-secondary/10 to-transparent blur-[120px]"
      ></div>
      <div
        class="absolute top-1/2 -right-1/4 h-[400px] w-[500px] rounded-full bg-gradient-to-bl from-tertiary/15 to-transparent blur-[100px]"
      ></div>
    </div>

    <div class="relative mx-auto max-w-4xl text-center">
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <span
          class="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold tracking-widest text-primary uppercase backdrop-blur-md"
        >
          <Sparkles class="size-3 animate-pulse" />
          Tuyển dụng
        </span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        class="mt-6 font-heading text-4xl font-black tracking-tighter text-foreground uppercase sm:text-5xl md:text-6xl lg:text-[5rem] lg:leading-[1.05]"
      >
        Cùng chúng tôi
        <br />
        <span
          class="bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent"
        >
          kiến tạo tương lai
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        class="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg"
      >
        Gia nhập đội ngũ trẻ tuổi, nhiệt huyết đang định hình lại cách người Việt mua vé sự kiện.
        Tại TixTac, mỗi dòng code và thiết kế đều tạo ra trải nghiệm thực sự cho hàng triệu người
        dùng.
      </motion.p>

      <!-- Quick stats row -->
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
        class="mt-10 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground"
      >
        {#each [{ value: '20+', label: 'Thành viên' }, { value: '4', label: 'Vị trí mở' }, { value: '100%', label: 'Đam mê' }] as s (s.value)}
          <div class="flex items-center gap-2">
            <span class="text-lg font-black text-foreground">{s.value}</span>
            <span>{s.label}</span>
          </div>
        {/each}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
        class="mt-8 flex flex-wrap justify-center gap-3"
      >
        <Button
          href="#openings"
          size="lg"
          class="rounded-full px-7 font-bold shadow-lg shadow-primary/25 transition-shadow hover:shadow-primary/40"
        >
          <Briefcase class="mr-2 size-4" /> Xem vị trí tuyển
        </Button>
        <Button
          href={resolve('/contact')}
          variant="outline"
          size="lg"
          class="rounded-full px-7 font-bold"
        >
          Gửi CV tự do
        </Button>
      </motion.div>
    </div>

    <!-- Scroll hint -->
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

  <!-- ═══ PERKS ═══ -->
  <section class="mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-24">
    <motion.div
      initial={{ opacity: 0, x: -32 }}
      whileInView={{ opacity: 1, x: 0 }}
      inViewOptions={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      class="mb-10 md:mb-12"
    >
      <span class="text-xs font-bold tracking-widest text-primary uppercase">
        Tại sao chọn TixTac
      </span>
      <h2
        class="mt-3 font-heading text-3xl font-black tracking-tight text-foreground uppercase md:text-5xl"
      >
        Đặc quyền thành viên
      </h2>
      <p class="mt-3 max-w-lg text-sm text-muted-foreground md:mt-4 md:text-base">
        Chúng tôi đầu tư vào con người. Dưới đây là những gì bạn nhận được khi gia nhập TixTac.
      </p>
    </motion.div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {#each PERKS as perk, i (perk.title)}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          inViewOptions={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          class="group cursor-default rounded-3xl bg-surface-container p-6 transition-all hover:-translate-y-1 hover:bg-surface-container-high hover:shadow-lg md:p-8"
        >
          <div
            class="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary transition-transform duration-300 group-hover:scale-110 md:h-14 md:w-14"
          >
            <perk.icon class="h-6 w-6 md:h-7 md:w-7" />
          </div>
          <div class="mt-6 md:mt-8">
            <h3 class="text-lg font-bold text-foreground md:text-xl">{perk.title}</h3>
            <p class="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
              {perk.desc}
            </p>
          </div>
        </motion.div>
      {/each}
    </div>
  </section>

  <!-- ═══ OPENINGS ═══ -->
  <section
    id="openings"
    class="border-t border-border bg-surface-container-lowest/50 px-4 py-20 md:px-8 md:py-28"
  >
    <div class="mx-auto max-w-3xl">
      <motion.div
        initial={{ opacity: 0, x: -32 }}
        whileInView={{ opacity: 1, x: 0 }}
        inViewOptions={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        class="mb-10 md:mb-12"
      >
        <span class="text-xs font-bold tracking-widest text-primary uppercase">Cơ hội hiện có</span>
        <h2
          class="mt-3 font-heading text-3xl font-black tracking-tight text-foreground uppercase md:text-5xl"
        >
          Vị trí đang tuyển
        </h2>
        <p class="mt-3 text-sm text-muted-foreground md:mt-4 md:text-base">
          Chúng tôi luôn tìm kiếm những tài năng mới.
        </p>
      </motion.div>

      <!-- Department filter chips -->
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        inViewOptions={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        class="mb-8 flex flex-wrap gap-2"
      >
        {#each DEPARTMENTS as dept (dept)}
          <button
            onclick={() => (activeDept = dept)}
            class="rounded-full border px-4 py-1.5 text-xs font-bold tracking-wide transition-all duration-200
              {activeDept === dept
              ? 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20'
              : 'border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground'}"
          >
            {dept}
          </button>
        {/each}
      </motion.div>

      <!-- Job cards -->
      <div class="flex flex-col gap-4">
        {#each filteredJobs as job, i (job.title)}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            class="group cursor-default overflow-hidden rounded-3xl border border-border bg-surface-container transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
          >
            <!-- Card top accent line -->
            <div
              class="h-0.5 w-full bg-gradient-to-r from-primary/40 via-primary/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            ></div>

            <div class="p-5 md:p-6">
              <!-- Title row -->
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <h3
                      class="text-base font-bold text-foreground transition-colors group-hover:text-primary md:text-lg"
                    >
                      {job.title}
                    </h3>
                    {#if job.tag}
                      <span
                        class="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase
                        {job.tag === 'Urgent'
                          ? 'bg-danger/15 text-danger'
                          : 'bg-primary/15 text-primary'}"
                      >
                        {job.tag}
                      </span>
                    {/if}
                  </div>

                  <!-- Meta chips -->
                  <div
                    class="mt-2.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground"
                  >
                    <span
                      class="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-2.5 py-1"
                    >
                      <Briefcase class="size-3 shrink-0" />
                      {job.department}
                    </span>
                    <span
                      class="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-2.5 py-1"
                    >
                      <MapPin class="size-3 shrink-0" />
                      {job.location}
                    </span>
                    <span
                      class="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-2.5 py-1"
                    >
                      <Zap class="size-3 shrink-0" />
                      {job.type}
                    </span>
                  </div>
                </div>

                <!-- Apply button — desktop -->
                <Button
                  href={resolve('/contact')}
                  variant="outline"
                  class="hidden shrink-0 rounded-full text-xs font-bold transition-all group-hover:border-primary group-hover:text-primary sm:inline-flex"
                >
                  Ứng tuyển
                </Button>
              </div>

              <!-- Description -->
              <p class="mt-3 text-sm leading-relaxed text-muted-foreground">{job.desc}</p>

              <!-- Apply button — mobile full width -->
              <Button
                href={resolve('/contact')}
                variant="outline"
                class="mt-4 w-full rounded-full text-sm font-bold sm:hidden"
              >
                Ứng tuyển ngay
              </Button>
            </div>
          </motion.div>
        {/each}
      </div>
    </div>
  </section>

  <!-- ═══ CTA ═══ -->
  <section class="mx-auto max-w-3xl px-4 py-16 md:px-8 md:py-24">
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      inViewOptions={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      class="overflow-hidden rounded-3xl border border-border bg-surface-container-lowest p-8 text-center md:p-12"
    >
      <!-- Ambient blob inside card -->
      <div class="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          class="absolute top-0 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-[60px]"
        ></div>
      </div>

      <div class="relative">
        <div
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary"
        >
          <Users class="size-7" />
        </div>
        <h2
          class="mt-6 font-heading text-2xl font-black tracking-tight text-foreground md:text-4xl"
        >
          Không thấy vị trí phù hợp?
        </h2>
        <p class="mx-auto mt-4 max-w-md text-sm text-muted-foreground md:text-base">
          Chúng tôi luôn chào đón những tài năng. Hãy gửi CV của bạn và cho chúng tôi biết bạn có
          thể đóng góp gì cho TixTac.
        </p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <Button
            href={resolve('/contact')}
            size="lg"
            class="rounded-full px-8 font-bold shadow-lg shadow-primary/25 transition-shadow hover:shadow-primary/40"
          >
            Liên hệ với chúng tôi
          </Button>
          <Button
            href="mailto:hr@tixtac.io.vn"
            variant="outline"
            size="lg"
            class="rounded-full px-8 font-bold"
          >
            hr@tixtac.io.vn
          </Button>
        </div>
      </div>
    </motion.div>
  </section>
</div>
