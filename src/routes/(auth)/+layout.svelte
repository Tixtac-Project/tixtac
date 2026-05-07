<script lang="ts">
  import { onNavigate } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/stores';
  import RevenueChartIllustration from '$lib/components/customer/auth/RevenueChartIllustration.svelte';
  import SeatMapIllustration from '$lib/components/customer/auth/SeatMapIllustration.svelte';
  import TicketIllustration from '$lib/components/customer/auth/TicketIllustration.svelte';
  import { Ticket } from 'lucide-svelte';

  let { children } = $props();

  let isLogin = $derived($page.url.pathname.endsWith('/login'));

  onNavigate((navigation) => {
    if (!document.startViewTransition) return;

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });
</script>

<div class="relative grid min-h-dvh w-full place-items-center bg-surface p-4 py-8 font-sans lg:p-8">
  <!-- ═══════════════════════════════════════════════ -->
  <!-- Mobile: Floating blurred decorative cards      -->
  <!-- ═══════════════════════════════════════════════ -->
  <div
    class="pointer-events-none absolute inset-0 z-0 overflow-hidden md:hidden"
    aria-hidden="true"
  >
    <!-- Seat map vibe — emerald -->
    <div
      class="absolute top-[6%] -right-[12%] h-32 w-40 rotate-12 rounded-3xl bg-emerald-400/20 opacity-30 blur-lg"
    ></div>
    <!-- Stats vibe — primary circle -->
    <div
      class="absolute top-[18%] -left-[6%] h-28 w-28 rounded-full bg-primary/12 opacity-25 blur-xl"
    ></div>
    <!-- Ticket vibe — sky/blue -->
    <div
      class="absolute bottom-[28%] left-[6%] h-36 w-48 -rotate-6 rounded-3xl bg-sky-400/10 opacity-25 blur-lg"
    ></div>
    <!-- Chart vibe — violet -->
    <div
      class="absolute -right-[6%] bottom-[12%] h-32 w-44 rotate-3 rounded-3xl bg-violet-400/12 opacity-20 blur-lg"
    ></div>
    <!-- Revenue vibe — amber -->
    <div
      class="absolute top-[42%] -right-[10%] h-20 w-28 -rotate-12 rounded-2xl bg-amber-400/12 opacity-25 blur-md"
    ></div>
    <!-- Big ambient blur orb -->
    <div
      class="absolute top-[30%] left-[20%] h-48 w-48 rounded-full bg-primary/6 opacity-30 blur-2xl"
    ></div>
  </div>

  <div class="auth-bento w-full max-w-[1280px]">
    <!-- ══════ A · Hero / Brand ══════ -->
    <div
      class="area-hero bento-card group relative hidden overflow-hidden rounded-[32px] bg-primary p-8 text-white shadow-lg md:flex lg:p-10"
    >
      <div class="absolute inset-0">
        <div
          class="absolute inset-0 opacity-[0.08]"
          style="background-image: linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px); background-size: 40px 40px;"
        ></div>
        <div
          class="absolute -top-16 -left-16 h-64 w-64 rounded-full opacity-40 blur-2xl transition-transform duration-1000 hover:scale-110"
          style="background: radial-gradient(circle, oklch(0.85 0.18 262) 0%, transparent 70%);"
        ></div>
      </div>
      <div class="relative z-10 flex h-full flex-col justify-between gap-12">
        <a class="flex items-center gap-3" href={resolve('/')}>
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/20 shadow-inner backdrop-blur-md"
          >
            <Ticket class="h-5 w-5 text-white" />
          </div>
          <span class="text-lg font-bold tracking-tight">TixTac</span>
        </a>
        <div>
          <h2 class="font-heading text-3xl leading-tight font-extrabold tracking-tight lg:text-4xl">
            Sự kiện & Vé
            <br />
            <span class="text-white/90">tất cả trong một nền tảng.</span>
          </h2>
          <p class="mt-4 max-w-[320px] text-sm leading-relaxed font-medium text-white/75">
            Mua vé nhanh chóng. Tổ chức sự kiện dễ dàng.
          </p>
        </div>
      </div>
    </div>

    <!-- ══════ F · Chọn chỗ ngồi ══════ -->
    <div
      class="area-seat bento-card group relative hidden flex-col justify-between overflow-hidden rounded-[24px] border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md md:flex lg:p-6"
    >
      <div class="relative z-10">
        <p class="text-sm font-bold tracking-tight text-foreground">Chọn chỗ ngồi</p>
        <p class="text-[11px] font-medium text-muted-foreground">Trực quan, dễ dàng</p>
      </div>
      <SeatMapIllustration
        class="mx-auto mt-2 h-20 w-full max-w-[150px] transition-transform duration-500 group-hover:scale-105"
      />
    </div>

    <!-- ══════ B · Stats mini ══════ -->
    <div
      class="area-stats bento-card group hidden flex-col items-center justify-center gap-1 rounded-[24px] border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md md:flex lg:p-6"
    >
      <div class="text-3xl font-extrabold tracking-tight text-primary lg:text-4xl">12.4K</div>
      <p class="mt-1 text-xs font-medium text-muted-foreground">Vé đã bán ra</p>
    </div>

    <!-- ══════ E · Vé điện tử ══════ -->
    <div
      class="area-ticket bento-card group relative hidden flex-col justify-between overflow-hidden rounded-[24px] border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md md:flex"
    >
      <div class="relative z-10">
        <p class="text-base font-bold tracking-tight text-foreground">Vé điện tử</p>
        <p class="text-xs font-medium text-muted-foreground">Nhận vé ngay lập tức</p>
      </div>
      <TicketIllustration
        class="mx-auto mt-4 h-24 w-full max-w-[160px] transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-2"
      />
    </div>

    <!-- ══════ G · Thống kê ══════ -->
    <div
      class="area-chart bento-card group relative hidden items-center justify-between overflow-hidden rounded-[24px] border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md md:flex"
    >
      <div class="relative z-10 shrink-0 pr-4">
        <p class="text-base font-bold tracking-tight text-foreground">Doanh thu</p>
        <p class="mb-2 text-xs font-medium text-muted-foreground">Realtime data</p>
        <div class="text-2xl font-extrabold text-foreground">₫48.2M</div>
        <div
          class="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600"
        >
          ↑ 24% tuần này
        </div>
      </div>
      <RevenueChartIllustration
        class="h-20 w-full max-w-[200px] transition-transform duration-500 group-hover:scale-105"
      />
    </div>

    <!-- ========================================== -->
    <!-- 🚀 FORM & SWITCH PILL                       -->
    <!-- ========================================== -->
    <div class="area-right flex h-full flex-col gap-5">
      <!-- C · Form Card (frosted glass on mobile, solid on tablet+) -->
      <div
        class="z-10 flex w-full max-w-md flex-1 flex-col justify-center rounded-[32px] border border-border bg-card/85 p-8 shadow-xl backdrop-blur-xl md:max-w-none md:bg-card md:backdrop-blur-none lg:p-10"
        style="view-transition-name: auth-card;"
      >
        <!-- Mobile-only brand header -->
        <div class="mb-6 flex items-center gap-2 md:hidden">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
            <Ticket class="h-5 w-5 text-white" />
          </div>
          <span class="text-lg font-bold tracking-tight text-foreground">TixTac</span>
        </div>
        {@render children()}
      </div>

      <!-- D · Switch Pill -->
      <div class="flex items-start justify-center self-center">
        <div
          class="inline-flex items-center justify-center rounded-xl border border-border bg-card/60 px-6 py-2.5 shadow-sm backdrop-blur-md transition-all hover:bg-card hover:shadow-md"
        >
          {#if isLogin}
            <p class="text-sm font-medium text-muted-foreground">
              Chưa có tài khoản?
              <a
                href={resolve('/register')}
                class="ml-1 font-bold text-primary transition-colors hover:text-primary/80"
              >
                Đăng ký ngay
              </a>
            </p>

            <p class="text-sm font-medium text-muted-foreground">
              Quên mật khẩu?
              <a
                href={resolve('/forgot-password')}
                class="ml-1 font-bold text-primary transition-colors hover:text-primary/80"
              >
                Khôi phục mật khẩu
              </a>
            </p>
          {:else}
            <p class="text-sm font-medium text-muted-foreground">
              Đã có tài khoản?
              <a
                href={resolve('/login')}
                class="ml-1 font-bold text-primary transition-colors hover:text-primary/80"
              >
                Đăng nhập
              </a>
            </p>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* ── Mobile: 1 cột, chỉ hiển thị form ── */
  .auth-bento {
    display: grid;
    gap: 16px;
    grid-template-columns: 1fr;
    grid-template-areas: 'right';
  }

  /* ── Tablet: 2 cột, hiển thị bento cards ── */
  @media (min-width: 768px) {
    .auth-bento {
      gap: 20px;
      grid-template-columns: 1fr 1fr;
      grid-template-areas:
        'hero    hero'
        'seat    stats'
        'right   right'
        'ticket  chart';
    }
  }

  /* ── Desktop: 4 cột bất đối xứng ── */
  @media (min-width: 1024px) {
    .auth-bento {
      gap: 24px;
      grid-template-columns: 1.2fr 1.2fr 0.9fr 1.6fr;
      grid-template-areas:
        'hero    hero    seat    right'
        'hero    hero    stats   right'
        'ticket  chart   chart   right';
    }
  }

  /* Mapping Grid Areas */
  .area-hero {
    grid-area: hero;
  }
  .area-stats {
    grid-area: stats;
  }
  .area-seat {
    grid-area: seat;
  }
  .area-ticket {
    grid-area: ticket;
  }
  .area-chart {
    grid-area: chart;
  }
  .area-right {
    grid-area: right;
  }

  /* ── View Transitions ── */
  :global(::view-transition-old(auth-card)),
  :global(::view-transition-new(auth-card)) {
    animation-duration: 0.4s;
    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
  :global(::view-transition-group(auth-card)) {
    animation-duration: 0.4s;
    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
</style>
