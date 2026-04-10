<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import SectionBuilder from '$lib/components/admin/event/SectionBuilder.svelte';
  import { Button } from '$lib/components/ui/button';
  import Calendar from '$lib/components/ui/calendar/calendar.svelte';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Popover from '$lib/components/ui/popover';
  import * as Select from '$lib/components/ui/select';
  import { Textarea } from '$lib/components/ui/textarea';
  import { formatZodErrors } from '$lib/shared/format-errors';
  import { createEventSchema } from '$lib/shared/schemas/event.schema';
  import { toast } from '$lib/stores/toast';
  import { api } from '$lib/utils/api';
  import {
    CalendarDateTime,
    getLocalTimeZone,
    toZoned,
    today,
    type CalendarDate,
  } from '@internationalized/date';
  import { ChevronDown, Loader, Save } from 'lucide-svelte';

  type SectionForm = {
    name: string;
    price: number;
    rows: number;
    cols: number;
    layout_x: number;
    layout_y: number;
    start_row_index: number;
    start_col_index: number;
    disabled_seats: string;
    sort_order: number;
  };

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

  // ── Form state ──
  let title = $state('');
  let description = $state('');
  let venue = $state('');
  let dateValue = $state<CalendarDate | undefined>();
  let selectedHour = $state('7');
  let selectedMinute = $state('0');
  let selectedPeriod = $state<'AM' | 'PM'>('PM');
  let datePickerOpen = $state(false);
  let bannerImageUrl = $state('');
  let sections = $state<SectionForm[]>([
    {
      name: '',
      price: 0,
      rows: 1,
      cols: 1,
      layout_x: 0,
      layout_y: 0,
      start_row_index: 0,
      start_col_index: 1,
      disabled_seats: '',
      sort_order: 0,
    },
  ]);

  let loading = $state(false);
  let errors = $state<Record<string, string>>({});

  const minDate = today(getLocalTimeZone());

  // ── Timezone display name ──
  const tzName =
    Intl.DateTimeFormat('vi-VN', { timeZoneName: 'longOffset' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName')?.value ?? getLocalTimeZone();

  function clearError(field: string) {
    if (!errors[field]) return;
    const next = { ...errors };
    delete next[field];
    errors = next;
  }

  /** Convert 12h AM/PM selection to 24h hour */
  function get24Hour(): number {
    let h = Number(selectedHour);
    if (selectedPeriod === 'AM' && h === 12) h = 0;
    else if (selectedPeriod === 'PM' && h !== 12) h += 12;
    return h;
  }

  /** Build a ZonedDateTime from the selected date + time, then format to ISO 8601 with offset */
  function buildISODateTime(): string {
    if (!dateValue) return '';
    const tz = getLocalTimeZone();
    const dt = new CalendarDateTime(
      dateValue.year,
      dateValue.month,
      dateValue.day,
      get24Hour(),
      Number(selectedMinute),
      0,
    );
    const zdt = toZoned(dt, tz);
    return zdt.toString(); // e.g. "2025-06-15T19:00:00+07:00[Asia/Saigon]"
  }

  /** Preview text shown when both date & time are filled */
  let previewText = $derived.by(() => {
    if (!dateValue) return '';
    const tz = getLocalTimeZone();
    const dt = new CalendarDateTime(
      dateValue.year,
      dateValue.month,
      dateValue.day,
      get24Hour(),
      Number(selectedMinute),
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
    return `Sự kiện sẽ được tổ chức vào ${timeStr} ngày ${dateStr}, múi giờ ${tzName}`;
  });

  function buildPayload() {
    return {
      title: title.trim(),
      description: description.trim(),
      venue: venue.trim(),
      event_date: buildISODateTime(),
      banner_image_url: bannerImageUrl.trim() || undefined,
      sections: sections.map((s, i) => ({
        name: s.name.trim(),
        price: Number(s.price),
        rows: Number(s.rows),
        cols: Number(s.cols),
        layout_x: Number(s.layout_x),
        layout_y: Number(s.layout_y),
        start_row_index: Number(s.start_row_index),
        start_col_index: Number(s.start_col_index),
        disabled_seats: s.disabled_seats
          ? s.disabled_seats
              .split(',')
              .map((seat) => seat.trim())
              .filter(Boolean)
          : [],
        sort_order: Number(s.sort_order ?? i),
      })),
    };
  }

  async function handleSubmit() {
    const payload = buildPayload();

    // Client-side validation
    const result = createEventSchema.safeParse(payload);
    if (!result.success) {
      errors = formatZodErrors(result.error);
      toast.error('Vui lòng kiểm tra lại thông tin nhập.');
      return;
    }
    errors = {};

    loading = true;
    const { data, error, details } = await api.post<{ id: number }>('/events', payload, {
      silent: true,
    });
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
      toast.success('Tạo sự kiện (Draft) thành công!');
      goto(resolve('/admin/events'));
    }
  }
</script>

<div class="mx-auto max-w-4xl space-y-6 md:space-y-8">
  <!-- Page header -->
  <div>
    <h1 class="text-2xl font-bold tracking-tight">Tạo sự kiện mới</h1>
    <p class="text-sm text-muted-foreground">
      Điền thông tin và cấu hình khu vực ghế cho sự kiện. Sự kiện sẽ được lưu dưới dạng Draft.
    </p>
  </div>

  <form
    onsubmit={(e) => {
      e.preventDefault();
      handleSubmit();
    }}
    class="space-y-8"
  >
    <!-- General info -->
    <div class="rounded-lg border bg-card p-4 shadow-sm md:p-6">
      <h2 class="mb-4 text-base font-semibold text-foreground">📝 Thông tin chung</h2>

      <div class="grid gap-5">
        <!-- Title -->
        <div class="grid gap-1.5">
          <Label for="title">Tên sự kiện</Label>
          <Input
            id="title"
            placeholder="VD: Đêm nhạc Trịnh Công Sơn"
            bind:value={title}
            onfocus={() => clearError('title')}
          />
          {#if errors.title}
            <span class="text-xs text-destructive">{errors.title}</span>
          {/if}
        </div>

        <!-- Description -->
        <div class="grid gap-1.5">
          <Label for="description">Mô tả</Label>
          <Textarea
            id="description"
            placeholder="Mô tả chi tiết sự kiện..."
            rows={4}
            bind:value={description}
            onfocus={() => clearError('description')}
          />
          {#if errors.description}
            <span class="text-xs text-destructive">{errors.description}</span>
          {/if}
        </div>

        <!-- Venue -->
        <div class="grid gap-1.5">
          <Label for="venue">Địa điểm</Label>
          <Input
            id="venue"
            placeholder="VD: Nhà hát lớn Hà Nội"
            bind:value={venue}
            onfocus={() => clearError('venue')}
          />
          {#if errors.venue}
            <span class="text-xs text-destructive">{errors.venue}</span>
          {/if}
        </div>

        <!-- Event date & time -->
        <div class="grid gap-1.5">
          <Label>Ngày & giờ sự kiện</Label>
          <div class="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <!-- Date picker -->
            <Popover.Root bind:open={datePickerOpen}>
              <Popover.Trigger
                onclick={() => clearError('event_date')}
                class="inline-flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm font-normal shadow-xs hover:bg-accent hover:text-accent-foreground md:w-44"
              >
                {dateValue
                  ? dateValue.toDate(getLocalTimeZone()).toLocaleDateString('vi-VN')
                  : 'Chọn ngày'}
                <ChevronDown class="h-4 w-4 opacity-50" />
              </Popover.Trigger>
              <Popover.Content class="w-auto overflow-hidden p-0" align="start">
                <Calendar
                  type="single"
                  bind:value={dateValue}
                  onValueChange={() => {
                    datePickerOpen = false;
                    clearError('event_date');
                  }}
                  captionLayout="dropdown"
                  minValue={minDate}
                />
              </Popover.Content>
            </Popover.Root>

            <!-- Time selects: Hour / Minute / AM|PM -->
            <div class="flex items-center gap-2">
              <Select.Root
                type="single"
                bind:value={selectedHour}
                onValueChange={() => clearError('event_date')}
              >
                <Select.Trigger class="w-18">
                  {String(selectedHour).padStart(2, '0')}
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

              <span class="text-sm font-medium text-muted-foreground">:</span>

              <Select.Root
                type="single"
                bind:value={selectedMinute}
                onValueChange={() => clearError('event_date')}
              >
                <Select.Trigger class="w-18">
                  {String(selectedMinute).padStart(2, '0')}
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

              <Select.Root
                type="single"
                bind:value={selectedPeriod}
                onValueChange={() => clearError('event_date')}
              >
                <Select.Trigger class="w-18">
                  {selectedPeriod}
                </Select.Trigger>
                <Select.Content>
                  <Select.Group>
                    <Select.Label>Buổi</Select.Label>
                    <Select.Item value="AM">AM (00:00 - 11:59)</Select.Item>
                    <Select.Item value="PM">PM (12:00 - 23:59)</Select.Item>
                  </Select.Group>
                </Select.Content>
              </Select.Root>
            </div>
          </div>

          {#if previewText}
            <p class="text-sm text-muted-foreground">
              📅 {previewText}
            </p>
          {/if}

          {#if errors.event_date}
            <span class="text-xs text-destructive">{errors.event_date}</span>
          {/if}
        </div>

        <!-- Banner URL -->
        <div class="grid gap-1.5">
          <Label for="banner_image_url">URL ảnh banner (tùy chọn)</Label>
          <Input
            id="banner_image_url"
            type="url"
            placeholder="https://example.com/banner.jpg"
            bind:value={bannerImageUrl}
            onfocus={() => clearError('banner_image_url')}
          />
          {#if errors.banner_image_url}
            <span class="text-xs text-destructive">{errors.banner_image_url}</span>
          {/if}
        </div>
      </div>
    </div>

    <!-- Sections -->
    <SectionBuilder bind:sections {errors} />

    <!-- Submit -->
    <div
      class="flex flex-col-reverse gap-3 border-t pt-4 md:flex-row md:items-center md:justify-end md:pt-6"
    >
      <Button
        type="button"
        variant="outline"
        class="w-full md:w-auto"
        onclick={() => goto(resolve('/admin/events'))}
      >
        Hủy
      </Button>
      <Button type="submit" class="w-full md:w-auto" disabled={loading}>
        {#if loading}
          <Loader class="mr-2 h-4 w-4 animate-spin" />
        {:else}
          <Save class="mr-2 h-4 w-4" />
        {/if}
        Tạo sự kiện (Lưu Draft)
      </Button>
    </div>
  </form>
</div>
