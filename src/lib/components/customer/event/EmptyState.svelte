<script lang="ts">
  let { clearSearchUrl } = $props<{ clearSearchUrl: string }>();
</script>

<div class="empty-state">
  <div class="empty-icon">🎭</div>
  <h3 class="empty-title">Không tìm thấy sự kiện nào!</h3>
  <p class="empty-sub">Hãy thử tìm kiếm với từ khóa khác hoặc khám phá tất cả sự kiện.</p>
  <a href={clearSearchUrl} class="cta-primary" id="events-clear-search">Xóa tìm kiếm</a>
</div>

<style>
  .empty-state {
    text-align: center;
    padding: 80px 24px;
    border: 2px dashed var(--color-border);
    border-radius: 20px;
    background: var(--color-surface-low);
  }
  .empty-icon {
    font-size: 3.5rem;
    margin-bottom: 16px;
  }
  .empty-title {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 10px;
  }
  .empty-sub {
    color: var(--color-muted);
    margin-bottom: 28px;
    font-size: 0.95rem;
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
    text-decoration: none;
    transition:
      transform 0.2s,
      background 0.2s;
  }
  .cta-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 32px rgba(108, 58, 255, 0.55);
    opacity: 0.92;
  }
</style>
