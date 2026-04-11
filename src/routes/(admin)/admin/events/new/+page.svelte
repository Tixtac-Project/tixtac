<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import SectionBuilder from '$lib/components/admin/event/SectionBuilder.svelte';
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import { Button } from '$lib/components/ui/button';
  import Calendar from '$lib/components/ui/calendar/calendar.svelte';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Popover from '$lib/components/ui/popover';
  import * as Select from '$lib/components/ui/select';
  import { Textarea } from '$lib/components/ui/textarea';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import { formatZodErrors } from '$lib/shared/format-errors';
  import {
    createEventSchema,
    formDraftSchema,
    type FormDraft,
    type SectionFormData,
  } from '$lib/shared/schemas/event.schema';
  import { toast } from '$lib/stores/toast';
  import { api } from '$lib/utils/api';
  import {
    CalendarDate,
    CalendarDateTime,
    getLocalTimeZone,
    toZoned,
    today,
  } from '@internationalized/date';
  import {
    ArrowLeft,
    CalendarDays,
    ChevronDown,
    FileText,
    ImageIcon,
    Loader,
    MapPin,
    RotateCcw,
    Save,
  } from 'lucide-svelte';

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

  // ── Form persistence ─────────────────────────────────────
  const STORAGE_KEY = 'tixtac-new-event-draft';

  const defaultSection: SectionFormData = {
    name: '',
    prefix: '',
    price: 0,
    rows: 1,
    cols: 1,
    layout_x: 0,
    layout_y: 0,
    start_row_index: 0,
    start_col_index: 1,
    disabled_seats: '',
    sort_order: 0,
  };

  /** Read and validate saved draft synchronously (runs at script init, before first render) */
  function readDraft(): FormDraft | null {
    if (!browser) return null;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const result = formDraftSchema.safeParse(JSON.parse(raw));
      if (!result.success) {
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return result.data;
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  const draft = readDraft();
  const hasDraft = draft !== null;

  // ── Form state (initialised from draft if available) ──
  let title = $state(draft?.title ?? '');
  let description = $state(draft?.description ?? '');
  let venue = $state(draft?.venue ?? '');
  let dateValue = $state<CalendarDate | undefined>(
    draft?.date ? new CalendarDate(draft.date.year, draft.date.month, draft.date.day) : undefined,
  );
  let selectedHour = $state(draft?.selectedHour ?? '7');
  let selectedMinute = $state(draft?.selectedMinute ?? '0');
  let selectedPeriod = $state<'AM' | 'PM'>(draft?.selectedPeriod ?? 'PM');
  let datePickerOpen = $state(false);
  let bannerImageUrl = $state(draft?.bannerImageUrl ?? '');
  let sections = $state<SectionFormData[]>(
    draft?.sections?.length ? draft.sections : [{ ...defaultSection }],
  );

  let loading = $state(false);
  let errors = $state<Record<string, string>>({});
  let sectionHasOverlap = $state(false);
  let sectionDuplicatePrefixes = $state<string[]>([]);

  // Show toast once (after first render) if draft was restored
  let draftToastShown = false;
  $effect(() => {
    if (hasDraft && !draftToastShown) {
      draftToastShown = true;
      toast.info('Đã khôi phục bản nháp từ phiên trước.');
    }
  });

  function clearFormDraft() {
    if (browser) sessionStorage.removeItem(STORAGE_KEY);
  }

  function resetForm() {
    title = '';
    description = '';
    venue = '';
    dateValue = undefined;
    selectedHour = '7';
    selectedMinute = '0';
    selectedPeriod = 'PM';
    bannerImageUrl = '';
    sections = [{ ...defaultSection }];
    errors = {};
    clearFormDraft();
    toast.info('Đã đặt lại biểu mẫu.');
  }

  // Auto-save to sessionStorage on any form change (debounced)
  $effect(() => {
    if (!browser) return;
    const snapshot: FormDraft = {
      title,
      description,
      venue,
      date: dateValue
        ? { year: dateValue.year, month: dateValue.month, day: dateValue.day }
        : undefined,
      selectedHour,
      selectedMinute,
      selectedPeriod,
      bannerImageUrl,
      sections: $state.snapshot(sections) as SectionFormData[],
    };
    const timer = setTimeout(() => {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    }, 300);
    return () => clearTimeout(timer);
  });

  function handleSectionValidation(state: { hasOverlap: boolean; duplicatePrefixes: string[] }) {
    sectionHasOverlap = state.hasOverlap;
    sectionDuplicatePrefixes = state.duplicatePrefixes;
  }

  // ── Live validation: derive issues list + validity ──
  let validationIssues = $derived.by(() => {
    const issues: string[] = [];

    if (!title.trim()) issues.push('Tên sự kiện không được trống');
    if (!description.trim()) issues.push('Mô tả không được trống');
    if (!venue.trim()) issues.push('Địa điểm không được trống');
    if (!dateValue) issues.push('Chưa chọn ngày sự kiện');
    if (sections.length === 0) issues.push('Phải có ít nhất 1 khu vực ghế');
    if (sectionHasOverlap) issues.push('Các khu vực ghế bị chồng chéo');
    if (sectionDuplicatePrefixes.length > 0)
      issues.push(`Prefix trùng lặp: ${sectionDuplicatePrefixes.join(', ')}`);

    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const label = s.name.trim() || `Khu vực ${i + 1}`;
      if (!s.name.trim()) issues.push(`${label}: Thiếu tên`);
      if (!s.prefix.trim()) issues.push(`${label}: Thiếu mã tiền tố`);
      if (s.rows < 1 || s.cols < 1) issues.push(`${label}: Số hàng/cột phải ≥ 1`);
      if (s.price <= 0) issues.push(`${label}: Giá phải > 0`);
    }

    // If basic checks pass, run full Zod for deeper issues
    if (issues.length === 0) {
      const payload = buildPayload();
      const result = createEventSchema.safeParse(payload);
      if (!result.success) {
        for (const issue of result.error.issues) {
          issues.push(issue.message);
        }
      }
    }

    return issues;
  });

  let isFormValid = $derived(validationIssues.length === 0);

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
    // zdt.toString() returns "2025-06-15T19:00:00+07:00[Asia/Saigon]"
    // Strip the [IANA] suffix — Zod's z.iso.datetime({ offset: true }) only accepts pure ISO 8601
    return zdt.toString().replace(/\[.+\]$/, '');
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
        prefix: s.prefix.trim().toUpperCase(),
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
              .map((seat) => seat.trim().toUpperCase())
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
      clearFormDraft();
      toast.success('Tạo sự kiện (Draft) thành công!');
      goto(resolve('/admin/events'));
    }
  }
