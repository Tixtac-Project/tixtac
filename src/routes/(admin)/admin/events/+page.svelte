<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import * as Table from '$lib/components/ui/table';
  import { toast } from '$lib/stores/toast';
  import { api } from '$lib/utils/api';
  import { Loader, Plus, Send } from 'lucide-svelte';

  let { data } = $props();

  let publishingId = $state<number | null>(null);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  async function handlePublish(eventId: number, e: MouseEvent) {
    e.stopPropagation();
    if (publishingId) return;
    publishingId = eventId;

    const { error } = await api.patch(`/events/${eventId}/publish`, {});

    if (!error) {
      toast.success('Xuất bản sự kiện thành công!');
      await invalidateAll();
    }

    publishingId = null;
  }

  function navigateToEvent(eventId: number) {
    goto(resolve(`/admin/events/${eventId}`));
  }
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

  {#if data.events.length === 0}
    <div class="rounded-lg border bg-card p-8 text-center md:p-12">
      <p class="text-muted-foreground">Chưa có sự kiện nào. Hãy tạo sự kiện đầu tiên!</p>
    </div>
  {:else}
    <div class="rounded-lg border bg-card shadow-sm">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Tên sự kiện</Table.Head>
            <Table.Head>Địa điểm</Table.Head>
            <Table.Head>Ngày tổ chức</Table.Head>
            <Table.Head>Trạng thái</Table.Head>
            <Table.Head class="text-center">Tổng ghế</Table.Head>
            <Table.Head class="text-center">Còn trống</Table.Head>
            <Table.Head class="text-end">Hành động</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each data.events as event (event.id)}
            <Table.Row
              class="cursor-pointer transition-colors hover:bg-muted/50"
              onclick={() => navigateToEvent(event.id)}
            >
              <Table.Cell class="font-medium">{event.title}</Table.Cell>
              <Table.Cell>{event.venue}</Table.Cell>
              <Table.Cell>{formatDate(event.event_date)}</Table.Cell>
              <Table.Cell>
                {#if event.status === 'published'}
                  <Badge variant="default" class="bg-green-600 hover:bg-green-700">
                    Đã xuất bản
                  </Badge>
                {:else}
                  <Badge variant="secondary">Bản nháp</Badge>
                {/if}
              </Table.Cell>
              <Table.Cell class="text-center">{event.total_seats}</Table.Cell>
              <Table.Cell class="text-center">{event.available_seats}</Table.Cell>
              <Table.Cell class="text-end">
                {#if event.status === 'draft'}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={publishingId === event.id}
                    onclick={(e) => handlePublish(event.id, e)}
                  >
                    {#if publishingId === event.id}
                      <Loader class="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    {:else}
                      <Send class="mr-1.5 h-3.5 w-3.5" />
                    {/if}
                    Xuất bản
                  </Button>
                {:else}
                  <span class="text-xs text-muted-foreground">—</span>
                {/if}
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>

    <!-- Pagination -->
    {#if data.pagination.total_pages > 1}
      <div class="flex items-center justify-between">
        <p class="text-sm text-muted-foreground">
          Trang {data.pagination.page} / {data.pagination.total_pages} — Tổng {data.pagination
            .total} sự kiện
        </p>
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={data.pagination.page <= 1}
            onclick={() => goto(resolve(`?page=${data.pagination.page - 1}`))}
          >
            Trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={data.pagination.page >= data.pagination.total_pages}
            onclick={() => goto(resolve(`?page=${data.pagination.page + 1}`))}
          >
            Sau
          </Button>
        </div>
      </div>
    {/if}
  {/if}
</div>
