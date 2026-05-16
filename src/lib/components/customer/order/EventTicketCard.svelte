<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';
  import { formatDate, formatTime } from '$lib/utils/datetime';
  import {
    buildQrPayload,
    formatCheckinSecret,
    generateTicketQrSvg,
  } from '$lib/utils/qr-generator';
  import DOMPurify from 'isomorphic-dompurify';
  import { CalendarDays, MapPin, Maximize2, Ticket, X } from 'lucide-svelte';

  export interface PaidTicketEntry {
    order_item_id: number;
    event_id: number;
    show_id: number;
    show_title: string | null;
    start_time: string;
    section_name: string;
    seat_type: 'assigned' | 'general';
    seat_label: string | null;
    ticket_code: string;
    checkin_secret: string;
    paid_at: string | null;
  }

  export interface PaidEventEntry {
    event_id: number;
    title: string;
    venue: string;
    banner_image_url: string | null;
    tickets: PaidTicketEntry[];
  }

  interface Props {
    eventData: PaidEventEntry;
  }
  let { eventData }: Props = $props();

  const groupedShows = $derived.by(() => {
    const groups: Record<
      string,
      {
        title: string | null;
        start_time: string;
        tickets: PaidTicketEntry[];
      }
    > = {};
    for (const ticket of eventData.tickets) {
      const key = `${ticket.start_time}_${ticket.show_title || 'default'}`;
      if (!groups[key]) {
        groups[key] = {
          title: ticket.show_title,
          start_time: ticket.start_time,
          tickets: [],
        };
      }
      groups[key].tickets.push(ticket);
    }
    return Object.values(groups).sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );
  });

  /** Currently selected ticket for the QR enlargement modal. */
  let selectedTicket = $state<PaidTicketEntry | null>(null);
  let dialogOpen = $state(false);

  function openQrModal(ticket: PaidTicketEntry) {
    selectedTicket = ticket;
    dialogOpen = true;
  }

  function closeQrModal() {
    dialogOpen = false;
  }

  /**
   * Build the QR SVG string for a ticket, or return null if the ticket
   * is missing required fields (`event_id`, `show_id`, `checkin_secret`).
   */
  function getQrSvg(ticket: PaidTicketEntry): string | null {
    if (!ticket.event_id || !ticket.show_id || !ticket.checkin_secret) {
      return null;
    }
    try {
      const payload = buildQrPayload(ticket.event_id, ticket.show_id, ticket.checkin_secret);
      return generateTicketQrSvg(payload);
    } catch {
      return null;
    }
  }

  /**
   * Sanitize an SVG string via DOMPurify and make it responsive so it
   * fills its container box on any screen size. Safe for {@html} rendering.
   */
  function sanitizeAndMakeResponsive(raw: string): string {
    const sanitized = DOMPurify.sanitize(raw, {
      USE_PROFILES: { svg: true, svgFilters: true },
    });
    return sanitized.replace(/<svg([^>]*)>/, (_match, attrs: string) => {
      let cleaned = attrs
        .replace(/\bwidth\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\bheight\s*=\s*["'][^"']*["']/gi, '');
      if (!/\bviewBox\b/i.test(cleaned)) {
        cleaned += ` viewBox="0 0 200 200"`;
      }
      return `<svg${cleaned} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`;
    });
  }
</script>

<div
  class="mb-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm md:mb-8 md:rounded-2xl"
