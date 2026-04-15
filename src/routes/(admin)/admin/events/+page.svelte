<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { resolve } from '$app/paths';
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import { Badge } from '$lib/components/ui/badge';
  import { BentoCard, BentoStat } from '$lib/components/ui/bento';
  import { Button } from '$lib/components/ui/button';
  import { toast } from '$lib/stores/toast';
  import { api } from '$lib/utils/api';
  import { formatDate } from '$lib/utils/datetime.js';
  import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Globe,
    Loader,
    MapPin,
    Pencil,
    Plus,
    Ticket,
    Users,
  } from 'lucide-svelte';

  let { data } = $props();

  let publishingId = $state<number | null>(null);

  async function handlePublish(eventId: number) {
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

  // Derived stats (page-scoped — only reflects the current page of results)
  const totalEvents = $derived(data.pagination.total);
  const publishedCount = $derived(data.events.filter((e) => e.status === 'published').length);
  const draftCount = $derived(data.events.filter((e) => e.status === 'draft').length);
  const pageSeats = $derived(data.events.reduce((sum, e) => sum + e.total_seats, 0));
  const pageAvailable = $derived(data.events.reduce((sum, e) => sum + e.available_seats, 0));

  // Split: hero (first) + rest
  const heroEvent = $derived(data.events.length > 0 ? data.events[0] : null);
  const restEvents = $derived(data.events.length > 1 ? data.events.slice(1) : []);

  function seatBarColor(percent: number): string {
    if (percent > 50) return 'bg-success';
    if (percent > 20) return 'bg-warning';
    return 'bg-danger';
  }

  function seatTextColor(percent: number): string {
    if (percent > 50) return 'text-success';
    if (percent > 20) return 'text-warning';
    return 'text-danger';
  }
</script>

<div class="space-y-6">
  <!-- Page header -->
  <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div>
      <h1 class="font-heading text-2xl font-bold tracking-tight md:text-3xl">Sự kiện</h1>
      <p class="mt-1 text-sm text-muted-foreground">Quản lý danh sách sự kiện của bạn</p>
    </div>
    <Button href="/admin/events/create" class="w-full gap-2 md:w-auto">
      <Plus class="h-4 w-4" />
      Tạo sự kiện mới
    </Button>
  </div>

  {#if data.events.length === 0}
    <!-- Empty state -->
    <BentoCard
      class="flex flex-col items-center justify-center border-dashed p-12 text-center md:p-20"
    >
      <div class="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-info-muted">
        <Ticket class="h-8 w-8 text-info" />
      </div>
      <h3 class="text-lg font-semibold text-foreground">Chưa có sự kiện nào</h3>
      <p class="mt-1.5 max-w-sm text-sm text-muted-foreground">
        Bắt đầu bằng cách tạo sự kiện đầu tiên. Cấu hình khu vực ghế, giá vé và xuất bản cho khách
        hàng.
      </p>
      <Button href="/admin/events/create" class="mt-6 gap-2">
        <Plus class="h-4 w-4" />
        Tạo sự kiện đầu tiên
      </Button>
    </BentoCard>
  {:else}
    <!-- ══════ Bento Stats Row ══════ -->
    <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
      <BentoStat label="Tổng" value={totalEvents} subtitle="sự kiện" hue={265} />
      <BentoStat label="Xuất bản" value={publishedCount} subtitle="trang này" hue={155} />
      <BentoStat label="Nháp" value={draftCount} subtitle="trang này" hue={85} />
      <BentoStat
        label="Ghế trống"
        value="{pageAvailable}/{pageSeats}"
        subtitle="trang này"
        hue={280}
      />
    </div>

    <!-- ══════ Bento Event Grid ══════ -->
    <div class="grid gap-5 md:grid-cols-2">
      <!-- Hero event tile — full width -->
      {#if heroEvent}
        {@const hp =
          heroEvent.total_seats > 0
            ? Math.round((heroEvent.available_seats / heroEvent.total_seats) * 100)
            : 0}
        <div
          role="button"
          tabindex="0"
          class="bento-card-interactive group col-span-full text-left"
          onclick={() => navigateToEvent(heroEvent.id)}
          onkeydown={(e) => {
            if (e.currentTarget !== e.target) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigateToEvent(heroEvent.id);
            }
          }}
        >
          <div class="flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
            <!-- Left: info -->
            <div class="flex-1 space-y-3">
              <div class="flex flex-wrap items-center gap-2">
                {#if heroEvent.status === 'published'}
                  <Badge
                    class="rounded-lg border-none bg-success-muted text-success-muted-foreground shadow-none"
                  >
                    Đã xuất bản
                  </Badge>
                {:else}
                  <Badge
                    class="rounded-lg border-none bg-neutral-muted text-neutral-muted-foreground shadow-none"
                  >
                    Bản nháp
                  </Badge>
                {/if}
              </div>

              <h3
                class="font-heading text-xl font-bold tracking-tight text-foreground group-hover:text-primary md:text-2xl"
                style="transition: color 0.2s var(--ease-bento);"
              >
                {heroEvent.title}
              </h3>

              <div class="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                <span class="flex items-center gap-1.5">
                  <MapPin class="h-3.5 w-3.5 opacity-60" />
                  {heroEvent.venue}
                </span>
                <span class="flex items-center gap-1.5">
                  <Calendar class="h-3.5 w-3.5 opacity-60" />
                  {#if heroEvent.earliest_show_date}
                    {formatDate(heroEvent.earliest_show_date)}
                  {:else}
                    Chưa có suất diễn
                  {/if}
                </span>
              </div>
            </div>

            <!-- Right: stats + action -->
            <div class="flex shrink-0 flex-col items-end gap-3 md:w-56">
              <div class="w-full rounded-2xl border border-border/50 bg-muted/30 p-4">
                <div class="mb-2.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span class="flex items-center gap-1.5">
                    <Users class="h-3.5 w-3.5 opacity-60" />
                    Ghế
                  </span>
                  <span class="font-semibold {seatTextColor(hp)}">
                    {hp}% trống
                  </span>
                </div>
                <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    class="h-full rounded-full {seatBarColor(hp)}"
                    style="width: {Math.max(hp, 2)}%; transition: width 0.5s var(--ease-bento);"
                  ></div>
                </div>
                <p class="mt-2 text-center text-sm font-semibold text-foreground">
                  {heroEvent.available_seats.toLocaleString('vi-VN')}
                  <span class="font-normal text-muted-foreground">
                    / {heroEvent.total_seats.toLocaleString('vi-VN')}
                  </span>
                </p>
              </div>

              {#if heroEvent.status === 'draft'}
                {@const heroCanPublish = heroEvent.total_seats > 0}
                <div class="flex w-full gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    class="flex-1 gap-2"
                    href={resolve(`/admin/events/create?event=${heroEvent.id}`)}
                    onclick={(e) => e.stopPropagation()}
                  >
                    <Pencil class="h-3.5 w-3.5" />
                    Sửa
                  </Button>
                  {#if heroCanPublish}
                    <AlertDialog.Root>
                      <AlertDialog.Trigger>
                        {#snippet child({ props })}
                          <Button
                            {...props}
                            size="sm"
                            class="flex-1 gap-2"
                            disabled={publishingId === heroEvent.id}
                            onclick={(e) => e.stopPropagation()}
                          >
                            {#if publishingId === heroEvent.id}
                              <Loader class="h-3.5 w-3.5 animate-spin" />
                            {:else}
                              <Globe class="h-3.5 w-3.5" />
                            {/if}
                            Xuất bản
                          </Button>
                        {/snippet}
                      </AlertDialog.Trigger>
                      <AlertDialog.Content onclick={(e) => e.stopPropagation()}>
                        <AlertDialog.Header>
                          <AlertDialog.Title>Xuất bản "{heroEvent.title}"?</AlertDialog.Title>
                          <AlertDialog.Description>
                            Sau khi xuất bản, sự kiện sẽ hiển thị công khai và khách hàng có thể đặt
                            vé.
                          </AlertDialog.Description>
                        </AlertDialog.Header>
                        <AlertDialog.Footer>
                          <AlertDialog.Cancel>Huỷ bỏ</AlertDialog.Cancel>
                          <AlertDialog.Action onclick={() => handlePublish(heroEvent.id)}>
                            Xuất bản
                          </AlertDialog.Action>
                        </AlertDialog.Footer>
                      </AlertDialog.Content>
                    </AlertDialog.Root>
                  {:else}
                    <Button
                      size="sm"
                      class="flex-1 gap-2"
                      disabled
                      onclick={(e) => e.stopPropagation()}
                    >
                      <Globe class="h-3.5 w-3.5" />
                      Xuất bản
                    </Button>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/if}

      <!-- Rest of events — smaller tiles -->
      {#each restEvents as event (event.id)}
        {@const ap =
          event.total_seats > 0 ? Math.round((event.available_seats / event.total_seats) * 100) : 0}
        <div
          role="button"
          tabindex="0"
          class="bento-card-interactive group flex flex-col text-left"
          onclick={() => navigateToEvent(event.id)}
          onkeydown={(e) => {
            if (e.currentTarget !== e.target) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigateToEvent(event.id);
            }
          }}
        >
          <div class="flex flex-1 flex-col">
            <!-- Status -->
            <div class="mb-3">
              {#if event.status === 'published'}
                <Badge
                  class="rounded-lg border-none bg-success-muted text-[11px] text-success-muted-foreground shadow-none"
                >
                  Đã xuất bản
                </Badge>
              {:else}
                <Badge
                  class="rounded-lg border-none bg-neutral-muted text-[11px] text-neutral-muted-foreground shadow-none"
                >
                  Bản nháp
                </Badge>
              {/if}
            </div>

            <!-- Title -->
            <h3
              class="mb-3 line-clamp-2 text-base font-semibold tracking-tight text-foreground group-hover:text-primary"
              style="transition: color 0.2s var(--ease-bento);"
            >
              {event.title}
            </h3>

            <!-- Meta -->
            <div class="mb-5 space-y-1.5 text-[13px] text-muted-foreground">
              <div class="flex items-center gap-2">
                <MapPin class="h-3.5 w-3.5 shrink-0 opacity-50" />
                <span class="truncate">{event.venue}</span>
              </div>
              <div class="flex items-center gap-2">
                <Calendar class="h-3.5 w-3.5 shrink-0 opacity-50" />
                <span>
                  {#if event.earliest_show_date}
                    {formatDate(event.earliest_show_date)}
                  {:else}
                    Chưa có suất diễn
                  {/if}
                </span>
              </div>
            </div>

            <!-- Seat progress -->
            <div class="mt-auto">
              <div class="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  class="h-full rounded-full {seatBarColor(ap)}"
                  style="width: {Math.max(ap, 2)}%; transition: width 0.5s var(--ease-bento);"
                ></div>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-foreground">
                  <strong class="font-semibold text-foreground">{event.available_seats}</strong>
                  / {event.total_seats} ghế trống
                </span>
                <span class="font-semibold {seatTextColor(ap)}">{ap}%</span>
              </div>
            </div>

            <!-- Publish action -->
            {#if event.status === 'draft'}
              <div class="mt-4 flex gap-2 border-t border-border/50 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  class="flex-1 gap-2 text-xs"
                  href={resolve(`/admin/events/create?event=${event.id}`)}
                  onclick={(e) => e.stopPropagation()}
                >
                  <Pencil class="h-3 w-3" />
                  Sửa
                </Button>
                <AlertDialog.Root>
                  <AlertDialog.Trigger>
                    {#snippet child({ props })}
                      <Button
                        {...props}
                        variant="outline"
                        size="sm"
                        class="flex-1 gap-2 text-xs"
                        disabled={publishingId === event.id}
                        onclick={(e) => e.stopPropagation()}
                      >
                        {#if publishingId === event.id}
                          <Loader class="h-3 w-3 animate-spin" />
                        {:else}
                          <Globe class="h-3 w-3" />
                        {/if}
                        Xuất bản
                      </Button>
                    {/snippet}
                  </AlertDialog.Trigger>
                  <AlertDialog.Content onclick={(e) => e.stopPropagation()}>
                    <AlertDialog.Header>
                      <AlertDialog.Title>Xuất bản "{event.title}"?</AlertDialog.Title>
                      <AlertDialog.Description>
                        Sau khi xuất bản, sự kiện sẽ hiển thị công khai và khách hàng có thể đặt vé.
                      </AlertDialog.Description>
                    </AlertDialog.Header>
                    <AlertDialog.Footer>
                      <AlertDialog.Cancel>Huỷ bỏ</AlertDialog.Cancel>
                      <AlertDialog.Action onclick={() => handlePublish(event.id)}>
                        Xuất bản
                      </AlertDialog.Action>
                    </AlertDialog.Footer>
                  </AlertDialog.Content>
                </AlertDialog.Root>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <!-- Pagination -->
    {#if data.pagination.total_pages > 1}
      <div class="bento-card flex items-center justify-between px-5 py-3">
        <p class="text-sm text-muted-foreground">
          Trang <strong class="text-foreground">{data.pagination.page}</strong>
          /
          {data.pagination.total_pages}
        </p>
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            class=""
            disabled={data.pagination.page <= 1}
            onclick={() => {
              const params = new URLSearchParams(window.location.search);
              params.set('page', String(data.pagination.page - 1));
              goto(resolve(`?${params.toString()}`));
            }}
          >
            <ChevronLeft class="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            class=""
            disabled={data.pagination.page >= data.pagination.total_pages}
            onclick={() => {
              const params = new URLSearchParams(window.location.search);
              params.set('page', String(data.pagination.page + 1));
              goto(resolve(`?${params.toString()}`));
            }}
          >
            <ChevronRight class="h-4 w-4" />
          </Button>
        </div>
      </div>
    {/if}
  {/if}
</div>
