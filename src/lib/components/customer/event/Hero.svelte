<script lang="ts">
  import { resolve } from '$app/paths';
</script>

<section class="hero">
  <div class="hero-bg-glow"></div>
  <div class="hero-content">
    <div class="hero-badge">✨ Hơn 500,000 vé đã được đặt</div>
    <h1 class="hero-title">
      Trải nghiệm
      <br />
      <span class="hero-title-accent">sự kiện đỉnh cao</span>
    </h1>
    <p class="hero-sub">
      Đặt vé concert, festival, thể thao và hơn thế nữa
      <br />
      chỉ trong vài giây — bảo mật, nhanh chóng, tiện lợi.
    </p>
    <div class="hero-ctas">
      <a href={resolve('#events')} class="cta-primary" id="hero-cta-explore">
        Khám phá sự kiện
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      </a>
      <a href={resolve('/events')} class="cta-ghost" id="hero-cta-today">Xem sự kiện hôm nay →</a>
    </div>
    <div class="hero-stats">
      <div class="stat-pill">
        <span class="stat-num">15,000+</span>
        <span class="stat-label">Sự kiện</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-pill">
        <span class="stat-num">500K+</span>
        <span class="stat-label">Vé đã bán</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-pill">
        <span class="stat-num">60s</span>
        <span class="stat-label">Đặt vé xong</span>
      </div>
    </div>
  </div>
</section>

<style>
  .hero {
    position: relative;
    text-align: center;
    padding: 80px 24px 72px;
    overflow: hidden;
  }
  .hero-bg-glow {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 70% 60% at 50% -20%, rgba(108, 58, 255, 0.25) 0%, transparent 70%),
      radial-gradient(ellipse 40% 40% at 80% 80%, rgba(255, 58, 140, 0.1) 0%, transparent 60%);
    pointer-events: none;
  }
  .hero-content {
    position: relative;
    max-width: 720px;
    margin: 0 auto;
  }
  .hero-badge {
    display: inline-block;
    padding: 6px 16px;
    border-radius: 999px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #475569;
    font-size: 0.82rem;
    font-weight: 600;
    margin-bottom: 24px;
    letter-spacing: 0.01em;
  }
  .hero-title {
    font-size: clamp(2.4rem, 5vw, 3.8rem);
    font-weight: 800;
    line-height: 1.12;
    letter-spacing: -0.03em;
    color: var(--color-text);
    margin-bottom: 20px;
  }
  .hero-title-accent {
    color: var(--color-primary);
  }
  .hero-sub {
    font-size: 1.1rem;
    color: var(--color-muted-strong);
    line-height: 1.65;
    margin-bottom: 36px;
  }
  .hero-ctas {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 40px;
  }
  .cta-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 13px 28px;
    border-radius: 999px;
    background: var(--color-primary);
    color: white;
    font-weight: 700;
    font-size: 0.95rem;
    transition:
      transform 0.2s,
      background 0.2s;
    text-decoration: none;
  }
  .cta-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 32px rgba(108, 58, 255, 0.55);
    opacity: 0.92;
  }
  .cta-ghost {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 12px 24px;
    border-radius: 999px;
    border: 1px solid rgba(108, 58, 255, 0.4);
    color: var(--color-primary);
    font-weight: 600;
    font-size: 0.9rem;
    transition:
      border-color 0.2s,
      background 0.2s;
    text-decoration: none;
  }
  .cta-ghost:hover {
    border-color: var(--color-primary);
    background: rgba(108, 58, 255, 0.08);
  }
  .hero-stats {
    display: inline-flex;
    align-items: center;
    gap: 20px;
    padding: 16px 32px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
  }
  .stat-pill {
    text-align: center;
  }
  .stat-num {
    display: block;
    font-size: 1.3rem;
    font-weight: 800;
    color: var(--color-primary-dim);
  }
  .stat-label {
    font-size: 0.78rem;
    color: var(--color-muted);
    font-weight: 500;
  }
  .stat-divider {
    width: 1px;
    height: 36px;
    background: var(--color-border);
  }
  @media (max-width: 860px) {
    .hero {
      padding: 60px 16px 52px;
    }
  }
  @media (max-width: 520px) {
    .hero-stats {
      flex-direction: column;
      gap: 12px;
      padding: 16px 20px;
    }
    .stat-divider {
      width: 80px;
      height: 1px;
    }
  }
</style>