</script>

<div class="mx-auto max-w-4xl space-y-6 md:space-y-8">
  <!-- Back button -->
  <Button variant="ghost" size="sm" href={resolve('/admin/events')} class="gap-2 rounded-xl">
    <ArrowLeft class="h-4 w-4" />
    Quay lại danh sách
  </Button>

  <!-- Page header -->
  <div>
    <h1 class="font-heading text-2xl font-bold tracking-tight md:text-3xl">Tạo sự kiện mới</h1>
    <p class="mt-1 text-sm text-muted-foreground">
      Điền thông tin và cấu hình khu vực ghế cho sự kiện. Sự kiện sẽ được lưu dưới dạng
      <span class="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
        Draft
      </span>
      .
    </p>
  </div>

  <form
    onsubmit={(e) => {
      e.preventDefault();
      handleSubmit();
    }}
    class="space-y-6"
  >
    <!-- ══════ General Info Card ══════ -->
    <div class="bento-card">
      <div class="mb-5 flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <FileText class="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-foreground">Thông tin chung</h2>
          <p class="text-xs text-muted-foreground">Tên, mô tả và địa điểm sự kiện</p>
        </div>
      </div>

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
          <Label for="venue" class="flex items-center gap-1.5">
            <MapPin class="h-3.5 w-3.5 text-muted-foreground" />
            Địa điểm
          </Label>
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
      </div>
    </div>

    <!-- ══════ Date & Time Card ══════ -->
    <div class="bento-card">
      <div class="mb-5 flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-info/10">
          <CalendarDays class="h-5 w-5 text-info" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-foreground">Ngày & giờ</h2>
          <p class="text-xs text-muted-foreground">Chọn thời gian tổ chức sự kiện</p>
        </div>
      </div>

      <div class="grid gap-4">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <!-- Date picker -->
          <Popover.Root bind:open={datePickerOpen}>
            <Popover.Trigger
              onclick={() => clearError('event_date')}
              class="inline-flex h-9 w-full items-center justify-between rounded-xl border border-input bg-background px-3 text-sm font-normal shadow-xs md:w-48"
            >
              {dateValue
                ? dateValue.toDate(getLocalTimeZone()).toLocaleDateString('vi-VN')
                : 'Chọn ngày'}
              <ChevronDown class="h-4 w-4 opacity-50" />
            </Popover.Trigger>
            <Popover.Content class="w-auto overflow-hidden rounded-2xl p-0" align="start">
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
          <div class="flex w-full items-center gap-2 md:w-auto">
            <div class="flex flex-1 items-center gap-2 md:flex-initial">
              <Select.Root
                type="single"
                bind:value={selectedHour}
                onValueChange={() => clearError('event_date')}
              >
                <Select.Trigger class="w-full rounded-xl md:w-18">
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

              <span class="text-sm font-bold text-muted-foreground">:</span>

              <Select.Root
                type="single"
                bind:value={selectedMinute}
                onValueChange={() => clearError('event_date')}
              >
                <Select.Trigger class="w-full rounded-xl md:w-18">
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
            </div>

            <Select.Root
              type="single"
              bind:value={selectedPeriod}
              onValueChange={() => clearError('event_date')}
            >
              <Select.Trigger class="flex-1 rounded-xl md:w-18 md:flex-initial">
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
          <div class="rounded-xl border border-info-border/50 bg-info-muted/50 px-4 py-2.5">
            <p class="text-sm text-info-muted-foreground">
              📅 {previewText}
            </p>
          </div>
        {/if}

        {#if errors.event_date}
          <span class="text-xs text-destructive">{errors.event_date}</span>
        {/if}
      </div>
    </div>

    <!-- ══════ Banner Card ══════ -->
    <div class="bento-card">
      <div class="mb-5 flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-purple/10">
          <ImageIcon class="h-5 w-5 text-purple" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-foreground">Ảnh banner</h2>
          <p class="text-xs text-muted-foreground">Tùy chọn — URL ảnh đại diện cho sự kiện</p>
        </div>
      </div>

      <div class="grid gap-1.5">
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
        {#if bannerImageUrl.trim()}
          <div class="mt-2 overflow-hidden rounded-2xl border border-border/50">
            <img
              src={bannerImageUrl}
              alt="Banner preview"
              class="h-40 w-full object-cover"
              onerror={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        {/if}
      </div>
    </div>

    <!-- ══════ Sections ══════ -->
    <SectionBuilder bind:sections {errors} onvalidationchange={handleSectionValidation} />

    <!-- ══════ Actions ══════ -->
    <div
      class="bento-card flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-between"
    >
      <!-- Left: validation summary -->
      <div class="hidden md:block">
        {#if !isFormValid && validationIssues.length > 0}
          <p class="text-xs text-muted-foreground">
            ⚠️ {validationIssues.length} vấn đề cần khắc phục
          </p>
        {:else if isFormValid}
          <p class="text-xs text-success">✓ Sẵn sàng tạo sự kiện</p>
        {/if}
      </div>

      <!-- Right: buttons -->
      <div class="flex flex-col-reverse gap-2 md:flex-row md:items-center">
        <Button
          type="button"
          variant="ghost"
          class="w-full rounded-xl md:w-auto"
          onclick={() => goto(resolve('/admin/events'))}
        >
          Hủy
        </Button>

        <AlertDialog.Root>
          <AlertDialog.Trigger>
            {#snippet child({ props })}
              <Button
                {...props}
                type="button"
                variant="outline"
                class="w-full gap-2 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5 md:w-auto"
              >
                <RotateCcw class="h-4 w-4" />
                Đặt lại
              </Button>
            {/snippet}
          </AlertDialog.Trigger>
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>Đặt lại biểu mẫu?</AlertDialog.Title>
              <AlertDialog.Description>
                Tất cả các ô bạn đã nhập sẽ bị xoá. Bạn có chắc chắn muốn đặt lại?
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>Huỷ bỏ</AlertDialog.Cancel>
              <AlertDialog.Action onclick={resetForm}>Đặt lại</AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Root>

        {#if !isFormValid && validationIssues.length > 0}
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger class="w-full md:w-auto">
                <Button type="submit" class="w-full gap-2 rounded-xl md:w-auto" disabled>
                  <Save class="h-4 w-4" />
                  Tạo sự kiện
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content side="top" class="max-w-xs rounded-xl">
                <p class="mb-1 text-xs font-semibold">Chưa thể tạo sự kiện:</p>
                <ul class="list-inside list-disc space-y-0.5 text-xs">
                  {#each validationIssues.slice(0, 5) as issue, i (`${issue}-${i}`)}
                    <li>{issue}</li>
                  {/each}
                  {#if validationIssues.length > 5}
                    <li>… và {validationIssues.length - 5} lỗi khác</li>
                  {/if}
                </ul>
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        {:else}
          <Button
            type="submit"
            class="w-full gap-2 rounded-xl hover:bg-primary/90 md:w-auto"
            disabled={loading}
          >
            {#if loading}
              <Loader class="h-4 w-4 animate-spin" />
            {:else}
              <Save class="h-4 w-4" />
            {/if}
            Tạo sự kiện (Lưu Draft)
          </Button>
        {/if}
      </div>
    </div>
  </form>
</div>
