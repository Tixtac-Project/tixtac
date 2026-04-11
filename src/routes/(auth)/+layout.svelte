<script lang="ts">
  import { onNavigate } from '$app/navigation';
  import { page } from '$app/stores';
  import { resolve } from '$app/paths';
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

<div
  class="grid min-h-screen w-full place-items-center bg-[oklch(0.97_0.01_260)] p-4 py-8 font-sans lg:p-8"
>
  <div class="auth-bento w-full max-w-[1280px]">
    <!-- ══════ A · Hero / Brand ══════ -->
    <div
      class="area-hero bento-card relative overflow-hidden rounded-[32px] bg-primary p-8 text-white shadow-lg lg:p-10"
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
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/20 shadow-inner backdrop-blur-md"
          >
            <Ticket class="h-5 w-5 text-white" />
          </div>
          <span class="text-lg font-bold tracking-tight">TixTac</span>
        </div>
        <div>
          <h2 class="font-heading text-3xl leading-tight font-extrabold tracking-tight lg:text-4xl">
            Quản lý sự kiện,
            <br />
            <span class="text-white/90">đơn giản hơn bao giờ.</span>
          </h2>
          <p class="mt-4 max-w-[320px] text-sm leading-relaxed font-medium text-white/75">
            Tạo sự kiện, thiết kế sơ đồ ghế và bán vé — tất cả trong một nền tảng.
          </p>
        </div>
      </div>
    </div>

    <!-- ══════ F · Sơ đồ ghế ══════ -->
    <div
      class="area-seat bento-card group relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-black/[0.04] bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md lg:p-6"
    >
      <div class="relative z-10">
        <p class="text-sm font-bold tracking-tight text-slate-900">Sơ đồ ghế</p>
        <p class="text-[11px] font-medium text-slate-500">Kéo thả trực quan</p>
      </div>
      <svg
        class="mx-auto mt-2 h-20 w-full max-w-[150px] transition-transform duration-500 group-hover:scale-105"
        viewBox="0 0 170 95"
        fill="none"
      >
        <path
          d="M30 10 Q85 0 140 10"
          class="stroke-emerald-500/20"
          stroke-width="2"
          stroke-linecap="round"
          fill="none"
        />
        <rect x="55" y="2" width="60" height="13" rx="6.5" class="fill-emerald-500/10" />
        <text
          x="85"
          y="11.5"
          text-anchor="middle"
          class="fill-emerald-600/60"
          font-size="6"
          font-weight="700"
        >
          SÂN KHẤU
        </text>
        {#each [24, 42, 60, 78, 96, 114, 132] as sx, i (sx)}
          <rect
            x={sx}
            y="26"
            width="13"
            height="10"
            rx="3"
            class={i === 3
              ? 'fill-primary/20 stroke-primary/40'
              : 'fill-emerald-400/20 stroke-emerald-500/30'}
            stroke-width="1.5"
          />
        {/each}
        {#each [16, 34, 52, 70, 88, 106, 124, 142] as sx, i (sx)}
          <rect
            x={sx}
            y="42"
            width="13"
            height="10"
            rx="3"
            class={i === 1 || i === 6
              ? 'fill-primary/20 stroke-primary/40'
              : 'fill-emerald-400/20 stroke-emerald-500/30'}
            stroke-width="1.5"
          />
        {/each}
      </svg>
    </div>

    <!-- ══════ B · Stats mini ══════ -->
    <div
      class="area-stats bento-card group flex flex-col items-center justify-center gap-1 rounded-[24px] border border-black/[0.04] bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md lg:p-6"
    >
      <div class="text-3xl font-extrabold tracking-tight text-primary lg:text-4xl">12.4K</div>
      <p class="mt-1 text-xs font-medium text-slate-500">Vé đã bán ra</p>
    </div>

    <!-- ══════ E · Quản lý vé ══════ -->
    <div
      class="area-ticket bento-card group relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-black/[0.04] bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
    >
      <div class="relative z-10">
        <p class="text-base font-bold tracking-tight text-slate-900">Quản lý vé</p>
        <p class="text-xs font-medium text-slate-500">Phát hành tự động</p>
      </div>
      <svg
        class="mx-auto mt-4 h-24 w-full max-w-[160px] transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-2"
        viewBox="0 0 160 90"
        fill="none"
      >
        <g transform="rotate(-5, 80, 45)">
          <rect
            x="8"
            y="8"
            width="120"
            height="70"
            rx="12"
            class="fill-primary/[0.04] stroke-primary/20"
            stroke-width="1.5"
          />
        </g>
        <rect
          x="16"
          y="10"
          width="120"
          height="70"
          rx="12"
          class="fill-white stroke-primary/30 shadow-sm"
          stroke-width="1.5"
        />
        <circle cx="16" cy="45" r="8" class="fill-white stroke-primary/30" stroke-width="1.5" />
        <circle cx="136" cy="45" r="8" class="fill-white stroke-primary/30" stroke-width="1.5" />
        <line
          x1="46"
          y1="14"
          x2="46"
          y2="76"
          class="stroke-primary/20"
          stroke-width="1.5"
          stroke-dasharray="4 3"
        />
        <text
          x="31"
          y="52"
          text-anchor="middle"
          class="fill-primary"
          font-size="18"
          font-weight="800"
        >
          A3
        </text>
        <rect x="56" y="22" width="46" height="18" rx="2" class="fill-primary/10" />
        <rect x="56" y="48" width="46" height="4" rx="2" class="fill-slate-200" />
      </svg>
    </div>

    <!-- ══════ G · Thống kê ══════ -->
    <div
      class="area-chart bento-card group relative flex items-center justify-between overflow-hidden rounded-[24px] border border-black/[0.04] bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
    >
      <div class="relative z-10 shrink-0 pr-4">
        <p class="text-base font-bold tracking-tight text-slate-900">Doanh thu</p>
        <p class="mb-2 text-xs font-medium text-slate-500">Realtime data</p>
        <div class="text-2xl font-extrabold text-slate-800">₫48.2M</div>
        <div
          class="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600"
        >
          ↑ 24% tuần này
        </div>
      </div>
      <svg
        class="h-20 w-full max-w-[200px] transition-transform duration-500 group-hover:scale-105"
        viewBox="0 0 170 60"
        fill="none"
      >
        <path
          d="M0 50 Q30 40 50 35 T90 20 T130 15 T170 25 L170 60 L0 60 Z"
          class="fill-violet-500/[0.05]"
        />
        <path
          d="M0 50 Q30 40 50 35 T90 20 T130 15 T170 25"
          class="stroke-violet-500"
          stroke-width="2"
          stroke-linecap="round"
          fill="none"
        />
        <circle cx="90" cy="20" r="3" class="fill-white stroke-violet-500" stroke-width="2" />
        <circle cx="130" cy="15" r="3.5" class="fill-violet-500 stroke-white" stroke-width="2" />
      </svg>
    </div>

    <!-- ========================================== -->
    <!-- 🚀 KHỐI BÊN PHẢI (GỘP FORM & SWITCH PILL)  -->
    <!-- ========================================== -->
    <div class="area-right flex h-full flex-col gap-5">
      <!-- C · Form Card (Tự động chiếm phần lớn không gian) -->
      <div
        class="z-10 flex flex-1 flex-col justify-center rounded-[32px] border border-black/6 bg-white p-8 shadow-xl shadow-primary/[0.04] lg:p-10"
        style="view-transition-name: auth-card;"
      >
        {@render children()}
      </div>

      <!-- D · Switch Pill (Viên thuốc lơ lửng căn giữa hoàn hảo) -->
      <div class="flex items-start justify-center self-center">
        <div
          class="inline-flex items-center justify-center rounded-full border border-black/[0.04] bg-white/60 px-6 py-2.5 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:shadow-md"
        >
          {#if isLogin}
            <p class="text-sm font-medium text-slate-600">
              Chưa có tài khoản?
              <a
                href={resolve('/register')}
                class="ml-1 font-bold text-primary transition-colors hover:text-primary/80"
              >
                Đăng ký ngay
              </a>
            </p>
          {:else}
            <p class="text-sm font-medium text-slate-600">
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
  /* ── Mobile: 1 Cột ── */
  .auth-bento {
    display: grid;
    gap: 16px;
    grid-template-columns: 1fr;
    grid-template-areas:
      'hero'
      'seat'
      'stats'
      'right'
      'ticket'
      'chart';
  }

  /* ── Tablet: 2 Cột ── */
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

  /* ── Desktop: Lưới 4 Cột Bất Đối Xứng ── */
  @media (min-width: 1024px) {
    .auth-bento {
      gap: 24px;
      /* Tỷ lệ cột bên phải chứa Form lớn nhất (1.6fr) để Form không bị bóp nghẹt */
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
