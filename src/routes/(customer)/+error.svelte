<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { ArrowRight, Headset, House } from 'lucide-svelte';

  let status = $derived(page.status);
  let message = $derived(page.error?.message || 'Something went wrong');
</script>

<svelte:head>
  <title>{status} - TixTac</title>
</svelte:head>

<div class="min-h-[80vh] bg-surface px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
  <div class="mx-auto max-w-6xl">
    <div class="grid grid-cols-1 gap-5 md:grid-cols-12">
      <!-- ── Hero message card (tall) ── -->
      <section
        class="arch-enter flex flex-col justify-center rounded-2xl bg-surface-container-low p-8 sm:p-12 md:col-span-8 md:row-span-2"
      >
        <p class="label-overline mb-4 text-base text-primary">MÃ LỖI: {status}</p>
        <h1 class="font-heading text-5xl font-extrabold tracking-wide text-foreground md:text-7xl">
          <span class="text-primary italic">Lỡ hẹn</span>
          mất rồi?
        </h1>

        <p class="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
          {#if status === 404}
            Rất tiếc, trang này đã "bốc hơi" hoặc chưa từng tồn tại. Nhưng thời gian không chờ đợi
            ai cả, hãy nhanh chóng tìm cho mình một sự kiện hấp dẫn khác nào!
          {:else}
            Có vẻ như đã xảy ra lỗi không mong muốn. Đừng lo, đội ngũ của chúng tôi đã được thông
            báo và đang làm việc để khắc phục sự cố này. Trong thời gian chờ đợi, bạn có thể quay
            lại trang chủ hoặc thử tìm kiếm sự kiện khác. {message}
          {/if}
        </p>
        <div class="mt-8">
          <a
            href={resolve('/')}
            class="btn-primary-gradient inline-flex items-center gap-2.5 px-8 py-4 text-sm font-bold"
          >
            <House class="h-4 w-4" />
            Trở lại trang chủ
          </a>
        </div>
      </section>

      <!-- ── 404 visual card (tall) ── -->
      <section
        class="arch-enter relative flex min-h-[400px] flex-col items-center justify-center overflow-hidden rounded-2xl p-8 md:col-span-4 md:row-span-2"
        style="background: linear-gradient(135deg, var(--primary), var(--primary-container)); animation-delay: 100ms"
      >
        <!-- Decorative glow -->
        <div
          class="absolute inset-0 opacity-10"
          style="background: radial-gradient(circle at center, white, transparent 70%)"
        ></div>

        <!-- Pinched-ticket style 404 digits -->
        <div class="relative flex gap-2">
          {#each ['4', '0', '4'] as digit, i (`${digit}-${i}`)}
            <div
              class="flex h-24 w-16 items-center justify-center rounded-sm sm:h-28 sm:w-20 {i === 1
                ? 'bg-white/20'
                : 'bg-white'}"
              style="clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 15% 50%)"
            >
              <span
                class="font-heading text-4xl font-black sm:text-5xl {i === 1
                  ? 'text-white'
                  : 'text-primary'}"
              >
                {digit}
              </span>
            </div>
          {/each}
        </div>
        <p class="relative mt-8 text-xs font-bold tracking-[0.25em] text-white/80 uppercase">
          Lạc nhịp giữa đám đông
        </p>

        <!-- Decorative blur circle -->
        <div
          class="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"
        ></div>
      </section>

      <!-- ── Quote card ── -->
      <section
        class="arch-enter flex flex-col overflow-hidden rounded-2xl bg-surface-container md:col-span-4"
        style="animation-delay: 200ms"
      >
        <div class="flex flex-1 flex-col justify-center p-6 sm:p-7">
          <div class="mb-3 text-4xl leading-none opacity-20">❝</div>
          <blockquote class="text-base leading-relaxed font-medium text-foreground italic">
            "Chớ bảo xuân tàn hoa rụng hết <br />
            Đêm qua, sân trước, một cành mai"
          </blockquote>
          <p class="mt-3 text-sm text-muted-foreground">— Mãn Giác Thiền Sư</p>
          <div class="mt-5">
            <a
              href={resolve('/search')}
              class="inline-flex items-center gap-1.5 text-sm font-bold text-primary transition-colors hover:text-primary-container"
            >
              Tìm kiếm sự kiện khác
              <ArrowRight class="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <!-- ── Categories card ── -->
      <section
        class="arch-enter flex flex-col justify-between rounded-2xl bg-surface-container-low p-6 sm:p-7 md:col-span-4"
        style="animation-delay: 300ms"
      >
        <div>
          <h2 class="mb-4 text-xl font-bold text-foreground">Các chủ đề nổi bật</h2>
          <div class="grid grid-cols-2 gap-3">
            {#each [{ icon: '🎭', label: 'Hài kịch' }, { icon: '⚽', label: 'Thể thao' }, { icon: '🎵', label: 'Âm nhạc' }, { icon: '🎨', label: 'Nghệ thuật' }] as cat (cat.label)}
              <a
                href={resolve(
                  `/?category=${cat.label
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/đ/g, 'd')
                    .replace(/Đ/g, 'D')
                    .toLowerCase()
                    .replace(/\s+/g, '-')}`,
                )}
                class="flex items-center gap-2.5 rounded-lg bg-surface-container-lowest px-3 py-3 text-sm font-medium text-foreground shadow-sm transition-shadow hover:shadow-md"
              >
                <span class="text-base">{cat.icon}</span>
                {cat.label}
              </a>
            {/each}
          </div>
        </div>
        <div class="mt-5 text-center">
          <a
            href={resolve('/events')}
            class="text-sm font-semibold text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Xem tất cả sự kiện
          </a>
        </div>
      </section>

      <!-- ── Need help card ── -->
      <section
        class="arch-enter flex flex-col items-center justify-center rounded-2xl bg-primary-light p-7 text-center sm:p-8 md:col-span-4"
        style="animation-delay: 400ms"
      >
        <div
          class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-inner"
        >
          <Headset class="h-7 w-7 text-primary" />
        </div>
        <h2 class="mb-2 text-xl font-bold text-foreground">Cần hỗ trợ?</h2>
        <p class="mb-6 max-w-xs text-sm text-muted-foreground">
          Đội ngũ hỗ trợ của chúng tôi luôn sẵn sàng giúp đỡ bạn. Đừng ngần ngại liên hệ với chúng
          tôi!
        </p>
        <a
          href="mailto:support@tixtac.io.vn"
          class="inline-flex w-full items-center justify-center rounded-full bg-surface-container-highest px-6 py-3 text-sm font-bold text-foreground transition-opacity hover:opacity-90"
        >
          Gửi email cho chúng tôi
        </a>
      </section>
    </div>
  </div>
</div>
