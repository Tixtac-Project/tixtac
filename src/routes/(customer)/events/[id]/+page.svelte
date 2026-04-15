<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import MarkdownViewer from '$lib/components/admin/event/MarkdownViewer.svelte';
  import AmenityBadge from '$lib/components/customer/event/AmenityBadge.svelte';
  import * as Accordion from '$lib/components/ui/accordion';
  import { ScrollArea } from '$lib/components/ui/scroll-area/index';
  import type { EventDetail, EventDetailSection, EventDetailShow } from '$lib/types/event-detail';
  import { formatDate, formatTime } from '$lib/utils/datetime';
  import { formatPrice } from '$lib/utils/price';
  import {
    Building,
    Calendar,
    Clock,
    FileText,
    Info,
    MapPin,
    Shield,
    Star,
    Ticket,
    Users,
  } from 'lucide-svelte';

  let { data } = $props<{ data: { event: EventDetail } }>();

  let event = $derived(data.event);
  let user = $derived(page.data.user);

  let visibleShows = $derived(
    event.shows.filter((s: EventDetailShow) => s.status === 'published' || user?.role === 'admin'),
  );

  let earliestShow = $derived(visibleShows.length > 0 ? visibleShows[0] : null);

  // Selected show for the show picker
  let selectedShowId = $state<number | null>(null);
  // Ensure selectedShowId is always valid
  let activeShow = $derived<EventDetailShow | null>(
    visibleShows.length === 0
      ? null
      : visibleShows.length === 1
        ? visibleShows[0]
        : (visibleShows.find((s: EventDetailShow) => s.id === selectedShowId) ?? visibleShows[0]),
  );

  // Accordion default values — about & terms expanded, itinerary collapsed
  let aboutTermsValue = $state<string[]>(['about']);

  $effect(() => {
    aboutTermsValue = ['about', event.terms_and_conditions ? 'terms' : ''].filter(
      (v): v is string => Boolean(v),
    );
  });

  function getAvailable(s: EventDetailSection): number {
    return s.type === 'general' ? s.capacity : s.available_count;
  }

  function getTotal(s: EventDetailSection): number {
    return s.type === 'general' ? s.capacity : s.seat_count - s.disabled_count;
  }

  function seatTypeLabel(type: 'assigned' | 'general'): string {
    return type === 'assigned' ? 'Ngồi' : 'Đứng';
  }

  function scrollToShows() {
    const el = document.getElementById('shows-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function handleBuyTicket(showId: number) {
    if (!user) {
      goto(resolve(`/login?redirect=/events/${event.id}`));
    } else {
      goto(resolve(`/events/${event.id}/shows/${showId}/seats`));
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
  <main class="px-4 pt-4 pb-16 sm:px-6 sm:pt-6 lg:px-8">
    <div class="mx-auto max-w-7xl">
      <!-- BENTO GRID -->
      <div
        class="grid grid-cols-1 gap-4 sm:gap-5 md:auto-rows-[minmax(140px,auto)] md:grid-cols-12"
      >
        <!-- ── Hero Banner ── -->
        <header
          class="arch-enter group relative min-h-56 overflow-hidden rounded-xl bg-surface-container-low sm:min-h-72 md:col-span-8 md:row-span-3"
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
              style="background: linear-gradient(135deg, #004c6e, #00628e)"
            >
              <span class="text-8xl opacity-20">🎫</span>
            </div>
          {/if}
          <div
            class="absolute inset-0 bg-linear-to-t from-[#181c1e]/80 via-transparent to-transparent"
          ></div>

          {#if event.status === 'published'}
            <div class="absolute top-4 left-4 sm:top-6 sm:left-6">
              <span
                class="rounded-full bg-primary-container px-3 py-0.5 text-[0.6rem] font-bold tracking-widest text-primary-foreground uppercase"
              >
                Đang mở bán
              </span>
            </div>
          {/if}

          <div class="absolute right-4 bottom-4 left-4 sm:right-6 sm:bottom-6 sm:left-6">
            {#if event.category_name}
              <p
                class="mb-1 text-xs font-semibold tracking-widest text-white/70 uppercase sm:text-sm"
              >
                {event.category_name}
              </p>
            {/if}
            <h1
              class="font-heading text-2xl leading-tight font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl"
            >
              {event.title}
            </h1>
          </div>
        </header>

        <!-- ── Sidebar: Event Info ── -->
        <section
          class="arch-enter flex flex-col justify-between rounded-xl bg-surface-container p-5 sm:p-6 md:col-span-4 md:row-span-2"
          style="animation-delay: 100ms"
        >
          <div>
            <span class="label-overline mb-3 block text-primary">Thông tin sự kiện</span>
            <div class="space-y-4">
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

          {#if earliestShow}
            <div class="mt-5">
              <button onclick={scrollToShows} class="btn-primary-gradient w-full py-3 text-sm">
                Mua vé ngay
              </button>
            </div>
          {/if}
        </section>

        <!-- ── Amenities ── -->
        {#if event.amenities.length > 0 || event.min_age > 0 || event.max_tickets_per_user > 0}
          <section
            class="arch-enter rounded-xl bg-surface-container-low p-5 sm:p-6 md:col-span-4 md:row-span-1"
            style="animation-delay: 200ms"
          >
            <span class="label-overline mb-4 block text-tertiary">Lưu ý</span>
            <div class="flex flex-wrap gap-2">
              {#if event.min_age > 0}
                <div
                  class="flex items-center gap-1.5 rounded-full bg-surface-container-highest px-3 py-1.5"
                >
                  <Shield class="h-3.5 w-3.5" />
                  <span class="text-[11px] font-semibold">{event.min_age}+ tuổi</span>
                </div>
              {/if}
              {#if event.max_tickets_per_user > 0}
                <div
                  class="flex items-center gap-1.5 rounded-full bg-surface-container-highest px-3 py-1.5"
                >
                  <Ticket class="h-3.5 w-3.5" />
                  <span class="text-[11px] font-semibold">
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
            class="arch-enter rounded-xl bg-surface-container p-5 sm:p-8 md:col-span-full"
            style="animation-delay: 250ms"
          >
            <Accordion.Root type="multiple" bind:value={aboutTermsValue}>
              {#if event.description}
                <Accordion.Item
                  value="about"
                  class="border-b-0 not-last:border-b not-last:border-outline-variant/15"
                >
                  <Accordion.Trigger class="py-3">
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
                  <Accordion.Trigger class="py-3">
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
        <!-- SHOWS                                      -->
        <!-- ═══════════════════════════════════════════ -->
        {#if visibleShows.length > 0}
          <section
            id="shows-section"
            class="arch-enter rounded-xl bg-surface-container p-5 sm:p-8 md:col-span-12"
            style="animation-delay: 300ms"
          >
            <!-- Show picker (only when multiple shows) -->
            {#if visibleShows.length > 1}
              <div class="mb-5">
                <span class="label-overline mb-3 block text-primary">Chọn suất diễn</span>
                <ScrollArea class="w-full whitespace-nowrap" orientation="horizontal">
                  <div class="flex w-max gap-2 pb-2">
                    {#each visibleShows as show, idx (show.id)}
                      {@const isActive = activeShow?.id === show.id}
                      <button
                        onclick={() => selectShow(show.id)}
                        class="shrink-0 cursor-pointer rounded-lg px-4 py-2.5 text-left transition-all {isActive
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-surface-container-low text-foreground hover:bg-surface-container-high'}"
                      >
                        <p class="text-xs font-bold">
                          {show.title || `Suất ${idx + 1}`}
                        </p>
                        <p
                          class="mt-0.5 text-[11px] {isActive
                            ? 'text-primary-foreground/80'
                            : 'text-muted-foreground'}"
                        >
                          {formatTime(show.start_time)}, {formatDate(show.show_date)}
                        </p>
                      </button>
                    {/each}
                  </div>
                </ScrollArea>
              </div>
            {/if}

            <!-- Active show content -->
            {#if activeShow}
              {@const show = activeShow}
              <div>
                <!-- Show header -->
                <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    {#if visibleShows.length <= 1}
                      <span class="label-overline mb-1 block text-primary">
                        {show.title || 'Suất diễn'}
                      </span>
                    {/if}
                    <h2 class="font-heading text-xl font-bold text-foreground sm:text-3xl">
                      {show.title || 'Lịch trình suất diễn'}
                    </h2>
                    {#if show.show_date}
                      <p class="mt-0.5 text-sm text-muted-foreground">
                        {formatTime(show.start_time)}{show.end_time
                          ? ` — ${formatTime(show.end_time)}`
                          : ''}, {formatDate(show.show_date)}
                      </p>
                    {/if}
                  </div>
                </div>

                <!-- Itinerary (collapsed accordion) -->
                {#if Array.isArray(show.itinerary) && show.itinerary.length > 0}
                  <div class="mt-4">
                    <Accordion.Root type="multiple">
                      <Accordion.Item value="itinerary-{show.id}" class="border-b-0">
                        <Accordion.Trigger class="py-3">
                          <div class="flex items-center gap-2.5">
                            <Calendar class="h-4 w-4 text-primary" />
                            <span class="label-overline text-primary">Lịch trình sự kiện</span>
                          </div>
                        </Accordion.Trigger>
                        <Accordion.Content>
                          <div class="pt-2 pb-2">
                            <!-- Mobile: vertical timeline -->
                            <div class="space-y-3 sm:hidden">
                              {#each show.itinerary as item, i (i)}
                                {@const highlighted = i === Math.floor(show.itinerary.length / 2)}
                                <div class="flex gap-3">
                                  <div class="flex flex-col items-center">
                                    <div
                                      class="flex h-7 w-7 items-center justify-center rounded-full {highlighted
                                        ? 'bg-primary-container text-primary-foreground'
                                        : 'bg-surface-container-highest text-muted-foreground'}"
                                    >
                                      <Clock class="h-3.5 w-3.5" />
                                    </div>
                                    {#if i < show.itinerary.length - 1}
                                      <div
                                        class="mt-1 h-full w-px bg-surface-container-highest"
                                      ></div>
                                    {/if}
                                  </div>
                                  <div class="pb-4">
                                    <p class="text-[11px] font-bold tracking-widest text-primary">
                                      {item.time || item.time_start || ''}{item.time_end
                                        ? ` — ${item.time_end}`
                                        : ''}
                                    </p>
                                    <h4 class="text-sm font-bold text-foreground uppercase">
                                      {item.activity || item.title || ''}
                                    </h4>
                                    {#if item.description}
                                      <p
                                        class="mt-0.5 text-[11px] tracking-tight text-muted-foreground uppercase"
                                      >
                                        {item.description}
                                      </p>
                                    {/if}
                                  </div>
                                </div>
                              {/each}
                            </div>

                            <!-- Desktop: horizontal cards -->
                            <div class="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4">
                              {#each show.itinerary as item, i (i)}
                                {@const highlighted = i === Math.floor(show.itinerary.length / 2)}
                                {#if highlighted}
                                  <div
                                    class="group relative overflow-hidden rounded-lg bg-primary-container p-5 shadow-lg"
                                  >
                                    <div
                                      class="absolute -right-3 -bottom-3 opacity-10 transition-transform group-hover:scale-125"
                                    >
                                      <Star class="h-16 w-16" />
                                    </div>
                                    <p
                                      class="mb-1 text-[11px] font-bold tracking-widest text-primary-foreground"
                                    >
                                      {item.time || item.time_start || ''}{item.time_end
                                        ? ` — ${item.time_end}`
                                        : ''}
                                    </p>
                                    <h3 class="mb-3 text-base font-bold text-primary-foreground">
                                      {item.activity || item.title || ''}
                                    </h3>
                                    {#if item.description}
                                      <p
                                        class="text-[11px] tracking-tight text-primary-foreground/80 uppercase"
                                      >
                                        {item.description}
                                      </p>
                                    {/if}
                                  </div>
                                {:else}
                                  <div
                                    class="rounded-lg border-l-4 border-l-primary bg-surface-container-lowest p-5 shadow-sm"
                                  >
                                    <p
                                      class="mb-1 text-[11px] font-bold tracking-widest text-primary"
                                    >
                                      {item.time || item.time_start || ''}{item.time_end
                                        ? ` — ${item.time_end}`
                                        : ''}
                                    </p>
                                    <h3 class="mb-3 text-base font-bold text-foreground">
                                      {item.activity || item.title || ''}
                                    </h3>
                                    {#if item.description}
                                      <p
                                        class="text-[11px] tracking-tight text-muted-foreground uppercase"
                                      >
                                        {item.description}
                                      </p>
                                    {/if}
                                  </div>
                                {/if}
                              {/each}
                            </div>
                          </div>
                        </Accordion.Content>
                      </Accordion.Item>
                    </Accordion.Root>
                  </div>
                {/if}

                <!-- Ticket Tiers -->
                {#if show.sections.length > 0}
                  <div class="mt-6 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3">
                    {#each show.sections as section, sIdx (section.id)}
                      {@const available = getAvailable(section)}
                      {@const total = getTotal(section)}
                      {@const soldOut = available === 0}
                      {@const isLast =
                        sIdx === show.sections.length - 1 && show.sections.length > 2}
                      {@const isPopular = sIdx === 1 && show.sections.length > 1}

                      {#if isLast}
                        <div
                          class="flex flex-col justify-between rounded-xl bg-[#2d3133] p-5 shadow-2xl sm:p-6"
                        >
                          <div>
                            <h3 class="mb-1.5 text-lg font-bold text-[#eef1f3] sm:text-xl">
                              {section.name}
                            </h3>
                            <p class="mb-4 text-xs text-[#eef1f3]/60">
                              Vé {seatTypeLabel(section.type)} •
                              {#if soldOut}Hết vé{:else}Còn {available}/{total}{/if}
                            </p>
                            <div class="mb-5 flex items-baseline gap-1">
                              <span class="text-3xl font-extrabold text-[#eef1f3]">
                                {formatPrice(section.price)}
                              </span>
                              {#if section.price > 0}<span class="text-xs text-[#eef1f3]/60">
                                  / vé
                                </span>{/if}
                            </div>
                          </div>
                          <button
                            onclick={() => handleBuyTicket(show.id)}
                            disabled={soldOut}
                            class="w-full cursor-pointer rounded-full bg-surface-container-lowest py-3 text-sm font-bold text-foreground transition-all hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {soldOut ? 'Hết vé' : 'Chọn vé'}
                          </button>
                        </div>
                      {:else if isPopular}
                        <div
                          class="relative flex flex-col justify-between rounded-xl border-2 border-primary-container bg-surface-container-lowest p-5 sm:p-6"
                        >
                          <div
                            class="absolute -top-3 right-6 rounded-full bg-primary-container px-3 py-0.5 text-[0.55rem] font-bold tracking-widest text-primary-foreground uppercase"
                          >
                            Phổ biến nhất
                          </div>
                          <div>
                            <h3 class="mb-1.5 text-lg font-bold text-foreground sm:text-xl">
                              {section.name}
                            </h3>
                            <p class="mb-4 text-xs text-muted-foreground">
                              Vé {seatTypeLabel(section.type)} •
                              {#if soldOut}<span class="font-semibold text-destructive">
                                  Hết vé
                                </span>{:else}Còn {available}/{total}{/if}
                            </p>
                            <div class="mb-5 flex items-baseline gap-1">
                              <span class="text-3xl font-extrabold text-foreground">
                                {formatPrice(section.price)}
                              </span>
                              {#if section.price > 0}<span class="text-xs text-muted-foreground">
                                  / vé
                                </span>{/if}
                            </div>
                          </div>
                          <button
                            onclick={() => handleBuyTicket(show.id)}
                            disabled={soldOut}
                            class="w-full cursor-pointer rounded-full bg-primary-container py-3 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {soldOut ? 'Hết vé' : 'Chọn vé'}
                          </button>
                        </div>
                      {:else}
                        <div
                          class="flex flex-col justify-between rounded-xl bg-surface-container-low p-5 sm:p-6"
                        >
                          <div>
                            <h3 class="mb-1.5 text-lg font-bold text-foreground sm:text-xl">
                              {section.name}
                            </h3>
                            <p class="mb-4 text-xs text-muted-foreground">
                              Vé {seatTypeLabel(section.type)} •
                              {#if soldOut}<span class="font-semibold text-destructive">
                                  Hết vé
                                </span>{:else}Còn {available}/{total}{/if}
                            </p>
                            <div class="mb-5 flex items-baseline gap-1">
                              <span class="text-3xl font-extrabold text-foreground">
                                {formatPrice(section.price)}
                              </span>
                              {#if section.price > 0}<span class="text-xs text-muted-foreground">
                                  / vé
                                </span>{/if}
                            </div>
                          </div>
                          <button
                            onclick={() => handleBuyTicket(show.id)}
                            disabled={soldOut}
                            class="w-full cursor-pointer rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {soldOut ? 'Hết vé' : 'Chọn vé'}
                          </button>
                        </div>
                      {/if}
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}
          </section>
        {/if}

        <!-- ═══════════════════════════════════════════ -->
        <!-- ORGANIZER                                  -->
        <!-- ═══════════════════════════════════════════ -->
        {#if organizerName}
          <section class="arch-enter rounded-xl bg-surface-container-low p-5 sm:p-6 md:col-span-12">
            <div class="mb-3 flex items-center gap-2.5">
              <Building class="h-4 w-4 text-primary" />
              <span class="label-overline text-primary">Ban tổ chức</span>
            </div>
            <div class="flex items-center gap-3">
              <div
                class="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-container-highest"
              >
                <Users class="h-5 w-5 text-primary" />
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
</div>
