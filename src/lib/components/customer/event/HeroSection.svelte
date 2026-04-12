<script lang="ts">
  import { resolve } from '$app/paths';

  interface Props {
    badge?: string;
    title: string;
    titleAccent: string;
    subtitle: string;
    primaryCTA: {
      label: string;
      href?: string;
    };
    secondaryCTA?: {
      label: string;
      href?: string;
    };
    stats?: Array<{
      number: string;
      label: string;
    }>;
  }

  let {
    badge = '✨ Hơn 500,000 vé đã được đặt',
    title = 'Trải nghiệm',
    titleAccent = 'sự kiện đỉnh cao',
    subtitle = 'Đặt vé concert, festival, thể thao và hơn thế nữa chỉ trong vài giây — bảo mật, nhanh chóng, tiện lợi.',
    primaryCTA = { label: 'Khám phá sự kiện', href: '#events' },
    secondaryCTA = { label: 'Xem sự kiện hôm nay →', href: '/events' },
    stats = [
      { number: '15,000+', label: 'Sự kiện' },
      { number: '500K+', label: 'Vé đã bán' },
      { number: '60s', label: 'Đặt vé xong' },
    ],
  }: Props = $props();
</script>

<section class="relative overflow-hidden px-6 py-20 text-center sm:px-6 sm:py-28 lg:px-8 lg:py-32">
  <!-- Glow background -->
  <div
    class="pointer-events-none absolute inset-0"
    style="background:
      radial-gradient(ellipse 70% 60% at 50% -20%, rgba(108, 58, 255, 0.25) 0%, transparent 70%),
      radial-gradient(ellipse 40% 40% at 80% 80%, rgba(255, 58, 140, 0.1) 0%, transparent 60%)"
  ></div>

  <div class="relative mx-auto max-w-3xl">
    <!-- Badge -->
    {#if badge}
      <div
        class="mb-6 inline-block rounded-full border border-slate-200 bg-slate-100 px-4 py-1.5 text-sm font-semibold tracking-wide text-slate-600"
      >
        {badge}
      </div>
    {/if}

    <!-- Title -->
    <h1 class="mb-5 text-4xl leading-tight font-black tracking-tight sm:text-5xl lg:text-6xl">
      {title}
      <br />
      <span class="text-purple-600">{titleAccent}</span>
    </h1>

    <!-- Subtitle -->
    <p class="mb-9 text-lg leading-relaxed text-slate-600 sm:text-xl">
      {subtitle}
    </p>

    <!-- CTAs -->
    <div class="mb-10 flex flex-wrap items-center justify-center gap-4">
      <a
        href={resolve(primaryCTA.href || '#events')}
        class="inline-flex items-center gap-2 rounded-full bg-purple-600 px-7 py-3 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg hover:shadow-purple-600/50"
      >
        {primaryCTA.label}
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      </a>

      {#if secondaryCTA}
        <a
          href={resolve(secondaryCTA.href || '/events')}
          class="inline-flex items-center gap-1.5 rounded-full border border-purple-400/40 px-6 py-3 text-sm font-semibold text-purple-600 transition-all duration-200 hover:border-purple-600 hover:bg-purple-50/50"
        >
          {secondaryCTA.label}
        </a>
      {/if}
    </div>

    <!-- Stats -->
    {#if stats && stats.length > 0}
      <div
        class="inline-flex items-center gap-5 rounded-2xl border border-slate-200 bg-slate-50 px-8 py-4"
      >
        {#each stats as stat, i}
          <div class="text-center">
            <div class="block text-xl font-black text-purple-700 sm:text-2xl">{stat.number}</div>
            <div class="text-xs font-medium text-slate-500 sm:text-sm">{stat.label}</div>
          </div>

          {#if i < stats.length - 1}
            <div class="h-9 w-px bg-slate-300"></div>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
</section>
