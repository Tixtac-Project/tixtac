<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Select from '$lib/components/ui/select';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import type { SectionFormData } from '$lib/shared/schemas/event.schema';
  import { createDefaultSection, generatePrefix } from '$lib/utils/section-defaults';
  import {
    Armchair,
    ArrowLeft,
    Check,
    Copy,
    GripVertical,
    Loader,
    Map,
    Palette,
    Pencil,
    Plus,
    Trash2,
  } from 'lucide-svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { SECTION_COLORS } from './types';

  type ShowInfo = {
    id: number;
    title: string | null;
    show_date: string;
  };

  let {
    sections = $bindable<SectionFormData[]>([]),
    showsList = [],
    selectedShowIndex = $bindable(0),
    onDesignMap,
    onFinishWithoutMap,
    onCloneSections,
    isSaving = false,
    eventTitle = '',
    backHref = '',
  }: {
    sections: SectionFormData[];
    showsList?: ShowInfo[];
    selectedShowIndex?: number;
    onDesignMap: () => void;
    onFinishWithoutMap: () => void;
    onCloneSections?: () => void;
    isSaving?: boolean;
    eventTitle?: string;
    backHref?: string;
  } = $props();

  let editingIndex = $state<number | null>(null);

  // ── Derived "tier" view from sections ──
  function getSectionCapacity(sec: SectionFormData): number {
    return sec.type === 'general'
      ? (sec.capacity ?? 0)
      : (sec.seat_config.rows ?? 0) * (sec.seat_config.cols ?? 0);
  }

  function addSection() {
    const idx = sections.length;
    const color = SECTION_COLORS[idx % SECTION_COLORS.length];
    const sec = createDefaultSection(idx);
    sec.layout_config.color = color;
    sections = [...sections, sec];
    editingIndex = sections.length - 1;
  }

  function removeSection(index: number) {
    sections = sections.filter((_, i) => i !== index);
    if (editingIndex === index) editingIndex = null;
    else if (editingIndex !== null && editingIndex > index) editingIndex--;
  }

  function updateSection(index: number, field: string, value: unknown) {
    const sec = sections[index];
    const updated = { ...sec };

    switch (field) {
      case 'name': {
        const newName = value as string;
        updated.name = newName;
        // Auto-generate prefix when name changes (only if prefix hasn't been manually edited)
        const oldPrefix = generatePrefix(sec.name, index);
        if (!sec.seat_config.prefix || sec.seat_config.prefix === oldPrefix) {
          updated.seat_config = {
            ...sec.seat_config,
            prefix: generatePrefix(newName, index),
          };
        }
        break;
      }
      case 'prefix':
        updated.seat_config = { ...sec.seat_config, prefix: value as string };
        break;
      case 'type': {
        const newType = value as 'assigned' | 'general';
        updated.type = newType;
        updated.is_seat_pickable = newType !== 'general';
        break;
      }
      case 'price':
        updated.price = value as number;
        break;
      case 'color':
        updated.layout_config = { ...sec.layout_config, color: value as string };
        break;
    }

    sections = sections.map((s, i) => (i === index ? updated : s));
  }

  import { autoGridDimensions, generateExcessDisabledSeats } from './types';

  function handleCapacityChange(index: number, newCapacity: number) {
    const sec = { ...sections[index] };
    if (sec.type === 'general') {
      sec.capacity = newCapacity;
    } else {
      const { rows, cols } = autoGridDimensions(newCapacity);
      sec.seat_config = { ...sec.seat_config, rows, cols };
      sec.disabled_seats = generateExcessDisabledSeats(
        newCapacity,
        rows,
        cols,
        sec.seat_config.prefix,
        sec.seat_config.startRowIndex,
        sec.seat_config.startColIndex,
      );
    }
    sections = sections.map((s, i) => (i === index ? sec : s));
  }

  const prefixRegex = /^[A-Z0-9]+$/;

  let totalCapacity = $derived(sections.reduce((sum, s) => sum + getSectionCapacity(s), 0));
  let totalRevenue = $derived(
    sections.reduce((sum, s) => sum + (s.price || 0) * getSectionCapacity(s), 0),
  );

  let validationIssues = $derived.by(() => {
    const issues: string[] = [];
    if (sections.length === 0) issues.push('Phải có ít nhất 1 hạng vé');
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const label = s.name || `#${i + 1}`;
      if (!s.name.trim()) issues.push(`Hạng vé #${i + 1}: Chưa có tên`);
      if (s.type === 'assigned') {
        const prefix = s.seat_config.prefix || '';
        if (!prefix.trim()) {
          issues.push(`"${label}": Mã tiền tố (prefix) là bắt buộc cho vé ngồi`);
        } else if (!prefixRegex.test(prefix.trim())) {
          issues.push(`"${label}": Mã tiền tố chỉ được chứa chữ in hoa và số (A-Z, 0-9)`);
        }
      }
      if (s.price <= 0) issues.push(`"${label}": Giá phải > 0`);
      if (getSectionCapacity(s) <= 0) issues.push(`"${label}": Số lượng phải > 0`);
    }
    // Check for duplicate prefixes among assigned sections
    const prefixes = sections
      .filter((s) => s.type === 'assigned' && s.seat_config.prefix?.trim())
      .map((s) => s.seat_config.prefix!.trim().toUpperCase());
    const seen = new SvelteSet<string>();
    for (const p of prefixes) {
      if (seen.has(p)) {
        issues.push(`Mã tiền tố "${p}" bị trùng lặp giữa các hạng vé`);
        break;
      }
      seen.add(p);
    }
    return issues;
  });

  let isValid = $derived(validationIssues.length === 0);

  function formatCurrency(n: number): string {
    return n.toLocaleString('vi-VN') + ' ₫';
  }

  let selectedShow = $derived(showsList[selectedShowIndex] ?? null);
  let showTitleDisplay = $derived(selectedShow?.title || `Suất #${selectedShowIndex + 1}`);
