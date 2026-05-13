<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import MarkdownViewer from '$lib/components/admin/event/MarkdownViewer.svelte';
  import AmenityBadge from '$lib/components/customer/event/AmenityBadge.svelte';
  import EventTimeline from '$lib/components/customer/event/EventTimeline.svelte';
  import SeatMapPreview from '$lib/components/customer/event/SeatMapPreview.svelte';
  import CrossQueueModal from '$lib/components/customer/queue/CrossQueueModal.svelte';
  import * as Accordion from '$lib/components/ui/accordion';
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import { ScrollArea } from '$lib/components/ui/scroll-area/index';
  import { queueStore } from '$lib/stores/queue.svelte';
  import { toast } from '$lib/stores/toast';
  import type { EventDetail, EventDetailSection, EventDetailShow } from '$lib/types/event-detail';
  import type { SeatLayoutConfig } from '$lib/types/seat-map';
  import { api } from '$lib/utils/api';
  import { formatDate, formatTime } from '$lib/utils/datetime';
  import { formatPrice } from '$lib/utils/price';
  import {
    ArrowRight,
    Building,
    Calendar,
    Clock,
    FileText,
    Info,
    Lock,
    MapPin,
    Shield,
    Ticket,
    Users,
  } from 'lucide-svelte';
  import { onMount } from 'svelte';

  let { data } = $props<{ data: { event: EventDetail } }>();

  let event = $derived(data.event);
  let user = $derived(page.data.user);

  let visibleShows = $derived(
    event.shows.filter((s: EventDetailShow) => s.status === 'published' || user?.role === 'admin'),
  );

  let earliestShow = $derived(visibleShows.length > 0 ? visibleShows[0] : null);

  let selectedShowId = $state<number | null>(null);
  // Queue status modal states
  let showQueueFullModal = $state(false);
  let showSoldOutModal = $state(false);
  let showCrossQueueModal = $state(false);
  let pendingShowId = $state<number | null>(null);
  let activeShow = $derived<EventDetailShow | null>(
    visibleShows.length === 0
      ? null
      : visibleShows.length === 1
        ? visibleShows[0]
        : (visibleShows.find((s: EventDetailShow) => s.id === selectedShowId) ?? visibleShows[0]),
  );

  let aboutTermsValue = $state<string[]>(['about']);

  $effect(() => {
    aboutTermsValue = ['about', event.terms_and_conditions ? 'terms' : ''].filter(
      (v): v is string => Boolean(v),
    );
  });

  // ── Mobile floating CTA visibility ──
  let showMobileCta = $state(false);
  let eventInfoEl = $state<HTMLElement | null>(null);
  let isFooterVisible = $state(false);

  onMount(() => {
    const observers: IntersectionObserver[] = [];

    if (eventInfoEl) {
      const ctaObserver = new IntersectionObserver(
        ([entry]) => {
          showMobileCta = !entry.isIntersecting && !isFooterVisible;
        },
        { threshold: 0 },
      );
      ctaObserver.observe(eventInfoEl);
      observers.push(ctaObserver);
    }

    const footer = document.querySelector('footer');
    if (footer) {
      const footerObserver = new IntersectionObserver(
        ([entry]) => {
          isFooterVisible = entry.isIntersecting;
          if (eventInfoEl) {
            const rect = eventInfoEl.getBoundingClientRect();
            const sidebarPast = rect.bottom < 0;
            showMobileCta = sidebarPast && !entry.isIntersecting;
          }
        },
        { threshold: 0 },
      );
      footerObserver.observe(footer);
      observers.push(footerObserver);
    }

    return () => observers.forEach((o) => o.disconnect());
  });

  function getAvailable(s: EventDetailSection): number {
    return s.type === 'general' ? s.capacity : s.available_count;
  }

  function getTotal(s: EventDetailSection): number {
    return s.type === 'general' ? s.capacity : s.seat_count - s.disabled_count;
  }

  let isSoldOut = $derived(
    visibleShows.length > 0 &&
      visibleShows.every((show: EventDetailShow) =>
        (show.sections ?? []).every((sec: EventDetailSection) => getAvailable(sec) === 0),
      )
  );

  function seatTypeLabel(type: 'assigned' | 'general'): string {
    return type === 'assigned' ? 'Ngồi' : 'Đứng';
  }

  function getAvailabilityLabel(available: number, total: number): { text: string; class: string } {
    if (available === 0) return { text: 'Hết vé', class: 'text-destructive font-bold' };
    const ratio = available / total;
    if (ratio < 0.2) return { text: 'Sắp hết', class: 'text-tertiary font-bold' };
    return { text: 'Còn vé', class: 'text-primary font-bold' };
  }

  function formatShortDate(dateStr: string): string {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
      .format(d)
      .toUpperCase();
  }

  function getTierColor(idx: number, total: number): string {
    if (total <= 1) return 'border-t-primary';
    if (idx === 0) return 'border-t-tertiary';
    if (idx === total - 1) return 'border-t-outline-variant';
    return 'border-t-primary';
  }

  async function joinQueue(showId: number) {
    const result = await api.post<{
      status: 'waiting' | 'active';
      position?: number;
      expiresAt?: number;
      token?: string;
    }>(`/events/${event.id}/queue`, {}, { silent: true });

    if (result.status === 403) {
      // Server-side cross-queue guard (Redis Lua) blocked → show modal
      pendingShowId = showId;
      showCrossQueueModal = true;
      return;
    }

    if (result.status === 429 || result.error === 'QUEUE_FULL') {
      showQueueFullModal = true;
      return;
    }

    if (result.error || !result.data) {
      if (result.details?.code === 'SOLD_OUT' || result.error === 'SOLD_OUT') {
        showSoldOutModal = true;
      } else {
        toast.error(result.error || 'Đã có lỗi xảy ra, vui lòng thử lại');
      }
      return;
    }

    queueStore.eventId = event.id;
    queueStore.eventTitle = event.title;
    queueStore.showId = showId;

    if (result.data.status === 'waiting') {
      queueStore.status = 'waiting';
      queueStore.position = result.data.position ?? 0;
      goto(resolve(`/events/${event.id}/queue`));
    } else if (result.data.status === 'active') {
      queueStore.status = 'ready';
      queueStore.expiresAt = result.data.expiresAt ?? null;
      if (result.data.token) {
        queueStore.token = result.data.token;
      }
      goto(resolve(`/events/${event.id}/queue`));
    } else {
      // api util will show error toast
    }
  }

  async function handleBuyTicket(showId: number) {
    const seatsPath = resolve(`/events/${event.id}/shows/${showId}/seats`);
    if (!user) {
      goto(resolve(`/login?redirect=${encodeURIComponent(seatsPath)}`));
      return;
    }

    // Nếu user đang trong luồng của chính event này, dùng luôn trạng thái hiện tại
    if (queueStore.eventId === event.id) {
      if (queueStore.status === 'holding') {
        goto(seatsPath);
        return;
      }
      if (queueStore.status === 'ready' || queueStore.status === 'waiting') {
        queueStore.showId = showId;
        goto(resolve(`/events/${event.id}/queue`));
        return;
      }
    }

    // Kiểm tra xung đột hàng chờ
    if (queueStore.hasConflict(event.id)) {
      pendingShowId = showId;
      showCrossQueueModal = true;
      return;
    }

    await joinQueue(showId);
  }

  async function handleLeaveAndJoin() {
    showCrossQueueModal = false;
    await queueStore.leaveForNewEvent();
    if (pendingShowId) {
      await joinQueue(pendingShowId);
      pendingShowId = null;
    }
  }

  function selectShow(id: number) {
    selectedShowId = id;
  }

  let organizerName = $derived(
    event.organizer_info?.name || event.organizer_info?.organizer_name || '',
  );
  let organizerContact = $derived(
    event.organizer_info?.contact ||
      event.organizer_info?.phone ||
      event.organizer_info?.email ||
      '',
  );
