<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { ArrowRight, Headset, House } from 'lucide-svelte';

  let status = $derived(page.status);
  let message = $derived(page.error?.message || 'Something went wrong');
  let role = $derived(page.data?.user?.role || 'customer');
</script>

<svelte:head>
  <title>{status} - TixTac</title>
</svelte:head>

<div
  class="flex min-h-screen w-full items-center justify-center bg-surface px-4 py-12 md:px-6 md:py-16"
>
  <div class="w-full max-w-6xl">
    <div class="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
      <!-- ── Hero message card ── -->
      <section
        class="arch-enter flex flex-col justify-center rounded-2xl bg-surface-container-low p-7 sm:p-10 md:col-span-8 md:row-span-2 md:p-12"
      >
        <p class="label-overline mb-3 text-sm font-bold tracking-widest text-primary uppercase">
          Mã lỗi: {status}
        </p>
        <h1
          class="font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-7xl"
        >
          <span class="text-primary italic">Lỡ hẹn</span>
          mất rồi?
        </h1>

        <p class="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
          {#if status === 404}
            Rất tiếc, trang này đã "bốc hơi" hoặc chưa từng tồn tại. Nhưng thời gian không chờ đợi
            ai cả, hãy nhanh chóng tìm cho mình một sự kiện hấp dẫn khác nào!
          {:else}
            Có vẻ như đã xảy ra lỗi không mong muốn. Đừng lo, đội ngũ của chúng tôi đã được thông
            báo và đang làm việc để khắc phục. {message}
          {/if}
        </p>

        <div class="mt-7">
          <a
            href={resolve(role === 'customer' ? '/' : '/admin')}
            class="btn-primary-gradient inline-flex items-center gap-2.5 px-7 py-3.5 text-sm font-bold"
          >
            <House class="size-4" />
            {role === 'customer' ? 'Trở lại trang chủ' : 'Trở lại trang quản trị'}
          </a>
        </div>
      </section>

      <!-- ── 404 visual card ── -->
      <section
        class="arch-enter relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-2xl p-8 md:col-span-4 md:row-span-2 md:min-h-0"
        style="background: linear-gradient(135deg, var(--primary), var(--primary-container)); animation-delay: 100ms"
      >
        <!-- Glow -->
        <div
          class="absolute inset-0 opacity-10"
          style="background: radial-gradient(circle at center, white, transparent 70%)"
        ></div>

        <!-- Ticket digits -->
        <div class="relative flex gap-2">
          {#each ['4', '0', '4'] as digit, i (`${digit}-${i}`)}
            <div
              class="flex h-20 w-14 items-center justify-center rounded-sm sm:h-24 sm:w-16 md:h-28 md:w-20 {i ===
              1
                ? 'bg-white/20'
                : 'bg-white'}"
              style="clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 15% 50%)"
            >
              <span
                class="font-heading text-3xl font-black sm:text-4xl md:text-5xl {i === 1
                  ? 'text-white'
                  : 'text-primary'}"
              >
                {digit}
              </span>
            </div>
          {/each}
        </div>

        <p class="relative mt-6 text-xs font-bold tracking-[0.25em] text-white/80 uppercase">
          Lạc nhịp giữa đám đông
        </p>

        <div
          class="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"
        ></div>
      </section>

      <!-- ── Bottom row: 3 cards equal width ── -->

      <!-- Quote card -->
      <section
        class="arch-enter flex flex-col overflow-hidden rounded-2xl bg-surface-container md:col-span-4"
        style="animation-delay: 200ms"
      >
        <div class="flex flex-1 flex-col justify-center p-6 sm:p-7">
          <div class="mb-3 text-4xl leading-none opacity-20">❝</div>
          <blockquote class="text-base leading-relaxed font-medium text-foreground italic">
            Chớ bảo xuân tàn hoa rụng hết <br />
            Đêm qua - sân trước, một cành mai
          </blockquote>
          <p class="mt-3 text-sm text-muted-foreground">— Mãn Giác Thiền Sư</p>
          <div class="mt-5">
            <a
              href={resolve('/search')}
              class="inline-flex items-center gap-1.5 text-sm font-bold text-primary transition-colors hover:opacity-80"
            >
              Tìm kiếm sự kiện khác
              <ArrowRight class="size-4" />
            </a>
          </div>
        </div>
      </section>

      <!-- Categories card -->
      <section
        class="arch-enter flex flex-col justify-between rounded-2xl bg-surface-container-low p-6 sm:p-7 md:col-span-4"
        style="animation-delay: 300ms"
      >
        <div>
          <h2 class="mb-4 text-base font-bold text-foreground">Các chủ đề nổi bật</h2>
          <div class="grid grid-cols-2 gap-2.5">
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
                class="flex items-center gap-2 rounded-xl bg-surface-container-lowest px-3 py-3 text-sm font-medium text-foreground transition-shadow hover:shadow-md"
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

      <!-- Need help card -->
      <section
        class="arch-enter flex flex-col items-center justify-center rounded-2xl bg-primary-light p-7 text-center sm:p-8 md:col-span-4"
        style="animation-delay: 400ms"
      >
        <div
          class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-inner"
        >
          <Headset class="size-6 text-primary" />
        </div>
        <h2 class="mb-2 text-base font-bold text-foreground">Cần hỗ trợ?</h2>
        <p class="mb-5 max-w-xs text-sm text-muted-foreground">
          Đội ngũ hỗ trợ luôn sẵn sàng giúp bạn. Đừng ngần ngại liên hệ!
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
