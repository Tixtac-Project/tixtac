<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Select from '$lib/components/ui/select';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import type { SectionFormData } from '$lib/shared/schemas/event.schema';
  import { getRowLabel } from '$lib/utils/seat-label';
  import { ChevronDown, ChevronUp, CircleQuestionMark, Trash2 } from 'lucide-svelte';

  let {
    section = $bindable(),
    index,
    onremove,
    errors = {},
    errPrefix = '',
  }: {
    section: SectionFormData;
    index: number;
    onremove?: () => void;
    errors?: Record<string, string>;
    /** Prefix for error keys, e.g. "shows.0." */
    errPrefix?: string;
  } = $props();

  let rootEl = $state<HTMLDivElement>();

  // ── Auto-sync layout y → startRowIndex ──
  let previousLayoutY = $state(section.layout_config.y);
  let previousLayoutX = $state(section.layout_config.x);
  let startRowEdited = $state(false);
  let startColEdited = $state(false);

  $effect(() => {
    if (section.layout_config.y !== previousLayoutY && !startRowEdited) {
      section.seat_config.startRowIndex =
        section.layout_config.y === 0 ? 1 : section.layout_config.y;
      previousLayoutY = section.layout_config.y;
    }
  });

  $effect(() => {
    if (section.layout_config.x !== previousLayoutX && !startColEdited) {
      section.seat_config.startColIndex =
        section.layout_config.x === 0 ? 1 : section.layout_config.x;
      previousLayoutX = section.layout_config.x;
    }
  });

  function handleRemove() {
    rootEl?.dispatchEvent(new CustomEvent('remove', { bubbles: true, detail: { index } }));
    onremove?.();
  }

  let showAdvanced = $state(false);

  let isGeneral = $derived(section.type === 'general');
  let seatCount = $derived(
    section.seat_config.rows > 0 && section.seat_config.cols > 0
      ? section.seat_config.rows * section.seat_config.cols
      : 0,
  );

  function handleTypeChange(newType: string) {
    section.type = newType as 'assigned' | 'general';
    if (newType === 'general') {
      section.seat_config.cols = 1;
      section.disabled_seats = '';
    }
  }

  function fieldError(field: string): string | undefined {
    return errors[`${errPrefix}sections.${index}.${field}`];
  }

  // ── Derived label range for display ──
  let startRowLabel = $derived(getRowLabel(section.seat_config.startRowIndex));
  let endRowLabel = $derived(
    getRowLabel(section.seat_config.startRowIndex + Math.max(section.seat_config.rows, 1) - 1),
  );
  let endColNumber = $derived(
    section.seat_config.startColIndex + Math.max(section.seat_config.cols, 1) - 1,
  );

  // Prefix display helper
  let prefixDisplay = $derived(section.seat_config.prefix ?? '');
</script>

