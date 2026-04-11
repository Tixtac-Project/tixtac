<script lang="ts">
    import { page } from '$app/stores';
    import { enhance } from '$app/forms';
    import { goto, invalidateAll } from '$app/navigation';
    import type { Snippet } from 'svelte';

    interface Props { children: Snippet; }
    let { children }: Props = $props();

    let user = $derived($page.data.user);
    let searchQuery = $derived($page.url.searchParams.get('q') ?? '');

    // Xử lý đăng xuất: xóa cookie rồi về homepage, cập nhật UI ngay
    function handleLogout() {
        return async ({ result }: { result: { type: string } }) => {
            await invalidateAll();
            await goto('/');
        };
    }
</script>

<div class="tixtac-root">
    <!-- ───────────── NAVBAR ───────────── -->
    <header class="navbar">
        <div class="navbar-inner">
            <!-- Logo -->
            <a href="/" class="navbar-logo" id="nav-logo">
                <span class="logo-icon">🎫</span>
                <span class="logo-text">TixTac</span>
            </a>

            <!-- Search Bar -->
            <form action="/" method="GET" class="navbar-search" id="nav-search-form">
                <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="text"
                    name="q"
                    value={searchQuery}
                    placeholder="Tìm kiếm sự kiện, nghệ sĩ, địa điểm..."
                    class="search-input"
                    id="nav-search-input"
                />
            </form>

            <!-- Auth Nav -->
            <nav class="navbar-auth">
                {#if user}
                    <a href="/me" class="nav-link" id="nav-tickets-link">🎟️ Vé của tôi</a>
                    <form action="/api/auth/logout" method="POST" use:enhance={handleLogout}>
                        <button type="submit" class="btn-ghost-danger" id="nav-logout-btn">Đăng xuất</button>
                    </form>
                {:else}
                    <a href="/login" class="nav-link" id="nav-login-link">Đăng nhập</a>
                    <a href="/register" class="btn-primary" id="nav-register-btn">Đăng ký</a>
                {/if}
            </nav>
        </div>
    </header>

    <!-- ───────────── CONTENT ───────────── -->
    <main class="main-content">
        {@render children()}
    </main>

    <!-- ───────────── FOOTER ───────────── -->
    <footer class="site-footer">
        <div class="footer-inner">
            <div class="footer-grid">
                <!-- Col 1: Brand -->
                <div class="footer-col">
                    <div class="footer-logo">
                        <span class="logo-icon">🎫</span>
                        <span class="logo-text">TixTac</span>
                    </div>
                    <p class="footer-tagline">Nền tảng đặt vé sự kiện hàng đầu Việt Nam. Nhanh chóng, bảo mật, tiện lợi.</p>
                    <div class="social-links">
                        <a href="https://facebook.com" class="social-btn" aria-label="Facebook" id="footer-facebook">
                            <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
                        </a>
                        <a href="https://instagram.com" class="social-btn" aria-label="Instagram" id="footer-instagram">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                        </a>
                        <a href="https://tiktok.com" class="social-btn" aria-label="TikTok" id="footer-tiktok">
                            <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.14 8.14 0 004.83 1.55V6.79a4.85 4.85 0 01-1.06-.1z"/></svg>
                        </a>
                        <a href="https://youtube.com" class="social-btn" aria-label="YouTube" id="footer-youtube">
                            <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>
                        </a>
                    </div>
                </div>

                <!-- Col 2: Về chúng tôi -->
                <div class="footer-col">
                    <h4 class="footer-heading">Về TixTac</h4>
                    <ul class="footer-links">
                        <li><a href="/about" id="footer-about">Giới thiệu</a></li>
                        <li><a href="/careers" id="footer-careers">Tuyển dụng</a></li>
                        <li><a href="/news" id="footer-news">Tin tức</a></li>
                        <li><a href="/contact" id="footer-contact">Liên hệ</a></li>
                    </ul>
                </div>

                <!-- Col 3: Hỗ trợ -->
                <div class="footer-col">
                    <h4 class="footer-heading">Hỗ trợ</h4>
                    <ul class="footer-links">
                        <li><a href="/faq" id="footer-faq">FAQ</a></li>
                        <li><a href="/refund-policy" id="footer-refund">Chính sách hoàn vé</a></li>
                        <li><a href="/terms" id="footer-terms">Điều khoản sử dụng</a></li>
                        <li><a href="/privacy" id="footer-privacy">Chính sách bảo mật</a></li>
                    </ul>
                </div>

                <!-- Col 4: App & Payment -->
                <div class="footer-col">
                    <h4 class="footer-heading">Tải ứng dụng</h4>
                    <div class="app-badges">
                        <a href="/" class="app-badge" id="footer-appstore">
                            <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                            <div>
                                <span class="app-badge-sub">Download on the</span>
                                <span class="app-badge-main">App Store</span>
                            </div>
                        </a>
                        <a href="/" class="app-badge" id="footer-googleplay">
                            <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M3 20.5v-17c0-.83 1-.98 1.43-.43l14 8.5c.31.18.31.68 0 .87l-14 8.5C3.97 21.47 3 21.33 3 20.5z"/></svg>
                            <div>
                                <span class="app-badge-sub">Get it on</span>
                                <span class="app-badge-main">Google Play</span>
                            </div>
                        </a>
                    </div>
                    <div class="payment-section">
                        <p class="payment-label">Phương thức thanh toán</p>
                        <div class="payment-icons">
                            <span class="payment-badge">Visa</span>
                            <span class="payment-badge">Master</span>
                            <span class="payment-badge momo">MoMo</span>
                            <span class="payment-badge zalopay">ZaloPay</span>
                            <span class="payment-badge vnpay">VNPay</span>
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
</div>

<style>
    /* ── Design Tokens: Light Minimalist ── */
    :global(:root) {
        --color-bg: #FFFFFF;
        --color-surface: #F8FAFC;
        --color-surface-low: #F1F5F9;
        --color-card: #FFFFFF;
        --color-card-high: #F8FAFC;
        --color-border: #E2E8F0;
        --color-primary: #4F46E5;
        --color-primary-dim: #4F46E5;
        --color-secondary: #0EA5E9;
        --color-accent: #F43F5E;
        --color-text: #0F172A;
        --color-muted: #94A3B8;
        --color-muted-strong: #475569;
        --font-main: 'Inter', system-ui, sans-serif;
        --radius-card: 12px;
        --radius-pill: 999px;
    }

    :global(*) { box-sizing: border-box; margin: 0; padding: 0; }
    :global(body) {
        font-family: var(--font-main);
        background-color: var(--color-bg);
        color: var(--color-text);
        min-height: 100vh;
    }
    :global(a) { color: inherit; text-decoration: none; }

    /* ── Root wrapper ── */
    .tixtac-root {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
    }

    /* ── Navbar ── */
    .navbar {
        position: sticky;
        top: 0;
        z-index: 100;
        width: 100%;
        background: #FFFFFF;
        border-bottom: 1px solid var(--color-border);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    }

    .navbar-inner {
        max-width: 1280px;
        margin: 0 auto;
        padding: 0 24px;
        min-height: 68px;
        display: flex;
        align-items: center;
        gap: 20px;
        flex-wrap: wrap;
        padding-top: 8px;
        padding-bottom: 8px;
    }

    /* Logo */
    .navbar-logo, .footer-logo {
        display: flex;
        align-items: center;
        gap: 8px;
        text-decoration: none;
        flex-shrink: 0;
    }
    .logo-icon { font-size: 1.4rem; }
    .logo-text {
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--color-text);
        letter-spacing: -0.03em;
    }
    .footer-logo .logo-text { font-size: 1.3rem; }

    /* Search */
    .navbar-search {
        flex: 1;
        max-width: 480px;
        position: relative;
        display: flex;
        align-items: center;
    }
    .search-icon {
        position: absolute;
        left: 14px;
        width: 18px;
        height: 18px;
        color: var(--color-muted);
        pointer-events: none;
    }
    .search-input {
        width: 100%;
        background: var(--color-card);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-pill);
        padding: 10px 18px 10px 42px;
        font-size: 0.9rem;
        color: var(--color-text);
        font-family: var(--font-main);
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
    }
    .search-input::placeholder { color: var(--color-muted); }
    .search-input:focus {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
    }

    /* Nav auth */
    .navbar-auth {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
        margin-left: auto;
    }
    .nav-link {
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--color-muted-strong);
        transition: color 0.2s;
        padding: 6px 2px;
    }
    .nav-link:hover { color: var(--color-primary); }

    .btn-ghost-danger {
        background: none;
        border: none;
        font-size: 0.9rem;
        font-weight: 500;
        color: #DC2626;
        cursor: pointer;
        font-family: var(--font-main);
        transition: color 0.2s;
        padding: 6px 2px;
    }
    .btn-ghost-danger:hover { color: #B91C1C; }

    .btn-primary {
        background: var(--color-primary);
        color: white;
        font-size: 0.875rem;
        font-weight: 600;
        padding: 9px 20px;
        border-radius: var(--radius-pill);
        transition: background 0.2s, transform 0.15s;
    }
    .btn-primary:hover {
        background: #4338CA;
        transform: translateY(-1px);
    }

    /* ── Main ── */
    .main-content {
        flex: 1;
        max-width: 1280px;
        width: 100%;
        margin: 0 auto;
        padding: 40px 24px 64px;
    }

    /* ── Footer ── */
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
        padding-bottom: 48px;
    }
    .footer-tagline {
        font-size: 0.875rem;
        color: var(--color-muted);
        line-height: 1.6;
        margin-top: 12px;
    }
    .social-links {
        display: flex;
        gap: 10px;
        margin-top: 20px;
    }
    .social-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        background: var(--color-card);
        color: var(--color-muted-strong);
        border: 1px solid var(--color-border);
        transition: background 0.2s, color 0.2s, border-color 0.2s;
    }
    .social-btn:hover {
        background: var(--color-primary);
        color: white;
        border-color: var(--color-primary);
    }
    .footer-heading {
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--color-muted);
        margin-bottom: 16px;
    }
    .footer-links {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .footer-links a {
        font-size: 0.9rem;
        color: var(--color-muted-strong);
        transition: color 0.2s;
    }
    .footer-links a:hover { color: var(--color-primary); }

    /* App badges */
    .app-badges {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .app-badge {
        display: flex;
        align-items: center;
        gap: 10px;
        background: var(--color-card);
        border: 1px solid var(--color-border);
        border-radius: 10px;
        padding: 10px 14px;
        color: var(--color-text);
        transition: border-color 0.2s, background 0.2s;
    }
    .app-badge:hover { border-color: var(--color-primary); background: var(--color-card-high); }
    .app-badge-sub { display: block; font-size: 0.68rem; color: var(--color-muted); }
    .app-badge-main { display: block; font-size: 0.875rem; font-weight: 700; }

    /* Payment */
    .payment-section { margin-top: 20px; }
    .payment-label { font-size: 0.75rem; color: var(--color-muted); margin-bottom: 8px; }
    .payment-icons { display: flex; flex-wrap: wrap; gap: 6px; }
    .payment-badge {
        padding: 3px 10px;
        border-radius: 6px;
        background: var(--color-card);
        border: 1px solid var(--color-border);
        font-size: 0.72rem;
        font-weight: 600;
        color: var(--color-muted-strong);
    }
    .payment-badge.momo { color: #ae0070; border-color: #ae0070; background: rgba(174,0,112,0.1); }
    .payment-badge.zalopay { color: #0068ff; border-color: #0068ff; background: rgba(0,104,255,0.1); }
    .payment-badge.vnpay { color: #002b99; border-color: #5577ff; background: rgba(0,43,153,0.15); }

    /* Footer bottom */
    .footer-bottom {
        border-top: 1px solid var(--color-border);
        padding: 20px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.82rem;
        color: var(--color-muted);
    }

    /* ── Responsive ── */
    @media (max-width: 1024px) {
        .footer-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
    }
    @media (max-width: 768px) {
        .navbar-inner { gap: 12px; }
        .navbar-search { 
            order: 3; 
            max-width: none; 
            width: 100%; 
            margin-top: 4px;
            margin-bottom: 4px;
        }
        .navbar-auth { margin-left: auto; }
        .footer-grid { grid-template-columns: 1fr; gap: 24px; }
        .footer-bottom { flex-direction: column; gap: 8px; text-align: center; }
    }
</style>
