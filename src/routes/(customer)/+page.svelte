<script lang="ts">

    // Dữ liệu từ +page.server.ts
    let { data } = $props<{ data: { events: any[], pagination: { currentPage: number, totalPages: number, searchQuery: string } } }>();

    let events = $derived(data.events);
    let pagination = $derived(data.pagination);

    // Categories filter (client-side, mở rộng sau)
    const categories = [
        { label: 'Tất cả', icon: '✨', value: '' },
        { label: 'Concert', icon: '🎵', value: 'concert' },
        { label: 'Festival', icon: '🎉', value: 'festival' },
        { label: 'Thể Thao', icon: '⚽', value: 'sports' },
        { label: 'Kịch Nghệ', icon: '🎭', value: 'theater' },
        { label: 'Art & Expo', icon: '🖼️', value: 'art' },
        { label: 'Comedy', icon: '😂', value: 'comedy' },
    ];

    let activeCategory = $state('');

    // Tính số trang để hiển thị pagination
    let pageNumbers = $derived(Array.from({ length: pagination.totalPages }, (_, i) => i + 1));

    // Format date tiếng Việt
    function formatDate(dateStr: string | Date): string {
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    }

    function formatPrice(price: number | string): string {
        const val = typeof price === 'string' ? Number(price) : price;
        if (!val || val === 0) return 'Đang cập nhật';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(val);
    }

    // Gradient màu nhẹ cho placeholder không có banner (Light mode friendly)
    const placeholderGradients = [
        'linear-gradient(135deg, #EEF2FF, #C7D2FE)',
        'linear-gradient(135deg, #F0F9FF, #BAE6FD)',
        'linear-gradient(135deg, #FFF1F2, #FECDD3)',
        'linear-gradient(135deg, #F0FDF4, #BBF7D0)',
        'linear-gradient(135deg, #FFF7ED, #FFEDD5)',
    ];

    function getGradient(index: number): string {
        return placeholderGradients[index % placeholderGradients.length];
    }
</script>

<svelte:head>
    <title>TixTac - Nền tảng đặt vé sự kiện số 1</title>
    <meta name="description" content="Khám phá và đặt vé concert, festival, thể thao hàng đầu Việt Nam. Nhanh chóng, bảo mật, tiện lợi trên TixTac." />
</svelte:head>

<!-- ─── HERO SECTION ─── -->
<section class="hero">
    <div class="hero-content">
        <div class="hero-badge">✨ Hơn 500,000 vé đã được đặt</div>
        <h1 class="hero-title">Trải nghiệm<br /><span class="hero-title-accent">sự kiện đỉnh cao</span></h1>
        <p class="hero-sub">Đặt vé concert, festival, thể thao và hơn thế nữa<br />chỉ trong vài giây — bảo mật, nhanh chóng, tiện lợi.</p>
        <div class="hero-ctas">
            <a href="#events" class="cta-primary" id="hero-cta-explore">
                Khám phá sự kiện
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
            </a>
            <a href="/events" class="cta-ghost" id="hero-cta-today">Xem sự kiện hôm nay →</a>
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

