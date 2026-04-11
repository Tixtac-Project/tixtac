<script lang="ts">
  import { Button } from '$lib/components/ui/button';

  let { clearSearchUrl } = $props<{ clearSearchUrl: string }>();
</script>

<div class="empty-state">
  <div class="empty-icon">🎭</div>
  <h3 class="empty-title">Không tìm thấy sự kiện nào!</h3>
  <p class="empty-sub">Hãy thử tìm kiếm với từ khóa khác hoặc khám phá tất cả sự kiện.</p>
  <Button href={clearSearchUrl} size="lg" class="rounded-full" id="events-clear-search">
    Xóa tìm kiếm
  </Button>
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
</style>
