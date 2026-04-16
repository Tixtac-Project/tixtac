<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import StepActions from '$lib/components/admin/event/StepActions.svelte';
  import TimePicker from '$lib/components/admin/event/TimePicker.svelte';
  import { Button } from '$lib/components/ui/button';
  import Calendar from '$lib/components/ui/calendar/calendar.svelte';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Popover from '$lib/components/ui/popover';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import { eventStore } from '$lib/stores/event-create-store.svelte';
  import { toast } from '$lib/stores/toast';
  import { api } from '$lib/utils/api';
  import {
    buildISODateTime,
    get24Hour,
    getDateTimePreview,
    getTimezoneName,
    to12Hour,
  } from '$lib/utils/datetime';
  import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date';
  import {
    ArrowLeft,
    CalendarDays,
    ChevronDown,
    Copy,
    ListOrdered,
    Plus,
    Trash2,
    X,
  } from 'lucide-svelte';

  // ── Layout data (event loaded from DB when ?event=ID) ──
  type LayoutEvent = {
    id: number;
    title: string;
    shows: {
      id: number;
      title: string | null;
      show_date: string;
      start_time: string;
      end_time: string | null;
      itinerary: { time: string; activity: string; description: string }[];
    }[];
  };

  // Read initial server data (non-reactive — only needed at mount)
  const serverEvent = (page.data as { event: LayoutEvent | null }).event;

  // ── Sync server data to store ──
  if (serverEvent && browser) {
    eventStore.setEventIdentity(serverEvent.id, serverEvent.title);
  }

  // Reactive references from store
  const eventId = $derived(eventStore.eventId);
  const eventTitle = $derived(eventStore.eventTitle);

  // Redirect if no event ID
  $effect(() => {
    if (browser && !eventId) {
      toast.error('Vui lòng hoàn thành Bước 1 trước.');
      goto(resolve('/admin/events/create'));
    }
  });

  // ── Show form data type ──
  type ShowForm = {
    title: string;
    date?: { year: number; month: number; day: number };
    startHour: string;
    startMinute: string;
    startPeriod: 'AM' | 'PM';
    endHour: string;
    endMinute: string;
    endPeriod: 'AM' | 'PM';
    hasEndTime: boolean;
    itinerary: { time: string; activity: string; description: string }[];
    datePickerOpen: boolean;
  };

  function createDefaultShow(): ShowForm {
    return {
      title: '',
      date: undefined,
      startHour: '7',
      startMinute: '0',
      startPeriod: 'PM',
      endHour: '10',
      endMinute: '0',
      endPeriod: 'PM',
      hasEndTime: false,
      itinerary: [],
      datePickerOpen: false,
    };
  }

  // ── Convert API show data to ShowForm ──
  function apiShowToForm(apiShow: LayoutEvent['shows'][number]): ShowForm {
    const dateParts = apiShow.show_date.split('-');
    const date =
      dateParts.length === 3
        ? { year: Number(dateParts[0]), month: Number(dateParts[1]), day: Number(dateParts[2]) }
        : undefined;

    const startDate = new Date(apiShow.start_time);
    const startH = to12Hour(startDate.getHours());

    const hasEnd = !!apiShow.end_time;
    let endHour = '10';
    let endMinute = '0';
    let endPeriod: 'AM' | 'PM' = 'PM';
    if (hasEnd && apiShow.end_time) {
      const endDate = new Date(apiShow.end_time);
      const endH = to12Hour(endDate.getHours());
      endHour = endH.hour;
      endMinute = String(endDate.getMinutes());
      endPeriod = endH.period;
    }

    return {
      title: apiShow.title ?? '',
      date,
      startHour: startH.hour,
      startMinute: String(startDate.getMinutes()),
      startPeriod: startH.period,
      endHour,
      endMinute,
      endPeriod,
      hasEndTime: hasEnd,
      itinerary: Array.isArray(apiShow.itinerary) ? apiShow.itinerary : [],
      datePickerOpen: false,
    };
  }

  // ── Draft persistence (centralized) ──
  type Step2Draft = {
    title: string;
    date?: { year: number; month: number; day: number };
    startHour: string;
    startMinute: string;
    startPeriod: 'AM' | 'PM';
    endHour: string;
    endMinute: string;
    endPeriod: 'AM' | 'PM';
    hasEndTime: boolean;
    itinerary: { time: string; activity: string; description: string }[];
  }[];

  // ── Initialize shows: DB first > draft > default ──
  function initializeShows(): ShowForm[] {
    // 1. Server-loaded shows from DB (via layout)
    if (serverEvent?.shows && serverEvent.shows.length > 0) {
      // Clear stale draft since we loaded from DB
      if (browser) eventStore.clearDraft('step2Draft');
      return serverEvent.shows.map(apiShowToForm);
    }

    // 2. SessionStorage draft
    const draft = eventStore.readDraft<Step2Draft>('step2Draft');
    if (draft && Array.isArray(draft) && draft.length > 0) {
      return draft.map((s) => ({
        title: s.title ?? '',
        date: s.date,
        startHour: s.startHour ?? '7',
        startMinute: s.startMinute ?? '0',
        startPeriod: s.startPeriod ?? 'PM',
        endHour: s.endHour ?? '10',
        endMinute: s.endMinute ?? '0',
        endPeriod: s.endPeriod ?? 'PM',
        hasEndTime: s.hasEndTime ?? false,
        itinerary: Array.isArray(s.itinerary) ? s.itinerary : [],
        datePickerOpen: false,
      }));
    }

    // 3. Default
    return [createDefaultShow()];
  }

  let shows = $state<ShowForm[]>(initializeShows());
  let loading = $state(false);
  let errors = $state<Record<string, string>>({});
  let submitted = $state(false);
  let showsLoadedFromDB = serverEvent?.shows && serverEvent.shows.length > 0;
  // Event already exists in DB (either loaded from server or stored in session)
  // This determines whether to use PUT (update) or POST (create) for shows
  let eventExistsInDB = !!serverEvent;

  // Show restore toast
  let toastShown = false;
  $effect(() => {
    if (toastShown) return;
    toastShown = true;
    if (showsLoadedFromDB) {
      toast.info('Đã tải suất diễn hiện có từ hệ thống.');
    } else {
      const draft = eventStore.readDraft<Step2Draft>('step2Draft');
      if (draft && draft.length > 0) {
        toast.info('Đã khôi phục bản nháp suất diễn từ phiên trước.');
      }
    }
  });

  // Auto-save draft (debounced)
  $effect(() => {
    if (!browser) return;
    const snapshot = $state.snapshot(shows).map((s) => ({
      title: s.title,
      date: s.date,
      startHour: s.startHour,
      startMinute: s.startMinute,
      startPeriod: s.startPeriod,
      endHour: s.endHour,
      endMinute: s.endMinute,
      endPeriod: s.endPeriod,
      hasEndTime: s.hasEndTime,
      itinerary: s.itinerary,
    }));
    const timer = setTimeout(() => eventStore.writeDraft('step2Draft', snapshot), 300);
    return () => clearTimeout(timer);
  });

  const minDate = today(getLocalTimeZone());
  const tzName = getTimezoneName();

  function getPreviewText(show: ShowForm): string {
    return getDateTimePreview(
      show.date,
      show.startHour,
      show.startMinute,
      show.startPeriod,
      tzName,
    );
  }

  function addShow() {
    shows = [...shows, createDefaultShow()];
  }

  function removeShow(index: number) {
    if (shows.length <= 1) return;
    shows = shows.filter((_, i) => i !== index);
    // Re-index errors
    const next: Record<string, string> = {};
    for (const [key, val] of Object.entries(errors)) {
      const match = key.match(/^shows\.(\d+)\./);
      if (match) {
        const idx = Number(match[1]);
        if (idx === index) continue;
        const newIdx = idx > index ? idx - 1 : idx;
        next[key.replace(`shows.${idx}.`, `shows.${newIdx}.`)] = val;
      } else {
        next[key] = val;
      }
    }
    errors = next;
  }

  function cloneShow(index: number) {
    const source = $state.snapshot(shows[index]);
    const cloned: ShowForm = {
      ...source,
      title: source.title ? `${source.title} (Copy)` : '',
      itinerary: source.itinerary.map((it) => ({ ...it })),
      datePickerOpen: false,
    };
    shows = [...shows.slice(0, index + 1), cloned, ...shows.slice(index + 1)];
  }

  function addItineraryItem(showIndex: number) {
    shows[showIndex].itinerary = [
      ...shows[showIndex].itinerary,
      { time: '', activity: '', description: '' },
    ];
  }

  function removeItineraryItem(showIndex: number, itemIndex: number) {
    shows[showIndex].itinerary = shows[showIndex].itinerary.filter((_, i) => i !== itemIndex);
  }

  function clearError(field: string) {
    if (!errors[field]) return;
    const next = { ...errors };
    delete next[field];
    errors = next;
  }

  function showFieldError(showIndex: number, field: string): string | undefined {
    return errors[`shows.${showIndex}.${field}`];
  }

  // ── Validation ──
  let validationIssues = $derived.by(() => {
    const issues: string[] = [];
    if (shows.length === 0) issues.push('Phải có ít nhất 1 suất diễn');
    for (let i = 0; i < shows.length; i++) {
      const s = shows[i];
      const label = s.title || `Suất ${i + 1}`;
      if (!s.date) issues.push(`${label}: Chưa chọn ngày`);
      if (s.hasEndTime && s.date) {
        const startH = get24Hour(s.startHour, s.startPeriod) * 60 + Number(s.startMinute);
        const endH = get24Hour(s.endHour, s.endPeriod) * 60 + Number(s.endMinute);
        if (endH <= startH) issues.push(`${label}: Giờ kết thúc phải sau giờ bắt đầu`);
      }
    }
    return issues;
  });

  let isFormValid = $derived(validationIssues.length === 0);

  function buildPayload() {
    return {
      event_id: eventId,
      shows: shows.map((s) => {
        const startTime = buildISODateTime(s.date, s.startHour, s.startMinute, s.startPeriod);
        const endTime = s.hasEndTime
          ? buildISODateTime(s.date, s.endHour, s.endMinute, s.endPeriod)
          : undefined;
        const showDate = s.date
          ? `${String(s.date.year).padStart(4, '0')}-${String(s.date.month).padStart(2, '0')}-${String(s.date.day).padStart(2, '0')}`
          : '';
        return {
          title: s.title.trim() || undefined,
          show_date: showDate,
          start_time: startTime,
          end_time: endTime,
          itinerary: s.itinerary.filter((it) => it.time.trim() && it.activity.trim()),
        };
      }),
    };
  }

  async function handleSubmit() {
    if (!eventId || loading) return;
    submitted = true;

    // Client-side field-level validation
    const fieldErrors: Record<string, string> = {};
    for (let i = 0; i < shows.length; i++) {
      const s = shows[i];
      if (!s.date) {
        fieldErrors[`shows.${i}.show_date`] = 'Vui lòng chọn ngày diễn';
      }
      if (s.hasEndTime && s.date) {
        const startMin = get24Hour(s.startHour, s.startPeriod) * 60 + Number(s.startMinute);
        const endMin = get24Hour(s.endHour, s.endPeriod) * 60 + Number(s.endMinute);
        if (endMin <= startMin) {
          fieldErrors[`shows.${i}.end_time`] = 'Giờ kết thúc phải sau giờ bắt đầu';
        }
      }
    }
    if (Object.keys(fieldErrors).length > 0) {
      errors = fieldErrors;
      toast.error('Vui lòng kiểm tra lại thông tin.');
      return;
    }
    errors = {};

    loading = true;
    const payload = buildPayload();
    type ShowsResponse = {
      event_id: number;
      shows: { id: number; title: string | null; show_date: string; status: string }[];
    };
    // Use PUT when event already has shows in DB (preserves sections/seats),
    // POST only for the very first time shows are added to a new event
    const isEditing = eventExistsInDB && showsLoadedFromDB;
    const { data, error, details } = isEditing
      ? await api.put<ShowsResponse>('/events/create/shows', payload, { silent: true })
      : await api.post<ShowsResponse>('/events/create/shows', payload, { silent: true });
    loading = false;

    if (details) {
      errors = details;
      toast.error('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }
    if (error) {
      toast.error(error);
      return;
    }

    if (data) {
      if (browser) {
        if (isEditing) {
          // PUT preserved show IDs — step3Draft keys are still valid
          // Only clear drafts for shows that were removed
          const oldStep3 = eventStore.readDraft<Record<string, unknown>>('step3Draft');
          if (oldStep3) {
            const newShowIds = new Set(data.shows.map((s) => String(s.id)));
            const cleaned: Record<string, unknown> = {};
            for (const [key, val] of Object.entries(oldStep3)) {
              if (newShowIds.has(key)) cleaned[key] = val;
            }
            eventStore.writeDraft('step3Draft', cleaned);
          }
        } else {
          // POST created fresh shows — clear stale seatmap drafts
          eventStore.clearDraft('step3Draft');
          eventStore.clearDraft('mapConfig');
          eventStore.clearDraft('stageElements');
        }

        // Always update the shows list
        eventStore.writeDraft('shows', data.shows);
      }
      toast.success('Đã lưu suất diễn! Tiếp tục cấu hình sơ đồ ghế.');
      goto(resolve(`/admin/events/create/seatmap${eventStore.eventParam(eventId)}`), {
        invalidateAll: true,
      });
    }
  }
</script>

<div class="space-y-6">
  <!-- Back button -->
  <Button
    variant="ghost"
    size="sm"
    href={resolve(`/admin/events/create${eventStore.eventParam(eventId)}`)}
    class="gap-2"
  >
    <ArrowLeft class="h-4 w-4" />
    Quay lại Bước 1
  </Button>

  <!-- Page header -->
  <div>
    <h1 class="font-heading text-2xl font-bold tracking-tight md:text-3xl">Bước 2: Suất diễn</h1>
    <p class="mt-1 text-sm text-muted-foreground">
      Thêm các suất diễn (ngày, giờ, lịch trình) cho sự kiện
      {#if eventTitle}
        <strong class="text-foreground">"{eventTitle}"</strong>
      {/if}
    </p>
  </div>

  <form
    onsubmit={(e) => {
      e.preventDefault();
      handleSubmit();
    }}
    class="space-y-6"
  >
    <!-- Shows list -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-info/10">
            <CalendarDays class="h-5 w-5 text-info" />
          </div>
          <div>
            <h2 class="text-base font-semibold text-foreground">Suất diễn ({shows.length})</h2>
            <p class="text-xs text-muted-foreground">Mỗi suất có ngày, giờ và lịch trình riêng</p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" class="gap-1.5" onclick={addShow}>
          <Plus class="h-3.5 w-3.5" />
          Thêm suất
        </Button>
      </div>

      {#each shows as show, i (i)}
        <div class="bento-card space-y-5">
          <!-- Show header -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div
                class="flex h-9 w-9 items-center justify-center rounded-xl bg-info/10 text-sm font-bold text-info"
              >
                {i + 1}
              </div>
              <div>
                <h3 class="text-base font-semibold text-foreground">
                  {show.title || `Suất diễn #${i + 1}`}
                </h3>
                <p class="text-xs text-muted-foreground">
                  {#if getPreviewText(show)}
                    {getPreviewText(show)}
                  {:else}
                    Chưa chọn ngày/giờ
                  {/if}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="text-muted-foreground hover:text-foreground"
                    onclick={() => cloneShow(i)}
                  >
                    <Copy class="h-4 w-4" />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>Nhân bản suất diễn</Tooltip.Content>
              </Tooltip.Root>
              {#if shows.length > 1}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="text-destructive hover:bg-destructive/10"
                  onclick={() => removeShow(i)}
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              {/if}
            </div>
          </div>

          <!-- Show title -->
          <div class="grid gap-1.5">
            <Label for="show-title-{i}">Tên suất diễn (tùy chọn)</Label>
            <Input
              id="show-title-{i}"
              placeholder="VD: Day 1 — Opening Night"
              bind:value={show.title}
            />
          </div>

          <!-- Date & Time -->
          <div class="rounded-2xl border border-border/50 bg-muted/20 p-4">
            <div class="mb-3 flex items-center gap-2">
              <CalendarDays class="h-4 w-4 text-info" />
              <span class="text-sm font-semibold text-foreground">
                Ngày & giờ <span class="text-destructive">*</span>
              </span>
            </div>

            <div class="grid gap-4">
              <div class="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                <!-- Date picker -->
                <div class="grid gap-1">
                  <Popover.Root bind:open={show.datePickerOpen}>
                    <Popover.Trigger
                      class="inline-flex h-9 w-full items-center justify-between rounded-lg border px-3 text-sm font-normal shadow-xs md:w-48
                        {submitted && !show.date
                        ? 'border-destructive bg-destructive/5'
                        : 'border-input bg-background'}"
                      onfocus={() => clearError(`shows.${i}.show_date`)}
                    >
                      {show.date
                        ? new CalendarDate(show.date.year, show.date.month, show.date.day)
                            .toDate(getLocalTimeZone())
                            .toLocaleDateString('vi-VN')
                        : 'Chọn ngày'}
                      <ChevronDown class="h-4 w-4 opacity-50" />
                    </Popover.Trigger>
                    <Popover.Content class="w-auto overflow-hidden rounded-xl p-0" align="start">
                      <Calendar
                        type="single"
                        value={show.date
                          ? new CalendarDate(show.date.year, show.date.month, show.date.day)
                          : undefined}
                        onValueChange={(val) => {
                          if (val) {
                            show.date = { year: val.year, month: val.month, day: val.day };
                          } else {
                            show.date = undefined;
                          }
                          show.datePickerOpen = false;
                          clearError(`shows.${i}.show_date`);
                        }}
                        captionLayout="dropdown"
                        minValue={minDate}
                      />
                    </Popover.Content>
                  </Popover.Root>
                  {#if showFieldError(i, 'show_date')}
                    <span class="text-xs text-destructive">{showFieldError(i, 'show_date')}</span>
                  {:else if submitted && !show.date}
                    <span class="text-xs text-destructive">Vui lòng chọn ngày diễn</span>
                  {/if}
                </div>

                <!-- Start Time -->
                <TimePicker
                  bind:hour={show.startHour}
                  bind:minute={show.startMinute}
                  bind:period={show.startPeriod}
                  label="Bắt đầu:"
                />
              </div>

              <!-- End time -->
              <div class="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                <label class="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    class="rounded border-input"
                    bind:checked={show.hasEndTime}
                  />
                  Có giờ kết thúc
                </label>

                {#if show.hasEndTime}
                  <TimePicker
                    bind:hour={show.endHour}
                    bind:minute={show.endMinute}
                    bind:period={show.endPeriod}
                    label="Kết thúc:"
                  />
                {/if}
              </div>

              {#if showFieldError(i, 'end_time')}
                <span class="text-xs text-destructive">{showFieldError(i, 'end_time')}</span>
              {/if}

              {#if getPreviewText(show)}
                <div class="rounded-xl border border-info-border/50 bg-info-muted/50 px-4 py-2.5">
                  <p class="text-sm text-info-muted-foreground">📅 {getPreviewText(show)}</p>
                </div>
              {/if}
            </div>
          </div>

          <!-- Itinerary -->
          <div class="rounded-2xl border border-border/50 bg-muted/20 p-4">
            <div class="mb-3 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <ListOrdered class="h-4 w-4 text-purple" />
                <span class="text-sm font-semibold text-foreground">Lịch trình (Itinerary)</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="gap-1.5 text-xs"
                onclick={() => addItineraryItem(i)}
              >
                <Plus class="h-3.5 w-3.5" />
                Thêm mốc
              </Button>
            </div>

            {#if show.itinerary.length === 0}
              <p class="text-xs text-muted-foreground italic">
                Chưa có mốc nào. Thêm lịch trình chi tiết (tùy chọn).
              </p>
            {:else}
              <div class="space-y-2">
                {#each show.itinerary as _, j (j)}
                  <div class="flex items-start gap-2">
                    <div class="flex flex-1 items-start gap-2">
                      <Input
                        placeholder="HH:MM"
                        class="w-20 text-xs"
                        bind:value={show.itinerary[j].time}
                      />
                      <Input
                        placeholder="Hoạt động"
                        class="flex-1 text-xs"
                        bind:value={show.itinerary[j].activity}
                      />
                      <Input
                        placeholder="Mô tả (tùy chọn)"
                        class="flex-1 text-xs"
                        bind:value={show.itinerary[j].description}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      class="shrink-0 text-destructive hover:bg-destructive/10"
                      onclick={() => removeItineraryItem(i, j)}
                    >
                      <X class="h-3.5 w-3.5" />
                    </Button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/each}

      <Button type="button" variant="outline" class="w-full border-dashed py-5" onclick={addShow}>
        <Plus class="mr-2 h-4 w-4" />
        Thêm suất diễn
      </Button>
    </div>

    <!-- ══════ Actions (using StepActions) ══════ -->
    <StepActions
      isValid={isFormValid}
      {loading}
      issues={validationIssues}
      backHref={`/admin/events/create${eventStore.eventParam(eventId)}`}
      backLabel="Quay lại"
    />
  </form>
</div>
