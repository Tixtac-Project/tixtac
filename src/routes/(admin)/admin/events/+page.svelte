<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Plus } from 'lucide-svelte';
</script>

<div class="space-y-4 md:space-y-6">
  <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div>
      <h1 class="text-xl font-bold tracking-tight md:text-2xl">Sự kiện</h1>
      <p class="text-sm text-muted-foreground">Quản lý danh sách sự kiện của bạn</p>
    </div>
    <Button href="/admin/events/new" class="w-full md:w-auto">
      <Plus class="mr-2 h-4 w-4" />
      Tạo sự kiện mới
    </Button>
  </div>

  <div class="rounded-lg border bg-card p-8 text-center md:p-12">
    <p class="text-muted-foreground">Chưa có sự kiện nào. Hãy tạo sự kiện đầu tiên!</p>
  </div>
</div>
