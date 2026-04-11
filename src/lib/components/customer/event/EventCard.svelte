<script lang="ts">
  import { resolve } from '$app/paths';

  interface Event {
    id: number;
    title: string;
    eventDate: string | Date;
    venue: string;
    bannerImageUrl?: string;
    min_price: number | string;
  }

  let { event, i, formatDate, formatPrice, getGradient } = $props<{
    event: Event;
    i: number;
    formatDate: (date: string | Date) => string;
    formatPrice: (price: number | string) => string;
    getGradient: (index: number) => string;
  }>();
</script>

<a href={resolve(`/events/${event.id}`)} class="event-card" id="event-card-{event.id}">
  <!-- Banner Image -->
  <div class="card-banner">
    {#if event.bannerImageUrl}
      <img src={event.bannerImageUrl} alt={event.title} class="card-banner-img" loading="lazy" />
    {:else}
      <div class="card-banner-placeholder" style="background: {getGradient(i)}">
        <span class="placeholder-icon">🎫</span>
      </div>
    {/if}

    <!-- Overlay gradient -->
    <div class="card-banner-overlay"></div>

    <!-- HOT badge -->
    {#if i % 3 === 0}
      <span class="badge-hot">🔥 HOT</span>
    {:else if i % 3 === 1}
      <span class="badge-live">🔴 LIVE</span>
    {/if}

    <!-- Date badge -->
    <div class="card-date-badge">
      <span class="date-day">{new Date(event.eventDate).getDate()}</span>
      <span class="date-month">
        {new Date(event.eventDate).toLocaleString('vi-VN', { month: 'short' })}
      </span>
    </div>
  </div>

  <!-- Card body -->
  <div class="card-body">
    <h3 class="card-title">{event.title}</h3>

    <div class="card-meta">
      <!-- Date -->
      <div class="meta-row">
        <svg class="meta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span>{formatDate(event.eventDate)}</span>
      </div>
      <!-- Venue -->
      <div class="meta-row">
        <svg class="meta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span class="venue-text">{event.venue}</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="card-footer">
      <span class="card-price">Giá từ: {formatPrice(event.min_price)}</span>
      <span class="card-arrow">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M14 5l7 7m0 0l-7 7m7-7H3"
          />
        </svg>
      </span>
    </div>
  </div>
</a>

<style>
  .event-card {
    display: flex;
    flex-direction: column;
    background: var(--color-card);
    border-radius: var(--radius-card);
    border: 1px solid var(--color-border);
    overflow: hidden;
    text-decoration: none;
    transition:
      transform 0.25s,
      box-shadow 0.25s,
      border-color 0.25s;
    cursor: pointer;
  }
  .event-card:hover {
    transform: translateY(-4px);
    border-color: var(--color-primary);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.05);
  }
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
  .event-card:hover .card-banner-img {
    transform: scale(1.07);
  }
  .card-banner-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .placeholder-icon {
    font-size: 2.5rem;
    opacity: 0.6;
  }
  .card-banner-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.3) 0%, transparent 60%);
  }
  .badge-hot,
  .badge-live {
    position: absolute;
    top: 12px;
    left: 12px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    z-index: 2;
  }
  .badge-hot {
    background: var(--color-accent);
    color: white;
  }
  .badge-live {
    background: var(--color-secondary);
    color: #001f24;
  }
  .card-date-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(4px);
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 4px 10px;
    text-align: center;
    z-index: 2;
  }
  .date-day {
    display: block;
    font-size: 1.05rem;
    font-weight: 800;
    line-height: 1.2;
    color: #0f172a;
  }
  .date-month {
    display: block;
    font-size: 0.68rem;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 700;
  }
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
  .event-card:hover .card-title {
    color: var(--color-primary);
  }
  .card-meta {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 12px;
  }
  .meta-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    color: var(--color-muted);
  }
  .meta-icon {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
    color: var(--color-muted);
  }
  .venue-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
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
  .event-card:hover .card-arrow {
    transform: translateX(4px);
  }
</style>
