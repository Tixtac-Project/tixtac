<script lang="ts">
  import { resolve } from '$app/paths';
  const version = __APP_VERSION__;
</script>

<footer class="rounded-none border-t border-border bg-secondary md:rounded-t-3xl lg:rounded-t-5xl">
  <div class="mx-auto max-w-11/12 px-6 py-16 pb-10 md:max-w-7/9">
    <div class="grid gap-12 xl:grid-cols-[1.7fr_1fr_1fr_1.4fr]">
      <div class="space-y-5">
        <div class="flex items-center gap-3">
          <span class="text-2xl font-bold text-primary md:text-3xl lg:text-4xl">TIXTAC</span>
        </div>
        <p class="max-w-md text-sm leading-6 text-muted-foreground">
          Nền tảng đặt vé sự kiện hàng đầu Việt Nam.
          <br />
          Nhanh chóng, bảo mật, tiện lợi.
        </p>

        <div
          class="flex flex-wrap items-center gap-3 *:inline-flex *:size-9 *:items-center *:justify-center *:rounded-xl *:border *:border-border *:bg-card *:text-muted-foreground *:transition-all *:hover:border-primary *:hover:bg-primary *:hover:text-primary-foreground"
        >
          <a href="https://github.com/Tixtac-Project/tixtac" aria-label="GitHub">
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
              <path
                d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.5 11.5 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12"
              />
            </svg>
          </a>

          <a href="https://facebook.com" aria-label="Facebook">
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
              <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
            </svg>
          </a>
          <a href="https://instagram.com" aria-label="Instagram">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="h-4 w-4"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
          </a>
          <a
            href="https://tiktok.com"
            class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground"
            aria-label="TikTok"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
              <path
                d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.14 8.14 0 004.83 1.55V6.79a4.85 4.85 0 01-1.06-.1z"
              />
            </svg>
          </a>
          <a
            href="https://youtube.com"
            class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground"
            aria-label="YouTube"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
              <path
                d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"
              />
            </svg>
          </a>
        </div>
      </div>

      <div>
        <h3 class="mb-4 text-xs font-bold tracking-[0.16em] text-muted-foreground uppercase">
          Về TixTac
        </h3>
        <ul class="space-y-3 text-sm">
          <li>
            <a
              href={resolve('/about')}
              class="text-secondary-foreground transition-colors hover:text-primary"
            >
              Giới thiệu
            </a>
          </li>
          <li>
            <a
              href={resolve('/careers')}
              class="text-secondary-foreground transition-colors hover:text-primary"
            >
              Tuyển dụng
            </a>
          </li>
          <li>
            <a
              href={resolve('/news')}
              class="text-secondary-foreground transition-colors hover:text-primary"
            >
              Tin tức
            </a>
          </li>
          <li>
            <a
              href={resolve('/contact')}
              class="text-secondary-foreground transition-colors hover:text-primary"
            >
              Liên hệ
            </a>
          </li>
        </ul>
      </div>

      <div>
        <h3 class="mb-4 text-xs font-bold tracking-[0.16em] text-muted-foreground uppercase">
          Hỗ trợ
        </h3>
        <ul class="space-y-3 text-sm">
          <li>
            <a
              href={resolve('/terms')}
              class="text-secondary-foreground transition-colors hover:text-primary"
            >
              Điều khoản sử dụng
            </a>
          </li>
          <li>
            <a
              href={resolve('/privacy')}
              class="text-secondary-foreground transition-colors hover:text-primary"
            >
              Chính sách bảo mật
            </a>
          </li>
          <li>
            <a
              href={resolve('/faq')}
              class="text-secondary-foreground transition-colors hover:text-primary"
            >
              FAQ
            </a>
          </li>
        </ul>
      </div>

      <div class="space-y-6">
        <div>
          <h3 class="mb-4 text-xs font-bold tracking-[0.16em] text-muted-foreground uppercase">
            Liên hệ
          </h3>
          <div class="grid gap-4 text-sm text-foreground/80">
            <p>
              <span class="font-semibold">Địa chỉ:</span>
              UET-VNU, Khu công nghệ cao Hòa Lạc, Hoà Lạc, Hà Nội
            </p>
            <p>
              <span class="font-semibold">Email:</span>
              <a
                href="mailto:support@tixtac.io.vn"
                class="text-primary transition-colors hover:text-primary-container"
              >
                support@tixtac.io.vn
              </a>
            </p>
            <p>
              <span class="font-semibold">Điện thoại:</span>
              <a
                href="tel:+84123456789"
                class="text-primary transition-colors hover:text-primary-container"
              >
                +84 123 456 789
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
    <div
      class="mt-10 border-t border-border pt-6 text-sm text-muted-foreground sm:flex sm:items-center sm:justify-between"
    >
      <p>v{version} &copy; 2026 TixTac Organization. All rights reserved.</p>
      <p>Made with ❤️ in Vietnam</p>
    </div>
  </div>
</footer>