<div bind:this={rootEl} class="bento-card">
  <!-- Header row -->
  <div class="mb-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div
        class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary"
      >
        {index + 1}
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h4 class="text-sm font-semibold text-foreground">
            {#if section.name}
              {section.name}
            {:else}
              Khu vực #{index + 1}
            {/if}
          </h4>
          <span
            class="rounded-md px-1.5 py-0.5 text-[10px] font-medium {isGeneral
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}"
          >
            {isGeneral ? 'GA' : 'Seated'}
          </span>
        </div>
        <span class="text-xs text-muted-foreground">
          {isGeneral ? `${section.capacity} vé` : `${seatCount} ghế`}
        </span>
      </div>
    </div>
    <Button
      variant="ghost"
      size="icon"
      class="text-destructive hover:bg-destructive/10"
      onclick={handleRemove}
    >
      <Trash2 class="h-4 w-4" />
    </Button>
  </div>

  <!-- Type selector row -->
  <div class="mb-4 rounded-2xl border border-border/50 bg-muted/20 p-4">
    <div class="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
      <div class="grid gap-1.5">
        <div class="flex items-center gap-1.5">
          <Label for="section-type-{index}">Loại khu vực</Label>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <CircleQuestionMark class="h-3.5 w-3.5 text-muted-foreground" />
            </Tooltip.Trigger>
            <Tooltip.Content class="max-w-60">
              <p class="text-xs">
                <strong>Ghế ngồi (Assigned):</strong>
                Có sơ đồ ghế, khách chọn ghế cụ thể.
                <br />
                <strong>Vé đứng (General):</strong>
                Không có số ghế, chỉ chọn số lượng vé.
              </p>
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
        <Select.Root
          type="single"
          value={section.type ?? 'assigned'}
          onValueChange={handleTypeChange}
        >
          <Select.Trigger id="section-type-{index}">
            {section.type === 'general' ? 'Vé đứng (General)' : 'Ghế ngồi (Assigned)'}
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              <Select.Item value="assigned">Ghế ngồi (Assigned)</Select.Item>
              <Select.Item value="general">Vé đứng (General)</Select.Item>
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </div>

      {#if isGeneral}
        <div class="flex items-center">
          <p
            class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
          >
            🎫 Vé đứng — khách chọn số lượng, hệ thống cấp vé tự động
          </p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Basic fields -->
  <div class="grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-5">
    <div class="grid gap-1.5">
      <Label for="section-name-{index}">
        Tên khu vực <span class="text-destructive">*</span>
      </Label>
      <Input id="section-name-{index}" placeholder="VD: VIP Trái" bind:value={section.name} />
      {#if fieldError('name')}
        <span class="text-xs text-destructive">{fieldError('name')}</span>
      {/if}
    </div>

    <div class="grid gap-1.5">
      <div class="flex items-center gap-1.5">
        <Label for="section-prefix-{index}">Mã tiền tố</Label>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <CircleQuestionMark class="h-3.5 w-3.5 text-muted-foreground" />
          </Tooltip.Trigger>
          <Tooltip.Content class="max-w-60">
            <p class="text-xs">
              Mã ngắn gọn (tối đa 10 ký tự, chữ in hoa và số) dùng làm tiền tố cho mã ghế. VD: VIP,
              STD, V1. Mã ghế sẽ có dạng VIP-A1, STD-B12.
            </p>
          </Tooltip.Content>
        </Tooltip.Root>
      </div>
      <Input
        id="section-prefix-{index}"
        placeholder="VD: VIP"
        maxlength={10}
        value={prefixDisplay}
        oninput={(e) => {
          const val = (e.currentTarget as HTMLInputElement).value
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '');
          section.seat_config = { ...section.seat_config, prefix: val || null };
        }}
      />
      {#if fieldError('seat_config.prefix') || fieldError('prefix')}
        <span class="text-xs text-destructive">
          {fieldError('seat_config.prefix') || fieldError('prefix')}
        </span>
      {/if}
    </div>

    <div class="grid gap-1.5">
      <Label for="section-price-{index}">
        Giá vé (VNĐ) <span class="text-destructive">*</span>
      </Label>
      <Input
        id="section-price-{index}"
        type="number"
        placeholder="500000"
        bind:value={section.price}
      />
      {#if fieldError('price')}
        <span class="text-xs text-destructive">{fieldError('price')}</span>
      {/if}
    </div>

    {#if isGeneral}
      <!-- GA: single "Số lượng vé" field -->
      <div class="grid gap-1.5 lg:col-span-2">
        <Label for="section-capacity-{index}">
          Số lượng vé <span class="text-destructive">*</span>
        </Label>
        <Input
          id="section-capacity-{index}"
          type="number"
          min="1"
          placeholder="500"
          bind:value={section.capacity}
        />
        <p class="text-xs text-muted-foreground">Tổng số vé đứng có thể bán cho khu vực này</p>
        {#if fieldError('capacity')}
          <span class="text-xs text-destructive">{fieldError('capacity')}</span>
        {/if}
      </div>
    {:else}
      <div class="flex items-center gap-1.5 *:w-full *:flex-1">
        <div class="grid gap-1.5">
          <Label for="section-rows-{index}">
            Số hàng <span class="text-destructive">*</span>
          </Label>
          <Input
            id="section-rows-{index}"
            type="number"
            min="1"
            max="50"
            bind:value={section.seat_config.rows}
          />
          {#if fieldError('seat_config.rows') || fieldError('rows')}
            <span class="text-xs text-destructive">
              {fieldError('seat_config.rows') || fieldError('rows')}
            </span>
          {/if}
        </div>

        <div class="grid gap-1.5">
          <Label for="section-cols-{index}">
            Số ghế / hàng <span class="text-destructive">*</span>
          </Label>
          <Input
            id="section-cols-{index}"
            type="number"
            min="1"
            max="100"
            bind:value={section.seat_config.cols}
          />
          {#if fieldError('seat_config.cols') || fieldError('cols')}
            <span class="text-xs text-destructive">
              {fieldError('seat_config.cols') || fieldError('cols')}
            </span>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Advanced toggle (hidden for GA — no seat layout config needed) -->
  {#if !isGeneral}
    <button
      type="button"
      class="mt-4 flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      style="transition: all 0.2s var(--ease-bento);"
      onclick={() => (showAdvanced = !showAdvanced)}
    >
      {#if showAdvanced}
        <ChevronUp class="h-3.5 w-3.5" />
        Ẩn cấu hình nâng cao
      {:else}
        <ChevronDown class="h-3.5 w-3.5" />
        Cấu hình nâng cao
      {/if}
    </button>
  {/if}

  <!-- Advanced fields (assigned sections only) -->
  {#if showAdvanced && !isGeneral}
    <div class="mt-3 space-y-4 rounded-2xl border border-border/50 bg-muted/20 p-4">
      <!-- Position on venue layout -->
      <div>
        <div class="mb-2 flex items-center gap-1.5">
          <span class="text-xs font-semibold text-foreground">📍 Vị trí trên sơ đồ tổng</span>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <CircleQuestionMark class="h-3.5 w-3.5 text-muted-foreground" />
            </Tooltip.Trigger>
            <Tooltip.Content class="max-w-60">
              <p class="text-xs">
                Tọa độ (X, Y) xác định vị trí khu vực ghế trên bản đồ tổng thể của sự kiện. X = cột,
                Y = hàng (tính từ góc trên-trái, đơn vị pixel/grid).
              </p>
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
        <div class="grid grid-cols-2 items-start gap-4 md:grid-cols-4">
          <div class="grid gap-1.5">
            <Label for="section-lx-{index}">Tọa độ X</Label>
            <Input
              id="section-lx-{index}"
              type="number"
              min="0"
              bind:value={section.layout_config.x}
            />
            {#if fieldError('layout_config.x')}
              <span class="text-xs text-destructive">{fieldError('layout_config.x')}</span>
            {/if}
          </div>
          <div class="grid gap-1.5">
            <Label for="section-ly-{index}">Tọa độ Y</Label>
            <Input
              id="section-ly-{index}"
              type="number"
              min="0"
              bind:value={section.layout_config.y}
            />
            {#if fieldError('layout_config.y')}
              <span class="text-xs text-destructive">{fieldError('layout_config.y')}</span>
            {/if}
          </div>
        </div>
      </div>

      <!-- Seat labeling offset -->
      <div>
        <div class="mb-2 flex items-center gap-1.5">
          <span class="text-xs font-semibold text-foreground">🏷️ Đánh số ghế bắt đầu từ</span>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <CircleQuestionMark class="h-3.5 w-3.5 text-muted-foreground" />
            </Tooltip.Trigger>
            <Tooltip.Content class="max-w-72">
              <p class="text-xs">
                <strong>Hàng bắt đầu (1-based):</strong>
                1 = A, 2 = B, 3 = C, ... 27 = AA.
                <br />
                <strong>Cột bắt đầu (1-based):</strong>
                Số ghế đầu tiên trong mỗi hàng.
                <br />
                VD: Hàng=3, Cột=5 → ghế đầu tiên là C5.
              </p>
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
        <div class="grid grid-cols-2 items-start gap-4 md:grid-cols-4">
          <div class="grid gap-1.5">
            <Label for="section-sri-{index}">
              Hàng bắt đầu
              <span class="text-muted-foreground">(= {startRowLabel})</span>
            </Label>
            <Input
              id="section-sri-{index}"
              type="number"
              min="1"
              bind:value={section.seat_config.startRowIndex}
              oninput={() => (startRowEdited = true)}
            />
            {#if fieldError('seat_config.startRowIndex')}
              <span class="text-xs text-destructive">
                {fieldError('seat_config.startRowIndex')}
              </span>
            {/if}
          </div>
          <div class="grid gap-1.5">
            <Label for="section-sci-{index}">
              Cột bắt đầu
              <span class="text-muted-foreground">(= {section.seat_config.startColIndex})</span>
            </Label>
            <Input
              id="section-sci-{index}"
              type="number"
              min="1"
              bind:value={section.seat_config.startColIndex}
              oninput={() => (startColEdited = true)}
            />
            {#if fieldError('seat_config.startColIndex')}
              <span class="text-xs text-destructive">
                {fieldError('seat_config.startColIndex')}
              </span>
            {/if}
          </div>
        </div>
        <!-- Quick preview of label range -->
        {#if section.seat_config.rows > 0 && section.seat_config.cols > 0}
          <p class="mt-2 text-xs text-muted-foreground">
            → Ghế: <strong class="text-foreground">
              {prefixDisplay ? `${prefixDisplay}-` : ''}{startRowLabel}{section.seat_config
                .startColIndex}
            </strong>
            đến
            <strong class="text-foreground">
              {prefixDisplay ? `${prefixDisplay}-` : ''}{endRowLabel}{endColNumber}
            </strong>
          </p>
        {/if}
      </div>

      <!-- Sort order & disabled seats -->
      <div>
        <div class="mb-2 flex items-center gap-1.5">
          <span class="text-xs font-semibold text-foreground">⚙️ Khác</span>
        </div>
        <div class="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          <div class="grid gap-1.5">
            <div class="flex items-center gap-1.5">
              <Label for="section-so-{index}">Thứ tự hiển thị</Label>
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <CircleQuestionMark class="h-3.5 w-3.5 text-muted-foreground" />
                </Tooltip.Trigger>
                <Tooltip.Content class="max-w-52">
                  <p class="text-xs">
                    Số nhỏ hơn hiển thị trước. Các khu vực cùng thứ tự sẽ sắp theo tên.
                  </p>
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
            <Input id="section-so-{index}" type="number" min="0" bind:value={section.sort_order} />
          </div>

          <div class="grid gap-1.5">
            <div class="flex items-center gap-1.5">
              <Label for="section-ds-{index}">Ghế hỏng / không bán</Label>
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <CircleQuestionMark class="h-3.5 w-3.5 text-muted-foreground" />
                </Tooltip.Trigger>
                <Tooltip.Content class="max-w-60">
                  <p class="text-xs">
                    Nhập nhãn ghế cách nhau bằng dấu phẩy. VD: {prefixDisplay || 'VIP'}-A1, {prefixDisplay ||
                      'VIP'}-B3. Ghế này sẽ bị vô hiệu hóa không cho đặt.
                  </p>
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
            <Input
              id="section-ds-{index}"
              placeholder="{prefixDisplay || 'VIP'}-A1, {prefixDisplay || 'VIP'}-B2"
              bind:value={section.disabled_seats}
            />
            {#if fieldError('disabled_seats')}
              <span class="text-xs text-destructive">{fieldError('disabled_seats')}</span>
            {/if}
          </div>
        </div>
      </div>

      <!-- Sales Timing -->
      <div>
        <div class="mb-2 flex items-center gap-1.5">
          <span class="text-xs font-semibold text-foreground">🕐 Thời gian mở bán</span>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <CircleQuestionMark class="h-3.5 w-3.5 text-muted-foreground" />
            </Tooltip.Trigger>
            <Tooltip.Content class="max-w-60">
              <p class="text-xs">
                Tùy chọn — Đặt thời gian mở/đóng bán cho khu vực này (VD: Early Bird, General Sale).
                Để trống = bán ngay khi sự kiện được xuất bản.
              </p>
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
        <div class="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          <div class="grid gap-1.5">
            <Label for="section-sales-start-{index}">Mở bán từ</Label>
            <Input
              id="section-sales-start-{index}"
              type="datetime-local"
              bind:value={section.sales_start_at}
            />
            {#if fieldError('sales_start_at')}
              <span class="text-xs text-destructive">{fieldError('sales_start_at')}</span>
            {/if}
          </div>
          <div class="grid gap-1.5">
            <Label for="section-sales-end-{index}">Đóng bán lúc</Label>
            <Input
              id="section-sales-end-{index}"
              type="datetime-local"
              bind:value={section.sales_end_at}
            />
            {#if fieldError('sales_end_at')}
              <span class="text-xs text-destructive">{fieldError('sales_end_at')}</span>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