</script>

<svelte:head>
  <title>{event.title} - TixTac</title>
  <meta name="description" content={event.description?.slice(0, 160)} />
</svelte:head>

<div class="min-h-screen bg-surface">
  <main class="px-3 pt-3 pb-[7rem] md:px-6 md:pt-6 lg:px-8">
    <div class="mx-auto max-w-7xl">
      <!-- BENTO GRID -->
      <div
        class="grid grid-cols-1 gap-3 md:auto-rows-[minmax(140px,auto)] md:grid-cols-12 md:gap-5"
      >
        <!-- ── Hero Banner ── -->
        <header
          class="arch-enter group relative min-h-48 overflow-hidden rounded-xl bg-surface-container-low md:col-span-8 md:row-span-3 md:min-h-72"
        >
          {#if event.banner_image_url}
            <img
              src={event.banner_image_url}
              alt={event.title}
              class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          {:else}
            <div
              class="absolute inset-0 flex items-center justify-center"
              style="background: linear-gradient(135deg, #1e3a8a, #2563eb)"
            >
              <span class="text-8xl opacity-20">🎫</span>
            </div>
          {/if}
          <div
            class="absolute inset-0 bg-gradient-to-t from-[#1a1c20]/80 via-transparent to-transparent"
          ></div>

          {#if event.status === 'published' && !isSoldOut}
            <div class="absolute top-3 left-3 md:top-6 md:left-6">
              <span
                class="rounded-full bg-primary px-2.5 py-0.5 text-[0.55rem] font-bold tracking-widest text-primary-foreground uppercase md:px-3 md:text-[0.6rem]"
              >
                Đang mở bán
              </span>
            </div>
          {:else if isSoldOut}
            <div class="absolute top-3 left-3 md:top-6 md:left-6">
              <span
                class="rounded-full bg-destructive px-2.5 py-0.5 text-[0.55rem] font-bold tracking-widest text-white uppercase md:px-3 md:text-[0.6rem]"
              >
                Hết vé
              </span>
            </div>
          {/if}

          <div class="absolute right-3 bottom-3 left-3 md:right-6 md:bottom-6 md:left-6">
            {#if event.category_name}
              <p
                class="mb-1 text-xs font-semibold tracking-widest text-white/70 uppercase md:text-sm"
              >
                {event.category_name}
              </p>
            {/if}
            <h1
              class="font-heading text-xl leading-tight font-extrabold tracking-tight text-white md:text-4xl lg:text-5xl"
            >
              {event.title}
            </h1>
          </div>
        </header>

        <!-- ── Sidebar: Event Info ── -->
        <section
          bind:this={eventInfoEl}
          id="event-info-sidebar"
          class="arch-enter flex flex-col justify-between rounded-xl bg-surface-container p-4 md:col-span-4 md:row-span-2 md:p-6"
          style="animation-delay: 100ms"
        >
          <div>
            <span class="label-overline mb-2 block text-primary md:mb-3">Thông tin sự kiện</span>
            <div class="space-y-3">
              {#if earliestShow}
                <div class="flex items-start gap-3">
                  <Calendar class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p class="text-xs text-muted-foreground">Ngày diễn</p>
                    <p class="text-sm font-semibold text-foreground">
                      {formatDate(earliestShow.show_date)}
                    </p>
                  </div>
                </div>
              {/if}
              <div class="flex items-start gap-3">
                <MapPin class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p class="text-xs text-muted-foreground">Địa điểm</p>
                  <p class="text-sm font-semibold text-foreground">{event.venue}</p>
                </div>
              </div>
              {#if earliestShow}
                <div class="flex items-start gap-3">
                  <Clock class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p class="text-xs text-muted-foreground">Giờ mở cửa</p>
                    <p class="text-sm font-semibold text-foreground">
                      {formatTime(earliestShow.start_time)}
                    </p>
                  </div>
                </div>
              {/if}
            </div>
          </div>

          {#if earliestShow && user?.role !== 'admin'}
            <div class="mt-3 md:mt-5">
              <button
                onclick={() => handleBuyTicket(activeShow?.id ?? earliestShow.id)}
                disabled={isSoldOut}
                class="btn-primary-gradient w-full rounded-lg py-2.5 text-sm md:py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSoldOut ? 'Sự kiện đã hết vé' : 'Mua vé ngay'}
              </button>
            </div>
          {/if}
        </section>

        <!-- ── Amenities ── -->
        {#if event.amenities.length > 0 || event.min_age > 0 || event.max_tickets_per_user > 0}
          <section
            class="arch-enter rounded-xl bg-surface-container p-4 md:col-span-4 md:row-span-1 md:p-6"
            style="animation-delay: 200ms"
          >
            <span class="label-overline mb-3 block text-tertiary md:mb-4">Lưu ý</span>
            <div class="flex flex-wrap gap-2">
              {#if event.min_age > 0}
                <div
                  class="flex items-center gap-1.5 rounded-full bg-surface-container-highest px-2.5 py-1 md:px-3 md:py-1.5"
                >
                  <Shield class="h-3 w-3 md:h-3.5 md:w-3.5" />
                  <span class="text-[10px] font-semibold md:text-[11px]">
                    {event.min_age}+ tuổi
                  </span>
                </div>
              {/if}
              {#if event.max_tickets_per_user > 0}
                <div
                  class="flex items-center gap-1.5 rounded-full bg-surface-container-highest px-2.5 py-1 md:px-3 md:py-1.5"
                >
                  <Ticket class="h-3 w-3 md:h-3.5 md:w-3.5" />
                  <span class="text-[10px] font-semibold md:text-[11px]">
                    Tối đa {event.max_tickets_per_user} vé
                  </span>
                </div>
              {/if}
              {#each event.amenities as amenity (amenity)}
                <AmenityBadge {amenity} />
              {/each}
            </div>
          </section>
        {/if}

        <!-- ── About & Terms (Accordion card) ── -->
        {#if event.description || event.terms_and_conditions}
          <section
            class="arch-enter rounded-xl bg-surface-container p-4 md:col-span-full md:p-8"
            style="animation-delay: 250ms"
          >
            <Accordion.Root type="multiple" bind:value={aboutTermsValue}>
              {#if event.description}
                <Accordion.Item
                  value="about"
                  class="border-b-0 not-last:border-b not-last:border-outline-variant/15"
                >
                  <Accordion.Trigger class="py-2.5 md:py-3">
                    <div class="flex items-center gap-2.5">
                      <Info class="h-4 w-4 text-primary" />
                      <span class="label-overline text-primary">Giới thiệu sự kiện</span>
                    </div>
                  </Accordion.Trigger>
                  <Accordion.Content>
                    <div class="pt-2 pb-4">
                      <MarkdownViewer content={event.description} />
                    </div>
                  </Accordion.Content>
                </Accordion.Item>
              {/if}
              {#if event.terms_and_conditions}
                <Accordion.Item value="terms" class="border-b-0">
                  <Accordion.Trigger class="py-2.5 md:py-3">
                    <div class="flex items-center gap-2.5">
                      <FileText class="h-4 w-4 text-primary" />
                      <span class="label-overline text-primary">Điều khoản & Điều kiện</span>
                    </div>
                  </Accordion.Trigger>
                  <Accordion.Content>
                    <div class="pt-2 pb-4">
                      <MarkdownViewer content={event.terms_and_conditions} class="text-sm" />
                    </div>
                  </Accordion.Content>
                </Accordion.Item>
              {/if}
            </Accordion.Root>
          </section>
        {/if}

        <!-- ═══════════════════════════════════════════ -->
        <!-- SHOWS + TIMELINE + TICKETS (2-col layout)  -->
        <!-- ═══════════════════════════════════════════ -->
        {#if visibleShows.length > 0}
          <div
            id="shows-section"
            class="arch-enter grid scroll-mt-20 grid-cols-1 gap-3 md:col-span-12 md:gap-5 lg:grid-cols-12"
            style="animation-delay: 300ms"
          >
            <!-- ── Left Column: Shows + Ticket Info ── -->
            <div class="space-y-3 md:space-y-5 lg:col-span-8">
              <!-- Show Picker -->
              <section class="rounded-xl bg-surface-container-low p-3 md:p-8">
                <div class="mb-3 flex items-end justify-between md:mb-6">
                  <div>
                    <span
                      class="text-[0.6rem] font-bold tracking-widest text-primary uppercase md:text-[0.7rem]"
                    >
                      Bước 01
                    </span>
                    <h2 class="font-heading text-lg font-bold text-foreground md:text-3xl">
                      Suất diễn
                    </h2>
                  </div>
                  {#if activeShow}
                    <span class="text-xs font-medium text-muted-foreground md:text-sm">
                      <span class="font-semibold text-gray-600">Đã chọn:</span>
                      {formatDate(activeShow.show_date)}
                    </span>
                  {/if}
                </div>

                <ScrollArea class="w-full whitespace-nowrap" orientation="horizontal">
                  <div class="flex w-max gap-2 p-2 md:gap-4 md:p-5">
                    {#each visibleShows as show (show.id)}
                      {@const isActive = activeShow?.id === show.id}
                      {@const available = show.sections.reduce(
                        (sum: number, s: EventDetailSection) => sum + getAvailable(s),
                        0,
                      )}
                      {@const total = show.sections.reduce(
                        (sum: number, s: EventDetailSection) => sum + getTotal(s),
                        0,
                      )}
                      {@const avail = getAvailabilityLabel(available, total)}
                      <button
                        onclick={() => selectShow(show.id)}
                        class="flex min-w-[85px] shrink-0 cursor-pointer flex-col items-center gap-1 rounded-lg px-2.5 py-2 transition-all duration-300 md:min-w-[150px] md:gap-2 md:rounded-xl md:p-5 {isActive
                          ? 'scale-105 bg-primary-container text-white shadow-lg ring-2 ring-primary-container/20 md:ring-4'
                          : 'bg-surface-container text-foreground hover:bg-surface-container-high active:scale-95'}"
                      >
                        <span
                          class="text-[10px] font-medium md:text-sm {isActive
                            ? 'opacity-80'
                            : 'text-muted-foreground'}"
                        >
                          {formatShortDate(show.show_date)}
                        </span>
                        <span class="font-heading text-base font-bold md:text-2xl">
                          {formatTime(show.start_time)}
                        </span>
                        <span
                          class="text-[0.55rem] font-bold uppercase md:text-[0.65rem] {isActive
                            ? 'rounded-full bg-white/20 px-1.5 py-0.5 md:px-2'
                            : avail.class}"
                        >
                          {avail.text}
                        </span>
                      </button>
                    {/each}
                  </div>
                </ScrollArea>
              </section>

              <!-- Ticket Info (Thông tin vé) — Preview only -->
              {#if activeShow && activeShow.sections.length > 0}
                {@const show = activeShow}
                {@const hasMapConfig =
                  event.map_config &&
                  typeof event.map_config === 'object' &&
                  'width' in event.map_config &&
                  'height' in event.map_config}
                {@const hasStageLayout =
                  Array.isArray(event.stage_layout) && event.stage_layout.length > 0}
                <section class="relative rounded-xl bg-surface-container-low p-3 md:p-8">
                  <div class="mb-3 flex items-center justify-between md:mb-6">
                    <div>
                      <span
                        class="text-[0.6rem] font-bold tracking-widest text-primary uppercase md:text-[0.7rem]"
                      >
                        Bước 02
                      </span>
                      <h2 class="font-heading text-lg font-semibold text-foreground md:text-3xl">
                        Thông tin vé
                      </h2>
                    </div>
                    <div
                      class="flex items-center gap-1.5 rounded-full bg-primary-light px-2 py-0.5 font-semibold text-accent-foreground md:px-3 md:py-1"
                    >
                      <Lock class="size-3 md:size-4" />
                      <span class="text-xs md:text-sm">Xem trước</span>
                    </div>
                  </div>

                  <!-- Seat Map Area Preview -->
                  {#if hasMapConfig && hasStageLayout}
                    <div class="mb-4 md:mb-5">
                      <SeatMapPreview
                        mapConfig={event.map_config as { width: number; height: number }}
                        stageLayout={event.stage_layout as {
                          id: string;
                          type: string;
                          label: string;
                          x: number;
                          y: number;
                          w?: number;
                          h?: number;
                          width?: number;
                          height?: number;
                          rotation?: number;
                        }[]}
                        sections={show.sections.map((s) => ({
                          id: s.id,
                          name: s.name,
                          type: s.type,
                          price: s.price,
                          available_count: getAvailable(s),
                          capacity: getTotal(s),
                          layout_config: s.layout_config as SeatLayoutConfig,
                        }))}
                      />
                    </div>
                  {/if}

                  <div
                    class="pointer-events-none grid grid-cols-2 gap-2 opacity-60 md:grid-cols-2 md:gap-5 lg:grid-cols-3"
                  >
                    {#each show.sections as section, sIdx (section.id)}
                      {@const available = getAvailable(section)}
                      {@const total = getTotal(section)}
                      {@const soldOut = available === 0}
                      {@const tierColor = getTierColor(sIdx, show.sections.length)}

                      <div
                        class="rounded-lg border-t-4 {tierColor} bg-surface-container p-2.5 md:rounded-xl md:p-6"
                      >
                        <h3 class="font-heading text-xs font-bold text-foreground md:text-lg">
                          {section.name}
                        </h3>
                        <p class="mt-0.5 text-[10px] text-muted-foreground md:mt-1 md:text-xs">
                          Vé {seatTypeLabel(section.type)} •
                          {#if soldOut}
                            <span class="font-semibold text-destructive">Hết vé</span>
                          {:else}
                            Còn {available}/{total}
                          {/if}
                        </p>
                        <div class="mt-1.5 flex items-baseline gap-1 md:mt-4">
                          <span class="text-xs font-bold text-primary md:text-xl">
                            {formatPrice(section.price)}
                          </span>
                          {#if section.price > 0}
                            <span class="text-[9px] text-muted-foreground md:text-xs">/ vé</span>
                          {/if}
                        </div>
                      </div>
                    {/each}
                  </div>

                  <p class="mt-3 text-center text-xs text-muted-foreground md:mt-4">
                    Nhấn <span class="font-semibold text-primary">Tiếp tục chọn chỗ</span>
                    để đặt vé
                  </p>
                </section>
              {/if}
            </div>

            <!-- ── Right Column: CTA + Timeline ── -->
            <aside class="self-start lg:col-span-4 lg:self-stretch">
              <!-- Sticky CTA (desktop only) — hidden for admin -->
              {#if activeShow && user?.role !== 'admin'}
                <div class="sticky top-20 z-10 hidden lg:block">
                  <div class="rounded-xl bg-surface pb-1">
                    <button
                      onclick={() => handleBuyTicket(activeShow!.id)}
                      disabled={isSoldOut}
                      class="flex w-full cursor-pointer items-center justify-center gap-3 rounded-3xl bg-gradient-to-br from-cta to-cta-hover px-8 py-5 text-lg font-bold text-cta-foreground shadow-xl shadow-cta/25 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
                    >
                      {isSoldOut ? 'Hết vé' : 'Tiếp tục chọn chỗ'}
                      <ArrowRight class="h-5 w-5" />
                    </button>
                    <p
                      class="mt-3 pb-3 text-center text-xs font-medium text-muted-foreground italic"
                    >
                      Chọn suất diễn để tiếp tục mua vé
                    </p>
                  </div>
                </div>
              {/if}

              <!-- Event Timeline -->
              {#if activeShow}
                <EventTimeline show={activeShow} class="mt-3 md:mt-5" />
              {/if}
            </aside>
          </div>
        {/if}

        <!-- ═══════════════════════════════════════════ -->
        <!-- ORGANIZER                                  -->
        <!-- ═══════════════════════════════════════════ -->
        {#if organizerName}
          <section class="arch-enter rounded-xl bg-surface-container-low p-4 md:col-span-12 md:p-6">
            <div class="mb-2 flex items-center gap-2.5 md:mb-3">
              <Building class="h-4 w-4 text-primary" />
              <span class="label-overline text-primary">Ban tổ chức</span>
            </div>
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-highest md:h-11 md:w-11"
              >
                <Users class="h-4 w-4 text-primary md:h-5 md:w-5" />
              </div>
              <div>
                <p class="text-sm font-semibold text-foreground">{organizerName}</p>
                {#if organizerContact}
                  <p class="text-xs text-muted-foreground">{organizerContact}</p>
                {/if}
              </div>
            </div>
          </section>
        {/if}
      </div>
    </div>
  </main>

  <!-- ═══════════════════════════════════════════════════ -->
  <!-- MOBILE FLOATING CTA BAR                              -->
  <!-- ═══════════════════════════════════════════════════ -->
  {#if activeShow && visibleShows.length > 0 && user?.role !== 'admin'}
    <div
      class="fixed right-0 bottom-[4.25rem] left-0 z-40 transition-transform duration-300 ease-(--ease-architectural) lg:hidden {showMobileCta
        ? 'translate-y-0'
        : 'translate-y-[calc(100%+4.25rem)]'}"
    >
      <div class="mx-auto max-w-lg px-4 pb-2">
        <button
          onclick={() => handleBuyTicket(activeShow!.id)}
          disabled={isSoldOut}
          class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-cta px-6 py-3 text-sm font-bold text-cta-foreground shadow-lg shadow-cta/25 transition-all active:scale-[0.98] md:py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Ticket class="size-4" />
          {isSoldOut ? 'Sự kiện đã hết vé' : 'Tiếp tục chọn chỗ'}
        </button>
      </div>
    </div>
  {/if}
</div>

<!-- Cross-Queue Modal -->
<CrossQueueModal
  open={showCrossQueueModal}
  currentEventTitle={queueStore.eventTitle}
  newEventTitle={event.title}
  onStay={() => (showCrossQueueModal = false)}
  onLeaveAndJoin={handleLeaveAndJoin}
/>

<!-- Queue Full Modal -->
<AlertDialog.Root bind:open={showQueueFullModal}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Hàng chờ hiện đã đầy</AlertDialog.Title>
      <AlertDialog.Description>
        Rất tiếc, số lượng người xếp hàng đã đạt giới hạn tối đa để đảm bảo ổn định hệ thống. 
        Vui lòng quay lại sau ít phút khi hàng chờ được giải phóng bớt.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Action onclick={() => (showQueueFullModal = false)}>Đã hiểu</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- Sold Out Modal -->
<AlertDialog.Root bind:open={showSoldOutModal}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Sự kiện đã hết vé</AlertDialog.Title>
      <AlertDialog.Description>
        Chúng tôi rất tiếc, tất cả số vé của sự kiện này đã được bán hết hoặc đang được giữ bởi người dùng khác. 
        Bạn có thể quay lại sau để kiểm tra xem có ghế nào được giải phóng hay không.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Action onclick={() => (showSoldOutModal = false)}>Quay lại</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
