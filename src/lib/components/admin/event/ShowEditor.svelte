<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import Calendar from '$lib/components/ui/calendar/calendar.svelte';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Popover from '$lib/components/ui/popover';
  import * as Select from '$lib/components/ui/select';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import type { ShowFormData } from '$lib/shared/schemas/event.schema';
  import {
    CalendarDate,
    CalendarDateTime,
    getLocalTimeZone,
    toZoned,
    today,
    type DateValue,
  } from '@internationalized/date';
  import { CalendarDays, ChevronDown, Copy, ListOrdered, Plus, Trash2, X } from 'lucide-svelte';
  import SectionBuilder from './SectionBuilder.svelte';

  let {
    show = $bindable(),
    index,
    totalShows,
    compact = false,
    onremove,
    onclone,
    errors = {},
    onvalidationchange,
  }: {
    show: ShowFormData;
    index: number;
    totalShows: number;
    /** When true, hides show header/title and renders date/itinerary as separate bento-cards */
    compact?: boolean;
    onremove?: () => void;
    onclone?: () => void;
    errors?: Record<string, string>;
    onvalidationchange?: (state: { hasOverlap: boolean; duplicatePrefixes: string[] }) => void;
  } = $props();

  // ── Hour options for Select (1–12) ──
  const hourOptions = Array.from({ length: 12 }, (_, i) => {
    const h = i + 1;
    return { value: String(h), label: String(h).padStart(2, '0') };
  });

  // ── Minute options (00, 05, 10, ..., 55) ──
  const minuteOptions = Array.from({ length: 12 }, (_, i) => {
    const m = i * 5;
    return { value: String(m), label: String(m).padStart(2, '0') };
  });

  const minDate = today(getLocalTimeZone());

  // ── Timezone display name ──
  const tzName =
    Intl.DateTimeFormat('vi-VN', { timeZoneName: 'longOffset' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName')?.value ?? getLocalTimeZone();

  let datePickerOpen = $state(false);

  // Derive CalendarDate from show.date
  let dateValue = $derived(
    show.date ? new CalendarDate(show.date.year, show.date.month, show.date.day) : undefined,
  );

  function handleDateChange(val: DateValue | undefined) {
    if (val) {
      show.date = { year: val.year, month: val.month, day: val.day };
    } else {
      show.date = undefined;
    }
    datePickerOpen = false;
  }

  /** Convert 12h AM/PM selection to 24h hour */
  function get24Hour(hour: string, period: 'AM' | 'PM'): number {
    let h = Number(hour);
    if (period === 'AM' && h === 12) h = 0;
    else if (period === 'PM' && h !== 12) h += 12;
    return h;
  }

  /** Preview text for start time */
  let startPreviewText = $derived.by(() => {
    if (!show.date) return '';
    const tz = getLocalTimeZone();
    const dt = new CalendarDateTime(
      show.date.year,
      show.date.month,
      show.date.day,
      get24Hour(show.startHour, show.startPeriod),
      Number(show.startMinute),
      0,
    );
    const zdt = toZoned(dt, tz);
    const jsDate = zdt.toDate();
    const dateStr = jsDate.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = jsDate.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${timeStr} ngày ${dateStr} (${tzName})`;
  });

  // ── Itinerary management ──
  function addItineraryItem() {
    show.itinerary = [...show.itinerary, { time: '', activity: '', description: '' }];
  }

  function removeItineraryItem(idx: number) {
    show.itinerary = show.itinerary.filter((_, i) => i !== idx);
  }

  function showFieldError(field: string): string | undefined {
    return errors[`shows.${index}.${field}`];
  }

  // Forward section validation to parent
  function handleSectionValidation(state: { hasOverlap: boolean; duplicatePrefixes: string[] }) {
    onvalidationchange?.(state);
  }
</script>

<!-- Outer wrapper: bento-card in multi-show, bare space-y in compact/single-show -->
<div class={compact ? 'space-y-6' : 'bento-card space-y-5'}>
  {#if !compact}
    <!-- Show Header (multi-show only) -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div
          class="flex h-9 w-9 items-center justify-center rounded-xl bg-info/10 text-sm font-bold text-info"
        >
          {index + 1}
        </div>
        <div>
          <h3 class="text-base font-semibold text-foreground">
            {show.title || `Suất diễn #${index + 1}`}
          </h3>
          <p class="text-xs text-muted-foreground">
            {#if startPreviewText}
              {startPreviewText}
            {:else}
              Chưa chọn ngày/giờ
            {/if}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        {#if onclone}
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="text-muted-foreground hover:text-foreground"
                onclick={onclone}
              >
                <Copy class="h-4 w-4" />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>Nhân bản suất diễn</Tooltip.Content>
          </Tooltip.Root>
        {/if}
        {#if totalShows > 1 && onremove}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="text-destructive hover:bg-destructive/10"
            onclick={onremove}
          >
            <Trash2 class="h-4 w-4" />
          </Button>
        {/if}
      </div>
    </div>

    <!-- Show Title (multi-show only) -->
    <div class="grid gap-1.5">
      <Label for="show-title-{index}">Tên suất diễn (tùy chọn)</Label>
      <Input
        id="show-title-{index}"
        placeholder="VD: Day 1 — Opening Night"
        bind:value={show.title}
      />
      {#if showFieldError('title')}
        <span class="text-xs text-destructive">{showFieldError('title')}</span>
      {/if}
    </div>
  {/if}

  <!-- Date & Time: bento-card when compact, nested sub-card when inside a show card -->
  <div class={compact ? 'bento-card' : 'rounded-2xl border border-border/50 bg-muted/20 p-4'}>
    <div class="mb-3 flex items-center gap-2">
      <CalendarDays class="h-4 w-4 text-info" />
      <span class="text-sm font-semibold text-foreground">Ngày & giờ</span>
    </div>

    <div class="grid gap-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <!-- Date picker -->
        <Popover.Root bind:open={datePickerOpen}>
          <Popover.Trigger
            class="inline-flex h-9 w-full items-center justify-between rounded-lg border border-input bg-background px-3 text-sm font-normal shadow-xs md:w-48"
          >
            {dateValue
              ? dateValue.toDate(getLocalTimeZone()).toLocaleDateString('vi-VN')
              : 'Chọn ngày'}
            <ChevronDown class="h-4 w-4 opacity-50" />
          </Popover.Trigger>
          <Popover.Content class="w-auto overflow-hidden rounded-xl p-0" align="start">
            <Calendar
              type="single"
              value={dateValue}
              onValueChange={handleDateChange}
              captionLayout="dropdown"
              minValue={minDate}
            />
          </Popover.Content>
        </Popover.Root>

        <!-- Start Time selects: Hour / Minute / AM|PM -->
        <div class="flex w-full items-center gap-2 md:w-auto">
          <span class="text-xs text-muted-foreground">Bắt đầu:</span>
          <div class="flex flex-1 items-center gap-2 md:flex-initial">
            <Select.Root type="single" bind:value={show.startHour}>
              <Select.Trigger class="w-full md:w-18">
                {String(show.startHour).padStart(2, '0')}
              </Select.Trigger>
              <Select.Content>
                <Select.Group>
                  <Select.Label>Giờ</Select.Label>
                  {#each hourOptions as opt (opt.value)}
                    <Select.Item value={opt.value}>{opt.label}</Select.Item>
                  {/each}
                </Select.Group>
              </Select.Content>
            </Select.Root>
            <span class="text-sm font-bold text-muted-foreground">:</span>
            <Select.Root type="single" bind:value={show.startMinute}>
              <Select.Trigger class="w-full md:w-18">
                {String(show.startMinute).padStart(2, '0')}
              </Select.Trigger>
              <Select.Content>
                <Select.Group>
                  <Select.Label>Phút</Select.Label>
                  {#each minuteOptions as opt (opt.value)}
                    <Select.Item value={opt.value}>{opt.label}</Select.Item>
                  {/each}
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </div>
          <Select.Root type="single" bind:value={show.startPeriod}>
            <Select.Trigger class="flex-1 md:w-18 md:flex-initial">
              {show.startPeriod}
            </Select.Trigger>
            <Select.Content>
              <Select.Group>
                <Select.Label>Buổi</Select.Label>
                <Select.Item value="AM">AM</Select.Item>
                <Select.Item value="PM">PM</Select.Item>
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      <!-- End Time (optional) -->
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <label class="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" class="rounded border-input" bind:checked={show.hasEndTime} />
          Có giờ kết thúc
        </label>

        {#if show.hasEndTime}
          <div class="flex w-full items-center gap-2 md:w-auto">
            <span class="text-xs text-muted-foreground">Kết thúc:</span>
            <div class="flex flex-1 items-center gap-2 md:flex-initial">
              <Select.Root type="single" bind:value={show.endHour}>
                <Select.Trigger class="w-full md:w-18">
                  {String(show.endHour).padStart(2, '0')}
                </Select.Trigger>
                <Select.Content>
                  <Select.Group>
                    <Select.Label>Giờ</Select.Label>
                    {#each hourOptions as opt (opt.value)}
                      <Select.Item value={opt.value}>{opt.label}</Select.Item>
                    {/each}
                  </Select.Group>
                </Select.Content>
              </Select.Root>
              <span class="text-sm font-bold text-muted-foreground">:</span>
              <Select.Root type="single" bind:value={show.endMinute}>
                <Select.Trigger class="w-full md:w-18">
                  {String(show.endMinute).padStart(2, '0')}
                </Select.Trigger>
                <Select.Content>
                  <Select.Group>
                    <Select.Label>Phút</Select.Label>
                    {#each minuteOptions as opt (opt.value)}
                      <Select.Item value={opt.value}>{opt.label}</Select.Item>
                    {/each}
                  </Select.Group>
                </Select.Content>
              </Select.Root>
            </div>
            <Select.Root type="single" bind:value={show.endPeriod}>
              <Select.Trigger class="flex-1 md:w-18 md:flex-initial">
                {show.endPeriod}
              </Select.Trigger>
              <Select.Content>
                <Select.Group>
                  <Select.Label>Buổi</Select.Label>
                  <Select.Item value="AM">AM</Select.Item>
                  <Select.Item value="PM">PM</Select.Item>
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </div>
        {/if}
      </div>

      {#if startPreviewText}
        <div class="rounded-xl border border-info-border/50 bg-info-muted/50 px-4 py-2.5">
          <p class="text-sm text-info-muted-foreground">📅 {startPreviewText}</p>
        </div>
      {/if}

      {#if showFieldError('show_date')}
        <span class="text-xs text-destructive">{showFieldError('show_date')}</span>
      {/if}
      {#if showFieldError('start_time')}
        <span class="text-xs text-destructive">{showFieldError('start_time')}</span>
      {/if}
      {#if showFieldError('end_time')}
        <span class="text-xs text-destructive">{showFieldError('end_time')}</span>
      {/if}
    </div>
  </div>

  <!-- Itinerary: bento-card when compact, nested sub-card when inside a show card -->
  <div class={compact ? 'bento-card' : 'rounded-2xl border border-border/50 bg-muted/20 p-4'}>
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
        onclick={addItineraryItem}
      >
        <Plus class="h-3.5 w-3.5" />
        Thêm mốc
      </Button>
    </div>

    {#if show.itinerary.length === 0}
      <p class="text-xs text-muted-foreground italic">
        Chưa có mốc nào. Thêm lịch trình chi tiết cho suất diễn này (tùy chọn).
      </p>
    {:else}
      <div class="space-y-2">
        {#each show.itinerary as item, i (i)}
          <div class="flex items-start gap-2">
            <div class="flex flex-1 items-start gap-2">
              <Input placeholder="HH:MM" class="w-20 text-xs" bind:value={show.itinerary[i].time} />
              <Input
                placeholder="Hoạt động"
                class="flex-1 text-xs"
                bind:value={show.itinerary[i].activity}
              />
              <Input
                placeholder="Mô tả (tùy chọn)"
                class="flex-1 text-xs"
                bind:value={show.itinerary[i].description}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="shrink-0 text-destructive hover:bg-destructive/10"
              onclick={() => removeItineraryItem(i)}
            >
              <X class="h-3.5 w-3.5" />
            </Button>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Sections Builder -->
  <SectionBuilder
    bind:sections={show.sections}
    {errors}
    errPrefix="shows.{index}."
    onvalidationchange={handleSectionValidation}
  />
</div>
