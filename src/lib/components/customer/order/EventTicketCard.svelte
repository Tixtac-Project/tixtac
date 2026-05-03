<script lang="ts">
  import { CalendarDays, MapPin, Ticket } from 'lucide-svelte';
  import { formatDate, formatTime } from '$lib/utils/datetime';

  export interface PaidTicketEntry {
    order_item_id: number;
    show_title: string | null;
    start_time: string;
    section_name: string;
    seat_type: 'assigned' | 'general';
    seat_label: string | null;
    ticket_code: string;
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
</script>

<div class="mb-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
  <!-- Header Sự kiện -->
  <div class="flex items-center gap-4 border-b border-border bg-surface-container-low p-4 sm:p-5">
    <div
      class="h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-border shadow-sm sm:h-20 sm:w-32"
    >
      <img
        src={eventData.banner_image_url || 'https://picsum.photos/400/200'}
        alt={eventData.title}
        class="h-full w-full object-cover"
      />
    </div>
    <div class="min-w-0 flex-1">
      <h2 class="truncate text-lg font-bold text-foreground sm:text-xl">{eventData.title}</h2>
      <div
        class="mt-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground sm:text-sm"
      >
        <MapPin class="h-4 w-4 shrink-0" />
        <span class="truncate">{eventData.venue}</span>
      </div>
    </div>
  </div>

  <!-- Danh sách Suất diễn -->
  <div class="p-4 sm:p-5">
    {#each groupedShows as show, i (i)}
      <div class="mb-10 last:mb-0">
        <!-- Tiêu đề Suất diễn — stack on mobile -->
        <div
          class="mb-5 flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p class="mb-0.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              SUẤT DIỄN
            </p>
            <h3 class="text-lg font-bold text-foreground sm:text-xl">
              {show.title || 'Suất diễn'}
            </h3>
          </div>
          <div
            class="flex w-fit items-center gap-1.5 rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-bold text-primary"
          >
            <CalendarDays class="h-3.5 w-3.5 shrink-0" />
            {formatTime(show.start_time)} | {formatDate(show.start_time)}
          </div>
        </div>

        <!-- Lưới vé: 1 cột mobile, 2 cột xl -->
        <div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {#each show.tickets as ticket, j (j)}
            <div
              class="overflow-hidden rounded-xl border border-border bg-surface-container-lowest shadow-sm transition hover:border-primary/50 hover:shadow-md"
            >
              <div class="flex flex-col sm:hidden">
                <!-- Stripe ngang -->
                <div class="h-1.5 w-full bg-primary"></div>

                <!-- Thông tin vé -->
                <div class="px-4 pt-4 pb-3">
                  <div class="mb-3 flex items-center justify-between">
                    <p class="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                      THÔNG TIN VÉ
                    </p>
                    <span
                      class="rounded-full border border-primary px-2.5 py-0.5 text-[10px] font-bold text-primary"
                    >
                      {ticket.seat_type === 'general' ? 'Vé đứng' : 'Vé ngồi'}
                    </span>
                  </div>

                  <p class="text-sm font-bold text-foreground">
                    Khu vực {ticket.section_name}
                    {#if ticket.seat_type !== 'general'}
                      · Ghế {ticket.seat_label}
                    {/if}
                  </p>
                  <p
                    class="mt-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground"
                  >
                    <Ticket class="h-3.5 w-3.5 shrink-0" />
                    Mã:
                    <span class="text-foreground">{ticket.ticket_code}</span>
                  </p>

                  <div
                    class="mt-3 flex items-center justify-between border-t border-dashed border-border pt-2.5"
                  >
                    <p class="text-[10px] text-muted-foreground italic">Vui lòng đến đúng giờ</p>
                    <span
                      class="rounded bg-primary/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-primary uppercase"
                    >
                      E-TICKET
                    </span>
                  </div>
                </div>

                <!-- Separator QR -->
                <div
                  class="relative flex items-center justify-center gap-6 border-t border-dashed border-border bg-surface-container-low py-4"
                >
                  <!-- Vòng tròn khoét 2 bên -->
                  <div
                    class="absolute -top-3 -left-3 h-6 w-6 rounded-full border border-border bg-background"
                  ></div>
                  <div
                    class="absolute -top-3 -right-3 h-6 w-6 rounded-full border border-border bg-background"
                  ></div>

                  <div
                    class="flex h-16 w-16 items-center justify-center rounded-md border border-border bg-surface-container-lowest p-1 shadow-sm"
                  >
                    <div
                      class="flex h-full w-full items-center justify-center border-2 border-dashed border-border text-xs text-muted-foreground"
                    >
                      QR
                    </div>
                  </div>
                  <p class="text-xs font-bold text-primary">QUÉT ĐỂ VÀO CỔNG</p>
                </div>
              </div>

              <div class="relative hidden h-[160px] sm:flex">
                <!-- Stripe dọc trái -->
                <div class="absolute top-0 bottom-0 left-0 w-1.5 bg-primary"></div>
                <!-- Răng cưa -->
                <div class="ticket-sawtooth absolute top-0 bottom-0 left-1.5 z-10 w-3"></div>

                <!-- Thông tin vé -->
                <div class="flex flex-1 flex-col justify-between py-4 pr-4 pl-8">
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
                  class="relative flex w-32 shrink-0 flex-col items-center justify-center border-l border-dashed border-border bg-surface-container-low p-3"
                >
                  <div
                    class="absolute -top-3 -left-3 h-6 w-6 rounded-full border border-border bg-background"
                  ></div>
                  <div
                    class="absolute -bottom-3 -left-3 h-6 w-6 rounded-full border border-border bg-background"
                  ></div>

                  <div
                    class="mb-2 flex h-[70px] w-[70px] items-center justify-center rounded-md border border-border bg-surface-container-lowest p-1 shadow-sm"
                  >
                    <div
                      class="flex h-full w-full items-center justify-center border-2 border-dashed border-border text-muted-foreground"
                    >
                      QR
                    </div>
                  </div>
                  <p class="text-center text-[9px] leading-tight font-bold text-primary">
                    QUÉT ĐỂ VÀO
                    <br />
                    CỔNG
                  </p>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

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