</script>

<div class="mx-auto max-w-4xl space-y-6">
  <!-- Header -->
  <div>
    <h1 class="font-heading text-2xl font-bold tracking-tight md:text-3xl">
      Bước 3: Quản lý Vé & Sơ đồ
    </h1>
    <p class="mt-1 text-sm text-muted-foreground">
      Tạo các hạng vé cho
      {#if eventTitle}
        <strong class="text-foreground">"{eventTitle}"</strong>
      {/if}
    </p>
  </div>

  <!-- Show selector (when multiple shows) -->
  {#if showsList.length > 1}
    <div class="bento-card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="flex items-center gap-3">
        <Label class="text-sm font-medium whitespace-nowrap">Suất diễn:</Label>
        <select
          class="rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs"
          value={selectedShowIndex}
          onchange={(e) => (selectedShowIndex = Number((e.target as HTMLSelectElement).value))}
        >
          {#each showsList as show, i (show.id)}
            <option value={i}>
              {show.title || `Suất #${i + 1}`} — {show.show_date}
            </option>
          {/each}
        </select>
      </div>
      <div class="flex items-center gap-2">
        {#if onCloneSections && sections.length > 0}
          <Tooltip.Root>
            <Tooltip.Trigger>
              {#snippet child({ props })}
                <span {...props}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    class="gap-1.5"
                    onclick={onCloneSections}
                  >
                    <Copy class="h-3.5 w-3.5" />
                    Áp dụng cho tất cả suất
                  </Button>
                </span>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p class="text-xs">
                Sao chép cấu hình vé từ "{showTitleDisplay}" sang tất cả các suất khác
              </p>
            </Tooltip.Content>
          </Tooltip.Root>
        {/if}
        <span class="text-xs text-muted-foreground">
          Đang sửa: <strong class="text-foreground">{showTitleDisplay}</strong>
        </span>
      </div>
    </div>
  {/if}

  <!-- Info banner -->
  <div class="rounded-2xl border border-info-border/50 bg-info-muted/50 px-5 py-4">
    <p class="text-sm text-info-muted-foreground">
      💡 <strong>Mẹo:</strong>
      Tạo các hạng vé trước (VIP, Standard, ...), sau đó bạn có thể
      <strong>xuất bản ngay</strong>
      hoặc
      <strong>thiết kế sơ đồ ghế tương tác</strong>
      nếu muốn chuyên nghiệp hơn.
    </p>
  </div>

  <!-- Sections list (displayed as tiers) -->
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Armchair class="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-foreground">Hạng vé ({sections.length})</h2>
          <p class="text-xs text-muted-foreground">
            Tổng:
            <strong class="text-foreground">{totalCapacity.toLocaleString('vi-VN')}</strong>
            vé/ghế
          </p>
        </div>
      </div>
      <Button type="button" variant="outline" size="sm" class="gap-1.5" onclick={addSection}>
        <Plus class="h-3.5 w-3.5" />
        Thêm hạng vé
      </Button>
    </div>

    {#each sections as sec, i (i)}
      {@const capacity = getSectionCapacity(sec)}
      {@const prefix = sec.seat_config.prefix || ''}
      <div
        class="bento-card transition-all {editingIndex === i
          ? 'ring-2 ring-primary/30'
          : 'hover:shadow-md'}"
      >
        {#if editingIndex === i}
          <!-- ═══ EDIT MODE ═══ -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-foreground">
                Chỉnh sửa: {sec.name || `Hạng vé #${i + 1}`}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                class="h-8 gap-1.5 text-xs"
                onclick={() => (editingIndex = null)}
              >
                <Check class="h-3.5 w-3.5" />
                Xong
              </Button>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <!-- Name -->
              <div class="grid gap-1.5">
                <Label>
                  Tên hạng vé <span class="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="VD: VIP, Standard, Early Bird"
                  value={sec.name}
                  oninput={(e) => {
                    const val = (e.target as HTMLInputElement).value;
                    updateSection(i, 'name', val);
                  }}
                />
              </div>

              <!-- Prefix (mandatory for assigned) -->
              {#if sec.type === 'assigned'}
                <div class="grid gap-1.5">
                  <div class="flex items-center gap-1.5">
                    <Label>
                      Mã tiền tố (Prefix) <span class="text-destructive">*</span>
                    </Label>
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <span
                          class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground"
                        >
                          ?
                        </span>
                      </Tooltip.Trigger>
                      <Tooltip.Content class="max-w-60">
                        <p class="text-xs">
                          Mã dùng cho nhãn ghế, VD: prefix <strong>VIP</strong>
                          → ghế
                          <strong>VIP-A1</strong>
                          ,
                          <strong>VIP-B3</strong>
                          ...
                          <br />
                          Chỉ chứa chữ in hoa và số (A-Z, 0-9), tối đa 10 ký tự.
                        </p>
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </div>
                  <Input
                    placeholder="VD: VIP, STD, K1"
                    value={prefix}
                    maxlength={10}
                    oninput={(e) => {
                      const val = (e.target as HTMLInputElement).value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, '');
                      (e.target as HTMLInputElement).value = val;
                      updateSection(i, 'prefix', val);
                    }}
                  />
                  {#if prefix && !prefixRegex.test(prefix)}
                    <p class="text-xs text-destructive">Chỉ chứa chữ in hoa và số (A-Z, 0-9)</p>
                  {/if}
                </div>
              {/if}

              <!-- Type -->
              <div class="grid gap-1.5">
                <div class="flex items-center gap-1.5">
                  <Label>Loại vé</Label>
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <span
                        class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground"
                      >
                        ?
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content class="max-w-60">
                      <p class="text-xs">
                        <strong>Vé ngồi:</strong>
                        Có ghế cụ thể, hiển thị trên sơ đồ.
                        <br />
                        <strong>Vé đứng:</strong>
                        Không có số ghế, chỉ giới hạn số lượng.
                      </p>
                    </Tooltip.Content>
                  </Tooltip.Root>
                </div>
                <Select.Root
                  type="single"
                  value={sec.type}
                  onValueChange={(v) => updateSection(i, 'type', v)}
                >
                  <Select.Trigger>
                    {sec.type === 'general' ? '🎫 Vé đứng (Standing)' : '💺 Vé ngồi (Seated)'}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Group>
                      <Select.Item value="assigned">💺 Vé ngồi (Seated)</Select.Item>
                      <Select.Item value="general">🎫 Vé đứng (Standing)</Select.Item>
                    </Select.Group>
                  </Select.Content>
                </Select.Root>
              </div>

              <!-- Price -->
              <div class="grid gap-1.5">
                <Label>
                  Giá vé (VNĐ) <span class="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="500000"
                  value={sec.price}
                  oninput={(e) =>
                    updateSection(i, 'price', Number((e.target as HTMLInputElement).value))}
                />
              </div>

              <!-- Capacity -->
              <div class="grid gap-1.5">
                <Label>
                  Số lượng <span class="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="100"
                  value={capacity}
                  oninput={(e) =>
                    handleCapacityChange(i, Number((e.target as HTMLInputElement).value))}
                />
              </div>
            </div>

            <!-- Color picker -->
            <div class="grid gap-1.5">
              <Label class="flex items-center gap-1.5">
                <Palette class="h-3.5 w-3.5 text-muted-foreground" />
                Màu đại diện
              </Label>
              <div class="flex items-center gap-2">
                <input
                  type="color"
                  value={sec.layout_config.color}
                  class="h-8 w-8 cursor-pointer rounded border border-border"
                  oninput={(e) => updateSection(i, 'color', (e.target as HTMLInputElement).value)}
                />
                <div class="flex gap-1.5">
                  {#each SECTION_COLORS as color (color)}
                    <button
                      type="button"
                      aria-label="Chọn màu {color} cho hạng vé"
                      title="Chọn màu {color}"
                      class="h-7 w-7 rounded-full border-2 transition-all {sec.layout_config
                        .color === color
                        ? 'scale-110 border-foreground'
                        : 'border-transparent hover:border-muted-foreground/50'}"
                      style="background-color: {color}"
                      onclick={() => updateSection(i, 'color', color)}
                    ></button>
                  {/each}
                </div>
              </div>
            </div>
          </div>
        {:else}
          <!-- ═══ DISPLAY MODE (Card) ═══ -->
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-3">
              <div
                class="h-3 w-3 rounded-full"
                style="background-color: {sec.layout_config.color}"
              ></div>
              <GripVertical class="h-4 w-4 text-muted-foreground/40" />
            </div>

            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-foreground">
                  {sec.name || `Hạng vé #${i + 1}`}
                </span>
                {#if sec.type === 'assigned' && prefix}
                  <span
                    class="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground"
                  >
                    {prefix}
                  </span>
                {/if}
                <span
                  class="rounded-md px-1.5 py-0.5 text-[10px] font-medium
                    {sec.type === 'general'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}"
                >
                  {sec.type === 'general' ? 'Đứng' : 'Ngồi'}
                </span>
              </div>
              <div class="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{formatCurrency(sec.price)}</span>
                <span>•</span>
                <span>{capacity} {sec.type === 'general' ? 'vé' : 'ghế'}</span>
                {#if sec.price > 0 && capacity > 0}
                  <span>•</span>
                  <span class="text-success">
                    Doanh thu: {formatCurrency(sec.price * capacity)}
                  </span>
                {/if}
              </div>
            </div>

            <div class="flex items-center gap-1">
              <Button variant="ghost" size="icon" class="" onclick={() => (editingIndex = i)}>
                <Pencil class="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="text-destructive hover:bg-destructive/10"
                onclick={() => removeSection(i)}
              >
                <Trash2 class="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        {/if}
      </div>
    {/each}

    <!-- Empty state -->
    {#if sections.length === 0}
      <div class="bento-card flex flex-col items-center justify-center py-12 text-center">
        <div
          class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-3xl"
        >
          🎫
        </div>
        <h3 class="text-base font-semibold text-foreground">Chưa có hạng vé nào</h3>
        <p class="mt-1 max-w-sm text-sm text-muted-foreground">
          Bắt đầu bằng cách tạo hạng vé đầu tiên. Bạn có thể thêm nhiều hạng vé với giá và số lượng
          khác nhau.
        </p>
        <Button type="button" class="mt-4 gap-2" onclick={addSection}>
          <Plus class="h-4 w-4" />
          Tạo hạng vé đầu tiên
        </Button>
      </div>
    {:else}
      <!-- Add more button -->
      <Button
        type="button"
        variant="outline"
        class="w-full border-dashed py-5"
        onclick={addSection}
      >
        <Plus class="mr-2 h-4 w-4" />
        Thêm hạng vé
      </Button>
    {/if}
  </div>

  <!-- Summary card -->
  {#if sections.length > 0}
    <div class="bento-card">
      <h3 class="mb-3 text-sm font-semibold text-foreground">📊 Tóm tắt</h3>
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div class="rounded-xl border border-border/50 bg-muted/20 p-3 text-center">
          <p class="text-lg font-bold text-foreground">{sections.length}</p>
          <p class="text-[11px] text-muted-foreground">Hạng vé</p>
        </div>
        <div class="rounded-xl border border-border/50 bg-muted/20 p-3 text-center">
          <p class="text-lg font-bold text-foreground">{totalCapacity.toLocaleString('vi-VN')}</p>
          <p class="text-[11px] text-muted-foreground">Tổng vé/ghế</p>
        </div>
        <div class="rounded-xl border border-border/50 bg-muted/20 p-3 text-center">
          <p class="text-lg font-bold text-primary">{formatCurrency(totalRevenue)}</p>
          <p class="text-[11px] text-muted-foreground">Doanh thu tiềm năng</p>
        </div>
        <div class="rounded-xl border border-border/50 bg-muted/20 p-3 text-center">
          <p class="text-lg font-bold text-foreground">
            {sections.filter((s) => s.type === 'assigned').length} ngồi / {sections.filter(
              (s) => s.type === 'general',
            ).length} đứng
          </p>
          <p class="text-[11px] text-muted-foreground">Phân loại</p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Actions -->
  <div
    class="bento-card flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-between"
  >
    <div class="flex items-center gap-3">
      {#if backHref}
        <Button variant="ghost" size="sm" href={backHref} class="gap-2">
          <ArrowLeft class="h-4 w-4" />
          Quay lại
        </Button>
      {/if}
      <div class="hidden md:block">
        {#if !isValid && validationIssues.length > 0}
          <p class="text-xs text-muted-foreground">
            ⚠️ {validationIssues.length} vấn đề cần khắc phục
          </p>
        {:else if isValid}
          <p class="text-xs text-success">✓ Sẵn sàng</p>
        {/if}
      </div>
    </div>

    <div class="flex flex-col-reverse gap-2 md:flex-row md:items-center">
      <!-- Finish without map -->
      {#if isValid}
        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props })}
              <span {...props}>
                <Button
                  type="button"
                  variant="outline"
                  class="w-full gap-2 md:w-auto"
                  onclick={onFinishWithoutMap}
                  disabled={isSaving}
                >
                  {#if isSaving}
                    <Loader class="h-4 w-4 animate-spin" />
                  {:else}
                    <Check class="h-4 w-4" />
                  {/if}
                  Lưu bản nháp
                </Button>
              </span>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p class="text-xs">Lưu danh sách vé mà không cần vẽ sơ đồ ghế</p>
          </Tooltip.Content>
        </Tooltip.Root>
      {/if}

      <!-- Design map button -->
      {#if isValid}
        <Button type="button" class="w-full gap-2 md:w-auto" onclick={onDesignMap}>
          <Map class="h-4 w-4" />
          Thiết kế sơ đồ tương tác
        </Button>
      {:else}
        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props })}
              <span {...props} class="inline-flex w-full md:w-auto">
                <Button type="button" class="w-full gap-2 md:w-auto" disabled>Tiếp tục</Button>
              </span>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="top" class="max-w-xs">
            <p class="mb-1 text-xs font-semibold">Chưa thể tiếp tục:</p>
            <ul class="list-inside list-disc space-y-0.5 text-xs">
              {#each validationIssues.slice(0, 5) as issue, idx (`${issue}-${idx}`)}
                <li>{issue}</li>
              {/each}
            </ul>
          </Tooltip.Content>
        </Tooltip.Root>
      {/if}
    </div>
  </div>
</div>
