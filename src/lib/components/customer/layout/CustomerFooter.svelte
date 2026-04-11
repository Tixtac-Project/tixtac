<script lang="ts">
  import { resolve } from '$app/paths';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
</script>

<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-grid">
      <!-- Col 1: Brand -->
      <div class="footer-col">
        <div class="footer-logo">
          <span class="logo-icon">🎫</span>
          <span class="logo-text">TixTac</span>
        </div>
        <p class="footer-tagline">
          Nền tảng đặt vé sự kiện hàng đầu Việt Nam. Nhanh chóng, bảo mật, tiện lợi.
        </p>
        <div class="social-links">
          <Button
            href="https://facebook.com"
            variant="ghost"
            size="icon"
            class="social-btn"
            aria-label="Facebook"
            id="footer-facebook"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
              <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
            </svg>
          </Button>
          <Button
            href="https://instagram.com"
            variant="ghost"
            size="icon"
            class="social-btn"
            aria-label="Instagram"
            id="footer-instagram"
          >
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
          </Button>
          <Button
            href="https://tiktok.com"
            variant="ghost"
            size="icon"
            class="social-btn"
            aria-label="TikTok"
            id="footer-tiktok"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
              <path
                d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.14 8.14 0 004.83 1.55V6.79a4.85 4.85 0 01-1.06-.1z"
              />
            </svg>
          </Button>
          <Button
            href="https://youtube.com"
            variant="ghost"
            size="icon"
            class="social-btn"
            aria-label="YouTube"
            id="footer-youtube"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
              <path
                d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"
              />
            </svg>
          </Button>
        </div>
      </div>

      <!-- Col 2: Về chúng tôi -->
      <div class="footer-col">
        <h4 class="footer-heading">Về TixTac</h4>
        <ul class="footer-links">
          <li><a href={resolve('/about')} id="footer-about">Giới thiệu</a></li>
          <li><a href={resolve('/careers')} id="footer-careers">Tuyển dụng</a></li>
          <li><a href={resolve('/news')} id="footer-news">Tin tức</a></li>
          <li><a href={resolve('/contact')} id="footer-contact">Liên hệ</a></li>
        </ul>
      </div>

      <!-- Col 3: Hỗ trợ -->
      <div class="footer-col">
        <h4 class="footer-heading">Hỗ trợ</h4>
        <ul class="footer-links">
          <li><a href={resolve('/faq')} id="footer-faq">FAQ</a></li>
          <li><a href={resolve('/refund-policy')} id="footer-refund">Chính sách hoàn vé</a></li>
          <li><a href={resolve('/terms')} id="footer-terms">Điều khoản sử dụng</a></li>
          <li><a href={resolve('/privacy')} id="footer-privacy">Chính sách bảo mật</a></li>
        </ul>
      </div>

      <!-- Col 4: App & Payment -->
      <div class="footer-col">
        <h4 class="footer-heading">Tải ứng dụng</h4>
        <div class="app-badges">
          <Button
            href={resolve('/')}
            variant="outline"
            size="sm"
            class="app-badge"
            id="footer-appstore"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
              <path
                d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
              />
            </svg>
            <div class="app-badge-text">
              <span class="app-badge-sub">Download on the</span>
              <span class="app-badge-main">App Store</span>
            </div>
          </Button>
          <Button
            href={resolve('/')}
            variant="outline"
            size="sm"
            class="app-badge"
            id="footer-googleplay"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
              <path
                d="M3 20.5v-17c0-.83 1-.98 1.43-.43l14 8.5c.31.18.31.68 0 .87l-14 8.5C3.97 21.47 3 21.33 3 20.5z"
              />
            </svg>
            <div class="app-badge-text">
              <span class="app-badge-sub">Get it on</span>
              <span class="app-badge-main">Google Play</span>
            </div>
          </Button>
        </div>
        <div class="payment-section">
          <p class="payment-label">Phương thức thanh toán</p>
          <div class="payment-icons">
            <Badge variant="outline">Visa</Badge>
            <Badge variant="outline">Master</Badge>
            <Badge variant="outline">MoMo</Badge>
            <Badge variant="outline">ZaloPay</Badge>
            <Badge variant="outline">VNPay</Badge>
          </div>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <p>&copy; 2026 TixTac Ticket Booking. All rights reserved.</p>
      <p class="footer-made">Made with ❤️ in Việt Nam</p>
    </div>
  </div>
</footer>

<style>
  .site-footer {
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
    padding: 60px 0 0;
  }

  .footer-inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 24px;
  }

  .footer-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1.5fr;
    gap: 48px;
  }

  .footer-bottom {
    border-top: 1px solid var(--color-border);
    margin-top: 40px;
    padding: 20px 0;
    display: flex;
    justify-content: space-between;
  }

  @media (max-width: 1024px) {
    .footer-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 768px) {
    .footer-grid {
      grid-template-columns: 1fr;
    }

    .footer-bottom {
      flex-direction: column;
      text-align: center;
    }
  }
</style>
