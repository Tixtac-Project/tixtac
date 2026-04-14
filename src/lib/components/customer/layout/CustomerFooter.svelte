<script lang="ts">
  import { resolve } from '$app/paths';
</script>

<footer class="border-t border-slate-200 bg-slate-50">
  <div class="mx-auto max-w-7xl px-6 py-16">
    <div class="grid gap-12 xl:grid-cols-[1.7fr_1fr_1fr_1.4fr]">
      <div class="space-y-5">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🎫</span>
          <span class="text-xl font-semibold text-slate-900">TixTac</span>
        </div>
        <p class="max-w-md text-sm leading-6 text-slate-600">
          Nền tảng đặt vé sự kiện hàng đầu Việt Nam. Nhanh chóng, bảo mật, tiện lợi.
        </p>

        <div class="flex flex-wrap items-center gap-3">
          <a href="https://facebook.com" class="social-btn" aria-label="Facebook">
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
              <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
            </svg>
          </a>
          <a href="https://instagram.com" class="social-btn" aria-label="Instagram">
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
          <a href="https://tiktok.com" class="social-btn" aria-label="TikTok">
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
              <path
                d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.14 8.14 0 004.83 1.55V6.79a4.85 4.85 0 01-1.06-.1z"
              />
            </svg>
          </a>
          <a href="https://youtube.com" class="social-btn" aria-label="YouTube">
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
              <path
                d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"
              />
            </svg>
          </a>
        </div>
      </div>

      <div>
        <h3 class="footer-heading">Về TixTac</h3>
        <ul class="space-y-3 text-sm text-slate-600">
          <li><a href={resolve('/about')} class="footer-link">Giới thiệu</a></li>
          <li><a href={resolve('/careers')} class="footer-link">Tuyển dụng</a></li>
          <li><a href={resolve('/news')} class="footer-link">Tin tức</a></li>
          <li><a href={resolve('/contact')} class="footer-link">Liên hệ</a></li>
        </ul>
      </div>

      <div>
        <h3 class="footer-heading">Hỗ trợ</h3>
        <ul class="space-y-3 text-sm text-slate-600">
          <li><a href={resolve('/faq')} class="footer-link">FAQ</a></li>
          <li><a href={resolve('/refund-policy')} class="footer-link">Chính sách hoàn vé</a></li>
          <li><a href={resolve('/terms')} class="footer-link">Điều khoản sử dụng</a></li>
          <li><a href={resolve('/privacy')} class="footer-link">Chính sách bảo mật</a></li>
        </ul>
      </div>

      <div class="space-y-6">
        <div>
          <h3 class="footer-heading">Tải ứng dụng</h3>
          <div class="grid gap-3 sm:grid-cols-2">
            <a href={resolve('/')} class="app-badge">
              <svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
                <path
                  d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
                />
              </svg>
              <div>
                <p class="text-[10px] tracking-[0.18em] text-slate-500 uppercase">
                  Download on the
                </p>
                <p class="text-sm font-semibold text-slate-900">App Store</p>
              </div>
            </a>
            <a href={resolve('/')} class="app-badge">
              <svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
                <path
                  d="M3 20.5v-17c0-.83 1-.98 1.43-.43l14 8.5c.31.18.31.68 0 .87l-14 8.5C3.97 21.47 3 21.33 3 20.5z"
                />
              </svg>
              <div>
                <p class="text-[10px] tracking-[0.18em] text-slate-500 uppercase">Get it on</p>
                <p class="text-sm font-semibold text-slate-900">Google Play</p>
              </div>
            </a>
          </div>
        </div>

        <div>
          <p class="text-sm text-slate-500">Phương thức thanh toán</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <span class="payment-badge">Visa</span>
            <span class="payment-badge">Master</span>
            <span class="payment-badge payment-badge-momo">MoMo</span>
            <span class="payment-badge payment-badge-zalopay">ZaloPay</span>
            <span class="payment-badge payment-badge-vnpay">VNPay</span>
          </div>
        </div>
      </div>
    </div>

    <div
      class="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex sm:items-center sm:justify-between"
    >
      <p>&copy; 2026 TixTac Ticket Booking. All rights reserved.</p>
      <p>Made with ❤️ in Việt Nam</p>
    </div>
  </div>
</footer>

<style>
  .social-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: white;
    border: 1px solid #e2e8f0;
    color: #64748b;
    transition: all 0.2s ease;
  }
  .social-btn:hover {
    background: #4f46e5;
    color: white;
    border-color: #4f46e5;
  }
  .footer-heading {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 1rem;
  }
  .footer-link {
    display: inline-block;
    color: #475569;
    transition: color 0.2s ease;
  }
  .footer-link:hover {
    color: #4f46e5;
  }
  .app-badge {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    padding: 0.85rem 1rem;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 1rem;
    transition:
      border-color 0.2s ease,
      background 0.2s ease;
  }
  .app-badge:hover {
    border-color: #4f46e5;
    background: #eef2ff;
  }
  .payment-badge {
    padding: 0.35rem 0.85rem;
    border-radius: 9999px;
    background: white;
    border: 1px solid #e2e8f0;
    font-size: 0.72rem;
    font-weight: 600;
    color: #475569;
  }
  .payment-badge-momo {
    color: #ae0070;
    border-color: rgba(174, 0, 112, 0.2);
    background: rgba(174, 0, 112, 0.08);
  }
  .payment-badge-zalopay {
    color: #0068ff;
    border-color: rgba(0, 104, 255, 0.2);
    background: rgba(0, 104, 255, 0.08);
  }
  .payment-badge-vnpay {
    color: #002b99;
    border-color: rgba(85, 119, 255, 0.2);
    background: rgba(85, 119, 255, 0.08);
  }
</style>