>
  <!-- Header Sự kiện -->
  <div
    class="flex items-center gap-3 border-b border-border bg-surface-container-low p-3 md:gap-4 md:p-5"
  >
    <div
      class="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-border shadow-sm md:h-20 md:w-32 md:rounded-xl"
    >
      <img
        src={eventData.banner_image_url || 'https://picsum.photos/400/200'}
        alt={eventData.title}
        class="h-full w-full object-cover"
      />
    </div>
    <div class="min-w-0 flex-1">
      <h2 class="truncate text-base font-bold text-foreground md:text-xl">{eventData.title}</h2>
      <div
        class="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground md:text-sm"
      >
        <MapPin class="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" />
        <span class="truncate">{eventData.venue}</span>
      </div>
    </div>
  </div>

  <!-- Danh sách Suất diễn -->
  <div class="p-3 md:p-5">
    {#each groupedShows as show, i (i)}
      <div class="mb-8 last:mb-0 md:mb-10">
        <!-- Tiêu đề Suất diễn -->
        <div
          class="mb-4 flex flex-col gap-2 border-b border-border pb-3 md:mb-5 md:flex-row md:items-end md:justify-between md:pb-4"
        >
          <div>
            <p
              class="mb-0.5 text-[9px] font-bold tracking-wider text-muted-foreground uppercase md:text-[10px]"
            >
              SUẤT DIỄN
            </p>
            <h3 class="text-base font-bold text-foreground md:text-xl">
              {show.title || 'Suất diễn'}
            </h3>
          </div>
          <div
            class="flex w-fit items-center gap-1.5 rounded-full border border-primary bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary md:px-3 md:text-xs"
          >
            <CalendarDays class="h-3 w-3 shrink-0 md:h-3.5 md:w-3.5" />
            {formatTime(show.start_time)} | {formatDate(show.start_time)}
          </div>
        </div>

        <!-- Lưới vé -->
        <div class="grid grid-cols-1 gap-3 md:gap-5 xl:grid-cols-2">
          {#each show.tickets as ticket, j (j)}
            <div
              class="overflow-hidden rounded-xl border border-border bg-surface-container-lowest shadow-sm transition hover:border-primary/50 hover:shadow-md"
              onclick={() => openQrModal(ticket)}
              onkeydown={(e) => e.key === 'Enter' && openQrModal(ticket)}
              role="button"
              tabindex="0"
            >
              <!-- Mobile ticket (horizontal stripe) -->
              <div class="flex flex-col md:hidden">
                <div class="h-1 w-full bg-primary"></div>

                <div class="px-3 pt-3 pb-2">
                  <div class="mb-2 flex items-center justify-between md:mb-3">
                    <p
                      class="text-[9px] font-bold tracking-wider text-muted-foreground uppercase md:text-[10px]"
                    >
                      THÔNG TIN VÉ
                    </p>
                    <span
                      class="rounded-full border border-primary px-2 py-0.5 text-[9px] font-bold text-primary md:px-2.5 md:text-[10px]"
                    >
                      {ticket.seat_type === 'general' ? 'Vé đứng' : 'Vé ngồi'}
                    </span>
                  </div>

                  <p class="text-xs font-bold text-foreground md:text-sm">
                    Khu vực {ticket.section_name}
                    {#if ticket.seat_type !== 'general'}
                      · Ghế {ticket.seat_label}
                    {/if}
                  </p>
                  <p
                    class="mt-1 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground md:text-xs"
                  >
                    <Ticket class="h-3 w-3 shrink-0 md:h-3.5 md:w-3.5" />
                    Mã:
                    <span class="text-foreground">{ticket.ticket_code}</span>
                  </p>

                  <div
                    class="mt-2 flex items-center justify-between border-t border-dashed border-border pt-2 md:mt-3 md:pt-2.5"
                  >
                    <p class="text-[9px] text-muted-foreground italic md:text-[10px]">
                      Vui lòng đến đúng giờ
                    </p>
                    <span
                      class="rounded bg-primary/10 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-primary uppercase md:px-2 md:text-[9px]"
                    >
                      E-TICKET
                    </span>
                  </div>
                </div>

                <!-- QR strip -->
                <div
                  class="relative flex items-center justify-center gap-4 border-t border-dashed border-border bg-surface-container-low py-3 md:gap-6 md:py-4"
                >
                  <div
                    class="absolute -top-3 -left-3 h-6 w-6 rounded-full border border-border bg-background"
                  ></div>
                  <div
                    class="absolute -top-3 -right-3 h-6 w-6 rounded-full border border-border bg-background"
                  ></div>

                  <div
                    class="flex h-14 w-14 items-center justify-center rounded-md bg-white p-1 shadow-sm md:h-16 md:w-16"
                  >
                    {#if getQrSvg(ticket)}
                      <div class="h-full w-full overflow-hidden rounded-sm">
                        {@html sanitizeAndMakeResponsive(getQrSvg(ticket)!)}
                      </div>
                    {:else}
                      <div
                        class="flex h-full w-full items-center justify-center text-[8px] text-muted-foreground"
                      >
                        QR
                      </div>
                    {/if}
                  </div>
                  <div class="flex flex-col items-start">
                    <p class="text-[10px] font-bold text-primary md:text-xs">QUÉT ĐỂ VÀO CỔNG</p>
                    <p class="text-[8px] text-muted-foreground md:text-[9px]">Bấm để phóng to</p>
                  </div>
                </div>
              </div>

              <!-- Desktop ticket (vertical stripe + sawtooth) -->
              <div class="relative hidden h-[160px] md:flex">
                <div class="absolute top-0 bottom-0 left-0 w-1.5 bg-primary"></div>
                <div class="ticket-sawtooth absolute top-0 bottom-0 left-1.5 z-10 w-3"></div>

                <div class="flex min-w-0 flex-1 flex-col justify-between py-4 pr-4 pl-8">
                  <div class="flex items-center justify-between">
                    <p class="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                      THÔNG TIN VÉ
                    </p>
                    <span
                      class="rounded-full border border-primary px-3 py-0.5 text-xs font-bold text-primary"
                    >
                      {ticket.seat_type === 'general' ? 'Vé đứng' : 'Vé ngồi'}
                    </span>
                  </div>

                  <div class="my-2">
                    <p class="truncate text-base font-bold text-foreground">
                      Khu vực {ticket.section_name}
                      {#if ticket.seat_type !== 'general'}
                        · Ghế {ticket.seat_label}
                      {/if}
                    </p>
                    <p
                      class="mt-1 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"
                    >
                      <Ticket class="h-4 w-4 shrink-0" />
                      Mã:
                      <span class="text-foreground">{ticket.ticket_code}</span>
                    </p>
                  </div>

                  <div
                    class="mt-auto flex items-center justify-between border-t border-dashed border-border pt-3"
                  >
                    <p class="text-xs text-muted-foreground italic">
                      Vui lòng mang vé đến đúng giờ
                    </p>
                    <span
                      class="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-primary uppercase"
                    >
                      E-TICKET
                    </span>
                  </div>
                </div>

                <!-- QR section -->
                <div
                  class="relative flex w-32 shrink-0 flex-col items-center justify-center gap-2 border-l border-dashed border-border bg-surface-container-low p-3"
                >
                  <div
                    class="absolute -top-3 -left-3 h-6 w-6 rounded-full border border-border bg-background"
                  ></div>
                  <div
                    class="absolute -bottom-3 -left-3 h-6 w-6 rounded-full border border-border bg-background"
                  ></div>

                  <div
                    class="flex h-[70px] w-[70px] items-center justify-center rounded-md bg-white p-1 shadow-sm"
                  >
                    {#if getQrSvg(ticket)}
                      <div class="h-full w-full overflow-hidden rounded-sm">
                        {@html sanitizeAndMakeResponsive(getQrSvg(ticket)!)}
                      </div>
                    {:else}
                      <div
                        class="flex h-full w-full items-center justify-center text-xs text-muted-foreground"
                      >
                        QR
                      </div>
                    {/if}
                  </div>
                  <div class="flex flex-col items-center">
                    <p class="text-center text-[9px] leading-tight font-bold text-primary">
                      QUÉT ĐỂ VÀO
                      <br />
                      CỔNG
                    </p>
                    <div class="mt-0.5 flex items-center gap-0.5 text-[8px] text-muted-foreground">
                      <Maximize2 class="h-2.5 w-2.5" />
                      <span>Bấm để phóng to</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<!-- QR Enlargement Dialog -->
<Dialog bind:open={dialogOpen}>
  <DialogContent showCloseButton={false} class="max-w-sm sm:max-w-sm">
    <DialogHeader>
      <DialogTitle class="text-center text-sm font-bold">Quét mã QR để vào cổng</DialogTitle>
      <DialogDescription class="text-center text-xs text-muted-foreground">
        Đưa mã này cho nhân viên kiểm tra khi vào cổng
      </DialogDescription>
    </DialogHeader>

    <button
      class="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground transition hover:bg-background"
      onclick={closeQrModal}
    >
      <X class="h-4 w-4" />
      <span class="sr-only">Đóng</span>
    </button>

    {#if selectedTicket}
      <div class="flex flex-col items-center gap-4 pt-2">
        <!-- Large QR -->
        <div
          class="flex w-full max-w-[280px] items-center justify-center rounded-lg bg-white p-3 shadow-sm"
        >
          {#if getQrSvg(selectedTicket)}
            <div class="w-full overflow-hidden rounded-sm">
              {@html sanitizeAndMakeResponsive(getQrSvg(selectedTicket)!)}
            </div>
          {:else}
            <div class="flex h-48 w-full items-center justify-center text-sm text-muted-foreground">
              Không có mã QR
            </div>
          {/if}
        </div>

        <!-- Offline manual code -->
        {#if selectedTicket.checkin_secret}
          <div
            class="w-full rounded-lg border border-border bg-surface-container-lowest p-3 text-center"
          >
            <p class="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Mã dự phòng offline
            </p>
            <p
              class="mt-1 font-mono text-lg font-bold tracking-[0.15em] text-foreground md:text-xl"
            >
              {formatCheckinSecret(selectedTicket.checkin_secret)}
            </p>
          </div>
        {/if}

        <!-- Ticket code reference -->
        <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Ticket class="h-3.5 w-3.5" />
          <span>Mã vé:</span>
          <span class="font-semibold text-foreground">{selectedTicket.ticket_code}</span>
        </div>

        <!-- Close button -->
        <button
          class="w-full rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
          onclick={closeQrModal}
        >
          Đóng
        </button>
      </div>
    {/if}
  </DialogContent>
</Dialog>

<style>
  .ticket-sawtooth {
    background-image: radial-gradient(
      circle at 0px 6px,
      transparent 4px,
      var(--surface-container-lowest) 5px
    );
    background-size: 10px 12px;
    background-repeat: repeat-y;
  }
</style>