<!-- ─── EVENTS SECTION ─── -->
<section class="events-section" id="events">

    <!-- Category Filter Bar -->
    <div class="category-bar">
        {#each categories as cat}
            <button
                id="cat-{cat.value || 'all'}"
                class="cat-chip {activeCategory === cat.value ? 'active' : ''}"
                onclick={() => (activeCategory = cat.value)}
            >
                <span>{cat.icon}</span>
                {cat.label}
            </button>
        {/each}
    </div>

    <!-- Section header -->
    <div class="section-header">
        <div>
            <h2 class="section-title">Sự kiện nổi bật</h2>
            {#if pagination.searchQuery}
                <p class="search-result-info">
                    Kết quả cho: <span class="search-keyword">"{pagination.searchQuery}"</span>
                </p>
            {/if}
        </div>
        <a href="/events" class="view-all-link" id="events-view-all">
            Xem tất cả
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
        </a>
    </div>

    <!-- Empty State -->
    {#if events.length === 0}
        <div class="empty-state">
            <div class="empty-icon">🎭</div>
            <h3 class="empty-title">Không tìm thấy sự kiện nào!</h3>
            <p class="empty-sub">Hãy thử tìm kiếm với từ khóa khác hoặc khám phá tất cả sự kiện.</p>
            <a href="/" class="cta-primary" id="events-clear-search">Xóa tìm kiếm</a>
        </div>

    <!-- Events Grid -->
    {:else}
        <div class="events-grid">
            {#each events as event, i}
                <a
                    href="/events/{event.id}"
                    class="event-card"
                    id="event-card-{event.id}"
                >
                    <!-- Banner Image -->
                    <div class="card-banner">
                        {#if event.bannerImageUrl}
                            <img
                                src={event.bannerImageUrl}
                                alt={event.title}
                                class="card-banner-img"
                                loading="lazy"
                            />
                        {:else}
                            <div class="card-banner-placeholder" style="background: {getGradient(i)}">
                                <span class="placeholder-icon">🎫</span>
                            </div>
                        {/if}

                        <!-- Overlay gradient -->
                        <div class="card-banner-overlay"></div>

                        <!-- HOT badge (every other card for demo) -->
                        {#if i % 3 === 0}
                            <span class="badge-hot">🔥 HOT</span>
                        {:else if i % 3 === 1}
                            <span class="badge-live">🔴 LIVE</span>
                        {/if}

                        <!-- Date badge -->
                        <div class="card-date-badge">
                            <span class="date-day">{new Date(event.eventDate).getDate()}</span>
                            <span class="date-month">{new Date(event.eventDate).toLocaleString('vi-VN', { month: 'short' })}</span>
                        </div>
                    </div>

                    <!-- Card body -->
                    <div class="card-body">
                        <h3 class="card-title">{event.title}</h3>

                        <div class="card-meta">
                            <!-- Date -->
                            <div class="meta-row">
                                <svg class="meta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>{formatDate(event.eventDate)}</span>
                            </div>
                            <!-- Venue -->
                            <div class="meta-row">
                                <svg class="meta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span class="venue-text">{event.venue}</span>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div class="card-footer">
                            <span class="card-price">Giá từ: {formatPrice(event.min_price)}</span>
                            <span class="card-arrow">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </span>
                        </div>
                    </div>
                </a>
            {/each}
        </div>

        <!-- ─── PAGINATION ─── -->
        {#if pagination.totalPages > 1}
            <nav class="pagination" aria-label="Phân trang">
                <!-- Prev -->
                <a
                    href="?page={pagination.currentPage - 1}{pagination.searchQuery ? `&q=${pagination.searchQuery}` : ''}"
                    class="page-btn {pagination.currentPage === 1 ? 'disabled' : ''}"
                    id="pagination-prev"
                    aria-disabled={pagination.currentPage === 1}
                >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Trước
                </a>

                <!-- Page numbers -->
                {#each pageNumbers as num}
                    <a
                        href="?page={num}{pagination.searchQuery ? `&q=${pagination.searchQuery}` : ''}"
                        class="page-btn {num === pagination.currentPage ? 'active' : ''}"
                        id="pagination-page-{num}"
                    >
                        {num}
                    </a>
                {/each}

                <!-- Next -->
                <a
                    href="?page={pagination.currentPage + 1}{pagination.searchQuery ? `&q=${pagination.searchQuery}` : ''}"
                    class="page-btn {pagination.currentPage === pagination.totalPages ? 'disabled' : ''}"
                    id="pagination-next"
                    aria-disabled={pagination.currentPage === pagination.totalPages}
                >
                    Tiếp
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                </a>
            </nav>
        {/if}
    {/if}
</section>

<style>
    /* ─── Hero ─── */
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
    .hero-content { position: relative; max-width: 720px; margin: 0 auto; }
    .hero-badge {
        display: inline-block;
        padding: 6px 16px;
        border-radius: 999px;
        background: #F1F5F9;
        border: 1px solid #E2E8F0;
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
        transition: transform 0.2s, background 0.2s;
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
        transition: border-color 0.2s, background 0.2s;
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
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 16px;
    }
    .stat-pill { text-align: center; }
    .stat-num {
        display: block;
        font-size: 1.3rem;
        font-weight: 800;
        color: var(--color-primary-dim);
    }
    .stat-label { font-size: 0.78rem; color: var(--color-muted); font-weight: 500; }
    .stat-divider { width: 1px; height: 36px; background: var(--color-border); }

    /* ─── Events Section ─── */
    .events-section { padding-top: 16px; }

    /* Category Bar */
    .category-bar {
        display: flex;
        gap: 10px;
        overflow-x: auto;
        padding-bottom: 4px;
        margin-bottom: 32px;
        scrollbar-width: none;
    }
    .category-bar::-webkit-scrollbar { display: none; }
    .cat-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 18px;
        border-radius: 999px;
        border: 1px solid var(--color-border);
        background: var(--color-card);
        color: var(--color-muted-strong);
        font-size: 0.875rem;
        font-weight: 500;
        font-family: var(--font-main);
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s;
        flex-shrink: 0;
    }
    .cat-chip:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .cat-chip.active {
        background: var(--color-primary);
        border-color: var(--color-primary);
        color: white;
    }

    /* Section header */
    .section-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        margin-bottom: 24px;
    }
    .section-title {
        font-size: 1.6rem;
        font-weight: 700;
        color: var(--color-text);
        letter-spacing: -0.02em;
    }
    .search-result-info { font-size: 0.9rem; color: var(--color-muted); margin-top: 4px; }
    .search-keyword { color: var(--color-primary); font-weight: 600; }
    .view-all-link {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--color-primary-dim);
        transition: gap 0.2s;
    }
    .view-all-link:hover { gap: 8px; }

    /* Empty state */
    .empty-state {
        text-align: center;
        padding: 80px 24px;
        border: 2px dashed var(--color-border);
        border-radius: 20px;
        background: var(--color-surface-low);
    }
    .empty-icon { font-size: 3.5rem; margin-bottom: 16px; }
    .empty-title { font-size: 1.4rem; font-weight: 700; color: var(--color-text); margin-bottom: 10px; }
    .empty-sub { color: var(--color-muted); margin-bottom: 28px; font-size: 0.95rem; }

    /* Events Grid */
    .events-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
    }

    /* Event Card */
    .event-card {
        display: flex;
        flex-direction: column;
        background: var(--color-card);
        border-radius: var(--radius-card);
        border: 1px solid var(--color-border);
        overflow: hidden;
        text-decoration: none;
        transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
        cursor: pointer;
    }
    .event-card:hover {
        transform: translateY(-4px);
        border-color: var(--color-primary);
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.05);
    }

    /* Card Banner */
    .card-banner {
        position: relative;
        height: 185px;
        overflow: hidden;
        background: var(--color-surface-low);
    }
    .card-banner-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.5s;
    }
    .event-card:hover .card-banner-img { transform: scale(1.07); }
    .card-banner-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .placeholder-icon { font-size: 2.5rem; opacity: 0.6; }
    .card-banner-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 60%);
    }

    /* Badges on banner */
    .badge-hot, .badge-live {
        position: absolute;
        top: 12px;
        left: 12px;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
        z-index: 2;
    }
    .badge-hot { background: var(--color-accent); color: white; }
    .badge-live { background: var(--color-secondary); color: #001f24; }

    .card-date-badge {
        position: absolute;
        top: 12px;
        right: 12px;
        background: rgba(255,255,255,0.9);
        backdrop-filter: blur(4px);
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        padding: 4px 10px;
        text-align: center;
        z-index: 2;
    }
    .date-day { display: block; font-size: 1.05rem; font-weight: 800; line-height: 1.2; color: #0F172A; }
    .date-month { display: block; font-size: 0.68rem; color: #64748B; text-transform: uppercase; font-weight: 700; }

    /* Card body */
    .card-body {
        padding: 14px 16px 16px;
        display: flex;
        flex-direction: column;
        flex: 1;
    }
    .card-title {
        font-size: 0.975rem;
        font-weight: 700;
        color: var(--color-text);
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        margin-bottom: 10px;
        transition: color 0.2s;
    }
    .event-card:hover .card-title { color: var(--color-primary); }

    .card-meta { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
    .meta-row {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.8rem;
        color: var(--color-muted);
    }
    .meta-icon { width: 13px; height: 13px; flex-shrink: 0; color: var(--color-muted); }
    .venue-text {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* Card footer */
    .card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 12px;
        border-top: 1px solid var(--color-border);
        margin-top: auto;
    }
    .card-price {
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--color-primary);
    }
    .card-arrow {
        color: var(--color-primary);
        display: flex;
        align-items: center;
        transition: transform 0.2s;
    }
    .event-card:hover .card-arrow { transform: translateX(4px); }

    /* ─── Pagination ─── */
    .pagination {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        margin-top: 48px;
        padding-bottom: 16px;
    }
    .page-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 8px 14px;
        border-radius: 8px;
        border: 1px solid var(--color-border);
        background: var(--color-card);
        color: var(--color-muted-strong);
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s;
        text-decoration: none;
    }
    .page-btn:hover:not(.disabled) {
        border-color: var(--color-primary);
        color: var(--color-primary);
    }
    .page-btn.active {
        background: var(--color-primary);
        border-color: var(--color-primary);
        color: white;
    }
    .page-btn.disabled {
        opacity: 0.35;
        cursor: not-allowed;
        pointer-events: none;
    }

    /* ─── Responsive ─── */
    @media (max-width: 1200px) {
        .events-grid { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 860px) {
        .events-grid { grid-template-columns: repeat(2, 1fr); }
        .hero { padding: 60px 16px 52px; }
    }
    @media (max-width: 520px) {
        .events-grid { grid-template-columns: 1fr; }
        .hero-stats { flex-direction: column; gap: 12px; padding: 16px 20px; }
        .stat-divider { width: 80px; height: 1px; }
        .section-header { flex-direction: column; align-items: flex-start; gap: 8px; }
    }
</style>
